from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.permissions import IsAdminUserRole
from appointments.models import AvailableSlot, Booking
from appointments.serializers import BookingSerializer, notify_booking_confirmed
from patients.permissions import IsPatient
from .models import RazorpayOrder
from .serializers import (
    CommissionRateSerializer,
    CreateCommissionRateSerializer,
    CurrentCommissionRateSerializer,
    CreateWalletTopUpOrderSerializer,
    VerifyRazorpayOrderSerializer,
    WalletSerializer,
)
from .services.amounts import get_effective_commission_percentage
from .services.bookings import credit_admin_for_booking, refund_booking_to_patient
from .services.razorpay import (
    create_razorpay_order,
    mark_razorpay_paid,
    verify_razorpay_signature,
)
from .services.wallets import credit_wallet, get_wallet


class WalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = get_wallet(request.user)
        return Response(WalletSerializer(wallet, context={"request": request}).data)


class CommissionRateListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        from .models import CommissionRate

        queryset = CommissionRate.objects.select_related("changed_by").all()
        return Response(CommissionRateSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = CreateCommissionRateSerializer(
            data=request.data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        commission_rate = serializer.save()
        return Response(
            CommissionRateSerializer(commission_rate).data,
            status=status.HTTP_201_CREATED,
        )


class CurrentCommissionRateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import CommissionRate

        today = timezone.localdate()
        rate = CommissionRate.objects.filter(effective_from__lte=today).order_by(
            "-effective_from",
            "-created_at",
        ).first()
        data = {
            "percentage": get_effective_commission_percentage(today),
            "effective_from": rate.effective_from if rate else None,
            "is_default": rate is None,
        }
        return Response(CurrentCommissionRateSerializer(data).data)


class CreateWalletTopUpOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request):
        serializer = CreateWalletTopUpOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data["amount"]
        order = create_razorpay_order(
            request.user,
            "WALLET_TOPUP",
            amount,
            notes={"user_id": str(request.user.id)},
        )
        return Response(
            {
                "key": getattr(settings, "RAZORPAY_KEY_ID", ""),
                "order_id": order.razorpay_order_id,
                "amount": int(order.amount * 100),
                "currency": order.currency,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyWalletTopUpView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request):
        serializer = VerifyRazorpayOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        order = get_object_or_404(
            RazorpayOrder,
            razorpay_order_id=data["razorpay_order_id"],
            user=request.user,
            purpose="WALLET_TOPUP",
        )
        if order.status == "PAID":
            return Response(WalletSerializer(get_wallet(request.user), context={"request": request}).data)

        if not verify_razorpay_signature(
            data["razorpay_order_id"],
            data["razorpay_payment_id"],
            data["razorpay_signature"],
        ):
            order.status = "FAILED"
            order.save(update_fields=["status"])
            return Response({"detail": "Invalid Razorpay signature."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            locked_order = RazorpayOrder.objects.select_for_update().get(id=order.id)
            if locked_order.status != "PAID":
                mark_razorpay_paid(locked_order, data["razorpay_payment_id"])
                wallet = get_wallet(request.user)
                locked_wallet = wallet.__class__.objects.select_for_update().get(id=wallet.id)
                credit_wallet(
                    locked_wallet,
                    locked_order.amount,
                    "WALLET_TOPUP",
                    reference=locked_order.razorpay_payment_id,
                    note="Wallet top-up through Razorpay.",
                )

        return Response(WalletSerializer(get_wallet(request.user), context={"request": request}).data)


class VerifyAppointmentPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request):
        serializer = VerifyRazorpayOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        order = get_object_or_404(
            RazorpayOrder.objects.select_related("booking__patient__user", "booking__psychologist__user"),
            razorpay_order_id=data["razorpay_order_id"],
            user=request.user,
            purpose="APPOINTMENT_PAYMENT",
        )
        booking = order.booking
        if not booking or booking.patient.user_id != request.user.id:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        if not verify_razorpay_signature(
            data["razorpay_order_id"],
            data["razorpay_payment_id"],
            data["razorpay_signature"],
        ):
            order.status = "FAILED"
            order.save(update_fields=["status"])
            return Response({"detail": "Invalid Razorpay signature."}, status=status.HTTP_400_BAD_REQUEST)

        newly_paid = False
        with transaction.atomic():
            locked_order = RazorpayOrder.objects.select_for_update().get(id=order.id)
            locked_booking = Booking.objects.select_for_update().get(id=booking.id)
            if locked_booking.status == "CANCELLED":
                return Response({"detail": "Booking is cancelled."}, status=status.HTTP_400_BAD_REQUEST)

            if locked_order.status != "PAID":
                mark_razorpay_paid(locked_order, data["razorpay_payment_id"])
                credit_admin_for_booking(locked_booking, reference=locked_order.razorpay_payment_id)
                newly_paid = True

        booking.refresh_from_db()
        if newly_paid:
            notify_booking_confirmed(booking)
        return Response(BookingSerializer(booking, context={"request": request}).data)


class CancelRazorpayOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request):
        razorpay_order_id = request.data.get("razorpay_order_id")
        order = get_object_or_404(
            RazorpayOrder,
            razorpay_order_id=razorpay_order_id,
            user=request.user,
            status="CREATED",
        )
        with transaction.atomic():
            locked_order = RazorpayOrder.objects.select_for_update().select_related(
                "booking"
            ).get(id=order.id)
            locked_order.status = "CANCELLED"
            locked_order.save(update_fields=["status"])

            booking = locked_order.booking
            if booking and booking.status == "PENDING":
                locked_booking = Booking.objects.select_for_update().get(id=booking.id)
                if locked_booking.slot_id:
                    locked_slot = AvailableSlot.objects.select_for_update().get(
                        id=locked_booking.slot_id
                    )
                    locked_slot.is_booked = False
                    locked_slot.save(update_fields=["is_booked"])
                locked_booking.slot = None
                locked_booking.status = "CANCELLED"
                locked_booking.notes = "Payment cancelled."
                locked_booking.cancelled_by = request.user
                locked_booking.save(update_fields=["slot", "status", "notes", "cancelled_by"])
                refund_booking_to_patient(locked_booking, note="Payment cancelled.")

        return Response({"detail": "Payment order cancelled."})
