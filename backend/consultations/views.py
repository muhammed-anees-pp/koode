from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from admin_panel.permissions import IsAdminUserRole
from appointments.models import Booking
from appointments.serializers import BookingSerializer
from chat.services.chat_service import sync_chat_room_for_booking
from consultations.models import Consultation, ConsultationMessage
from consultations.serializers import ConsultationMessageSerializer
from consultations.services.consultation_service import (
    consultation_state_for_session, create_consultation_for_booking, is_consultation_open, user_can_access_consultation,
)
from finance.services.bookings import complete_booking_payment
from patient_summary.services.summary_service import update_patient_summary_for_consultation
from patients.permissions import IsPatient
from psychologists.permissions import IsPsychologist
from video.zego_service import (
    ZegoRecordingError, generate_consultation_zego_token, start_consultation_recording, stop_consultation_recording, verify_recording_callback_signature,
)



"""
CONSULTATION VIEWS
"""
class ConsultationActionBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_consultation(self, request, booking_id):
        booking = get_object_or_404(
            Booking.objects.select_related("patient__user", "psychologist__user", "slot", "consultation_session"),
            id=booking_id,
        )
        consultation = create_consultation_for_booking(booking)
        if not user_can_access_consultation(request.user, consultation):
            return None
        return consultation


class ConsultationDetailView(ConsultationActionBaseView):
    def get(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            "booking": BookingSerializer(consultation.booking, context={"request": request}).data,
            "consultation": consultation_state_for_session(consultation, user=request.user),
        })


"""
CONSULTATION TOKEN
"""
class ConsultationTokenView(ConsultationActionBaseView):
    def get(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if not is_consultation_open(consultation):
            return Response({"detail": "Consultation room is not active."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == "PATIENT" and not consultation.patient_joined:
            return Response({"detail": "Waiting for psychologist admission."}, status=status.HTTP_403_FORBIDDEN)

        user_id = str(request.user.id)
        token_info = generate_consultation_zego_token(user_id)
        if token_info.error_code != 0:
            return Response({"detail": token_info.error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "token": token_info.token,
            "app_id": settings.ZEGO_CONSULTATION_APP_ID,
            "room_id": consultation.room_id,
            "user_id": user_id,
            "user_name": request.user.full_name,
            "role": request.user.role,
        })


"""
CONSULTATION PSYCHOLOGIST ENTRY
"""
class ConsultationPsychologistEnterView(ConsultationActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if not is_consultation_open(consultation):
            return Response({"detail": "Consultation room is not active."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            locked = Consultation.objects.select_for_update().select_related("booking").get(id=consultation.id)
            locked.psychologist_joined = True
            locked.status = "ONGOING"
            if not locked.started_at:
                locked.started_at = timezone.now()
            update_fields = [
                "psychologist_joined",
                "status",
                "started_at",
                "updated_at",
            ]
            if not locked.zego_recording_task_id and locked.recording_status in {"NOT_STARTED", "FAILED"}:
                locked.recording_status = "STARTING"
                update_fields.append("recording_status")
            locked.save(update_fields=update_fields)

        consultation.refresh_from_db()
        if consultation.recording_status == "STARTING" and not consultation.zego_recording_task_id:
            try:
                result = start_consultation_recording(
                    consultation.room_id,
                    f"booking_{consultation.booking.id.hex}",
                )
                task_id = result.get("Data", {}).get("TaskId", "")
                consultation.recording_metadata = {"start": result}
                if task_id:
                    consultation.zego_recording_task_id = task_id
                    consultation.recording_status = "RECORDING"
                else:
                    consultation.recording_status = "NOT_STARTED" if result.get("skipped") else "FAILED"
                consultation.save(update_fields=["zego_recording_task_id", "recording_status", "recording_metadata", "updated_at"])
            except ZegoRecordingError as exc:
                consultation.recording_status = "FAILED"
                consultation.recording_metadata = {"start_error": exc.to_metadata()}
                consultation.save(update_fields=["recording_status", "recording_metadata", "updated_at"])
            except Exception as exc:
                consultation.recording_status = "FAILED"
                consultation.recording_metadata = {"start_error": str(exc)}
                consultation.save(update_fields=["recording_status", "recording_metadata", "updated_at"])

        return Response({
            "detail": "Psychologist entered consultation.",
            "consultation": consultation_state_for_session(consultation, user=request.user),
        })


"""
CONSULTATION PATIENT ENTRY
"""
class ConsultationPatientRequestJoinView(ConsultationActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if not is_consultation_open(consultation):
            return Response({"detail": "Consultation room is not active."}, status=status.HTTP_400_BAD_REQUEST)

        consultation.patient_requested_join = True
        consultation.patient_joined = False
        if consultation.status in {"SCHEDULED", "WAITING"}:
            consultation.status = "WAITING"
        consultation.save(update_fields=[
            "patient_requested_join",
            "patient_joined",
            "status",
            "updated_at",
        ])
        return Response({"detail": "Join request sent.", "consultation": consultation_state_for_session(consultation, user=request.user)})


"""
APPROVE JOIN REQUEST FOR PATIENT
"""
class ConsultationApproveJoinView(ConsultationActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if not is_consultation_open(consultation):
            return Response({"detail": "Consultation room is not active."}, status=status.HTTP_400_BAD_REQUEST)
        if not consultation.psychologist_joined:
            return Response({"detail": "Enter the consultation room before admitting the patient."}, status=status.HTTP_400_BAD_REQUEST)
        if not consultation.patient_requested_join:
            return Response({"detail": "No patient join request is pending."}, status=status.HTTP_400_BAD_REQUEST)

        consultation.patient_joined = True
        consultation.patient_requested_join = False
        consultation.status = "ONGOING"
        consultation.save(update_fields=[
            "patient_joined",
            "patient_requested_join",
            "status",
            "updated_at",
        ])
        return Response({"detail": "Patient admitted.", "consultation": consultation_state_for_session(consultation, user=request.user)})


"""
CONSULTATION EXIT
"""
class ConsultationExitView(ConsultationActionBaseView):
    def post(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if request.user.role == "PATIENT":
            consultation.patient_joined = False
            consultation.save(update_fields=["patient_joined", "updated_at"])
            return Response({"detail": "Exited consultation.", "consultation": consultation_state_for_session(consultation, user=request.user)})

        if request.user.role != "PSYCHOLOGIST":
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            locked = Consultation.objects.select_for_update().select_related("booking").get(id=consultation.id)
            booking = Booking.objects.select_for_update().get(id=locked.booking_id)
            if booking.status != "COMPLETED":
                complete_booking_payment(booking)
                booking.status = "COMPLETED"
                booking.save(update_fields=["status"])
            locked.status = "COMPLETED"
            locked.psychologist_joined = False
            locked.patient_joined = False
            locked.patient_requested_join = False
            locked.ended_at = timezone.now()
            locked.recording_status = "STOPPING" if locked.zego_recording_task_id else locked.recording_status
            locked.save(update_fields=[
                "status",
                "psychologist_joined",
                "patient_joined",
                "patient_requested_join",
                "ended_at",
                "recording_status",
                "updated_at",
            ])

        consultation.refresh_from_db()
        sync_chat_room_for_booking(consultation.booking)
        if consultation.zego_recording_task_id:
            try:
                result = stop_consultation_recording(consultation.zego_recording_task_id)
                metadata = consultation.recording_metadata or {}
                metadata["stop"] = result
                consultation.recording_metadata = metadata
                consultation.recording_status = "STOPPING" if result.get("Code") == 0 else "FAILED"
                consultation.save(update_fields=["recording_status", "recording_metadata", "updated_at"])
            except ZegoRecordingError as exc:
                metadata = consultation.recording_metadata or {}
                metadata["stop_error"] = exc.to_metadata()
                consultation.recording_metadata = metadata
                consultation.recording_status = "FAILED"
                consultation.save(update_fields=["recording_status", "recording_metadata", "updated_at"])
            except Exception as exc:
                metadata = consultation.recording_metadata or {}
                metadata["stop_error"] = str(exc)
                consultation.recording_metadata = metadata
                consultation.recording_status = "FAILED"
                consultation.save(update_fields=["recording_status", "recording_metadata", "updated_at"])

        update_patient_summary_for_consultation(consultation)
        return Response({"detail": "Consultation completed.", "consultation": consultation_state_for_session(consultation, user=request.user)})


"""
CONSULTATION NOTES
"""
class ConsultationNotesView(ConsultationActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def patch(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        patient_note = request.data.get("patient_note")
        psychologist_note = request.data.get("psychologist_note")
        update_fields = ["updated_at"]

        if patient_note is not None:
            consultation.patient_note = str(patient_note).strip()
            update_fields.append("patient_note")
        if psychologist_note is not None:
            consultation.psychologist_note = str(psychologist_note).strip()
            update_fields.append("psychologist_note")

        consultation.save(update_fields=update_fields)
        return Response({
            "detail": "Consultation notes saved.",
            "consultation": consultation_state_for_session(consultation, user=request.user),
        })


"""
CONSULTATOIN MESSAGE
"""
class ConsultationMessageListCreateView(ConsultationActionBaseView):
    def get(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        messages = consultation.messages.select_related("sender")
        serializer = ConsultationMessageSerializer(
            messages,
            many=True,
            context={"request": request},
        )
        return Response({
            "consultation": consultation_state_for_session(consultation, user=request.user),
            "results": serializer.data,
        })

    def post(self, request, booking_id):
        consultation = self.get_consultation(request, booking_id)
        if consultation is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if consultation.status == "COMPLETED":
            return Response({"detail": "Consultation chat is closed."}, status=status.HTTP_400_BAD_REQUEST)

        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"text": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)

        message = ConsultationMessage.objects.create(
            consultation=consultation,
            sender=request.user,
            text=text,
        )
        serializer = ConsultationMessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


"""
CONSULTATOIN RECORDING
"""
class ConsultationRecordingCallbackView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.data
        if not isinstance(payload, dict):
            return Response({"detail": "Invalid callback payload."}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_recording_callback_signature(payload):
            return Response({"detail": "Invalid callback signature."}, status=status.HTTP_403_FORBIDDEN)

        task_id = str(payload.get("task_id") or "")
        room_id = str(payload.get("room_id") or "")
        consultation = None
        if task_id:
            consultation = Consultation.objects.filter(zego_recording_task_id=task_id).first()
        if consultation is None and room_id:
            consultation = Consultation.objects.filter(room_id=room_id).first()
        if consultation is None:
            return Response({"detail": "Recording callback ignored."})

        detail = payload.get("detail") or {}
        files = detail.get("file_info") or []
        recording_file_url = ""
        for file_info in files:
            recording_file_url = file_info.get("file_url") or ""
            if recording_file_url:
                break

        try:
            event_type = int(payload.get("event_type"))
        except (TypeError, ValueError):
            event_type = None

        metadata = consultation.recording_metadata or {}
        callbacks = metadata.get("callbacks") or []
        callbacks.append(payload)
        metadata["callbacks"] = callbacks[-10:]
        consultation.recording_metadata = metadata

        update_fields = ["recording_metadata", "updated_at"]
        if task_id and not consultation.zego_recording_task_id:
            consultation.zego_recording_task_id = task_id
            update_fields.append("zego_recording_task_id")
        if recording_file_url:
            consultation.recording_file_url = recording_file_url
            update_fields.append("recording_file_url")

        try:
            upload_status = int(detail.get("upload_status"))
        except (TypeError, ValueError):
            upload_status = None

        if event_type == 1 and upload_status == 1 and recording_file_url:
            consultation.recording_status = "UPLOADED"
            update_fields.append("recording_status")
        elif event_type == 2:
            consultation.recording_status = "FAILED"
            update_fields.append("recording_status")
        elif event_type == 7:
            consultation.recording_status = "STOPPING"
            update_fields.append("recording_status")
        elif event_type == 5 and consultation.recording_status == "RECORDING":
            consultation.recording_status = "STOPPING"
            update_fields.append("recording_status")

        consultation.save(update_fields=sorted(set(update_fields)))
        return Response({"detail": "Recording callback accepted."})


"""
RECORDINGS LISTING FOR ADMIN
"""
class AdminConsultationRecordingListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        queryset = Consultation.objects.select_related(
            "booking__patient__user",
            "booking__psychologist__user",
        ).exclude(status="SCHEDULED").order_by("-booking__date", "-booking__start_time")
        results = []
        for consultation in queryset:
            booking = consultation.booking
            results.append({
                "id": str(consultation.id),
                "booking_id": str(booking.id),
                "patient_name": booking.patient.user.full_name,
                "psychologist_name": booking.psychologist.user.full_name,
                "date": booking.date,
                "start_time": booking.start_time,
                "end_time": booking.end_time,
                "status": booking.status,
                "consultation_status": consultation.status,
                "started_at": consultation.started_at,
                "ended_at": consultation.ended_at,
                "room_id": consultation.room_id,
                "recording_status": consultation.recording_status,
                "recording_file_url": consultation.recording_file_url,
                "recording_metadata": consultation.recording_metadata,
            })
        return Response(results)
