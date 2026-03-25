from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime
import pytz
from .models import Interview, ChatMessage
from .serializers import InterviewSerializer
from .repositories.interview_repository import InterviewRepository
from video.zego_service import generate_zego_token



############################
####        ADMIN       ####
############################
"""
ADMIN INTERVIEW TOKEN
"""
class AdminInterviewTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        user_id = str(request.user.id)
        token_info = generate_zego_token(user_id)

        return Response({
            "token": token_info.token,
            "app_id": settings.ZEGO_APP_ID,
            "room_id": interview.room_id,
            "user_id": user_id,
            "user_name": request.user.full_name,
            "scheduled_at": interview.scheduled_at,
            "status": interview.status,
            "applicant_name": interview.application.user.full_name,
        })



"""
UPDATE INTERVIEW STATUS
"""
class UpdateInterviewStatusView(APIView):
    permission_classes = [IsAuthenticated]
    ALLOWED_TRANSITIONS = ["WAITING", "ONGOING", "COMPLETED", "CANCELLED", "SCHEDULED"]

    def patch(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        new_status = request.data.get("status")

        if new_status not in self.ALLOWED_TRANSITIONS:
            return Response(
                {"detail": f"Invalid status. Allowed: {self.ALLOWED_TRANSITIONS}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        interview.status = new_status
        interview.save(update_fields=["status", "updated_at"])
        return Response(InterviewSerializer(interview).data)



"""
PENDING REQUEST ADMIN
"""
class AdminPendingJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        return Response({
            "pending": interview.join_requested and not interview.psychologist_joined,
            "status": interview.status,
        })


"""
APPROVE JOIN REQUEST
"""
class ApproveJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        interview.psychologist_joined = True
        interview.admin_joined = True
        interview.join_requested = False

        if interview.status != "ONGOING":
            interview.status = "ONGOING"

        interview.save(update_fields=[
            "psychologist_joined", "admin_joined", "join_requested", "status", "updated_at"
        ])
        return Response(InterviewSerializer(interview).data)


"""
ADMIN END INTERVIEW
"""
class EndInterviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        complete = request.data.get("complete", False)

        if not complete:
            return Response({"detail": "Interview kept active."})

        interview.status = "COMPLETED"
        interview.psychologist_joined = False
        interview.admin_joined = False
        interview.join_requested = False
        interview.save(update_fields=[
            "status", "psychologist_joined", "admin_joined", "join_requested", "updated_at"
        ])

        return Response({
            "detail": "Interview marked as completed.",
            "interview_status": interview.status,
        })



############################
####    PSYCHOLOGIST    ####
############################
"""
PSYCHOLOGIST INTERVIEW VIEW
"""
class PsychologistInterviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        application = getattr(request.user, 'psychologist_application', None)
        if not application:
            return Response(
                {"detail": "No application found."},
                status=status.HTTP_404_NOT_FOUND
            )

        interview = InterviewRepository.get_by_application(application)
        if not interview:
            return Response(
                {"detail": "No interview scheduled yet."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = InterviewSerializer(interview)
        return Response(serializer.data)


"""
PSYCHOLOGIST INTERVIEW TOKEN
"""
class PsychologistInterviewTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        user_id = str(request.user.id)
        token_info = generate_zego_token(user_id)

        return Response({
            "token": token_info.token,
            "app_id": settings.ZEGO_APP_ID,
            "room_id": interview.room_id,
            "user_id": user_id,
            "user_name": request.user.full_name,
            "scheduled_at": interview.scheduled_at,
            "status": interview.status,
        })



"""
PSYCHOLOGIST JOIN REQUEST
"""
class JoinRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)

        if interview.status not in ["WAITING", "ONGOING", "SCHEDULED"]:
            return Response(
                {"detail": "Interview is not currently accepting join requests."},
                status=status.HTTP_400_BAD_REQUEST
            )

        interview.join_requested = True
        interview.psychologist_joined = False
        interview.save(update_fields=["join_requested", "psychologist_joined", "updated_at"])
        return Response({"detail": "Join request sent. Waiting for admin to admit you."})


"""
PSYCHOLOGIST JOIN STATUS
"""
class PsychologistJoinStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        return Response({
            "approved": interview.psychologist_joined,
            "status": interview.status,
        })



############################
####       COMMON       ####
############################
"""
INTERVIEW DETAILS VIEW
"""
class InterviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        serializer = InterviewSerializer(interview)
        return Response(serializer.data)


"""
INTERVIEW CHAT LIST
"""
class ChatMessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        qs = interview.messages.all()
        since_str = request.query_params.get("since")

        if since_str:
            try:
                since_dt = datetime.fromisoformat(since_str.replace("Z", "+00:00"))
                qs = qs.filter(sent_at__gt=since_dt)
            except (ValueError, TypeError):
                pass

        messages = [
            {
                "id": m.id,
                "sender_name": m.sender_name,
                "is_admin": m.is_admin,
                "text": m.text,
                "sent_at": m.sent_at.isoformat(),
            }
            for m in qs
        ]
        return Response(messages)


"""
NEW CHAT
"""
class ChatMessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        interview = get_object_or_404(Interview, id=interview_id)
        text = request.data.get("text", "").strip()

        if not text:
            return Response(
                {"detail": "Message text is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_admin = getattr(request.user, 'is_staff', False) or getattr(request.user, 'role', '') == 'ADMIN'
        sender_name = getattr(request.user, 'full_name', None) or request.user.email
        msg = ChatMessage.objects.create(
            interview=interview,
            sender_name=sender_name,
            is_admin=is_admin,
            text=text,
        )

        return Response({
            "id": msg.id,
            "sender_name": msg.sender_name,
            "is_admin": msg.is_admin,
            "text": msg.text,
            "sent_at": msg.sent_at.isoformat(),
        }, status=status.HTTP_201_CREATED)