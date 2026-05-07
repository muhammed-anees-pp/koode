from rest_framework import serializers
from django.db.models import Sum
from django.utils import timezone
from accounts.models import User
from appointments.models import Booking
from .models import RazorpayOrder, Wallet, WalletTransaction
from .services.amounts import calculate_psychologist_payout


"""
WALLET TRANSACTION SERIALIZER
"""
class WalletTransactionSerializer(serializers.ModelSerializer):
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    payment_reference = serializers.SerializerMethodField()
    payer = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()
    appointment = serializers.SerializerMethodField()

    class Meta:
        model = WalletTransaction
        fields = [
            "id",
            "transaction_type",
            "source",
            "title",
            "description",
            "amount",
            "balance_after",
            "payment_method",
            "payment_reference",
            "payer",
            "recipient",
            "booking_id",
            "appointment",
            "reference",
            "note",
            "created_at",
        ]

    def get_title(self, obj):
        titles = {
            "WALLET_TOPUP": "Wallet top-up",
            "APPOINTMENT_PAYMENT": "Appointment payment received",
            "APPOINTMENT_HOLD": "Appointment payment from wallet",
            "APPOINTMENT_REFUND": "Appointment refund",
            "PSYCHOLOGIST_PAYOUT": "Psychologist payout",
            "ADMIN_ADJUSTMENT": "Wallet adjustment",
        }
        return titles.get(obj.source, obj.source.replace("_", " ").title())

    def get_payment_method(self, obj):
        if obj.source == "WALLET_TOPUP":
            return "Razorpay"

        booking = obj.booking
        if not booking:
            return "Wallet"

        wallet_amount = booking.wallet_amount or 0
        razorpay_amount = booking.razorpay_amount or 0
        if wallet_amount and razorpay_amount:
            return "Wallet + Razorpay"
        if wallet_amount:
            return "Wallet"
        if razorpay_amount:
            return "Razorpay"
        return "Wallet"

    def get_payment_reference(self, obj):
        if obj.reference:
            return obj.reference

        booking = obj.booking
        if not booking:
            return ""

        order = booking.razorpay_orders.filter(status="PAID").order_by("-paid_at", "-created_at").first()
        if not order:
            return ""
        return order.razorpay_payment_id or order.razorpay_order_id

    def get_payer(self, obj):
        booking = obj.booking
        if obj.source == "WALLET_TOPUP":
            return self._user_payload(obj.wallet.user)
        if not booking:
            return None
        if obj.source in {"APPOINTMENT_PAYMENT", "APPOINTMENT_HOLD"}:
            return self._user_payload(booking.patient.user)
        if obj.source == "APPOINTMENT_REFUND":
            return self._user_payload(self._admin_user(obj))
        if obj.source == "PSYCHOLOGIST_PAYOUT":
            return self._user_payload(self._admin_user(obj))
        return None

    def get_recipient(self, obj):
        booking = obj.booking
        if obj.source == "WALLET_TOPUP":
            return self._user_payload(obj.wallet.user)
        if not booking:
            return self._user_payload(obj.wallet.user)
        if obj.source in {"APPOINTMENT_PAYMENT", "APPOINTMENT_HOLD"}:
            return self._user_payload(self._admin_user(obj))
        if obj.source == "APPOINTMENT_REFUND":
            return self._user_payload(booking.patient.user)
        if obj.source == "PSYCHOLOGIST_PAYOUT":
            return self._user_payload(booking.psychologist.user)
        return self._user_payload(obj.wallet.user)

    def get_appointment(self, obj):
        booking = obj.booking
        if not booking:
            return None
        payout = calculate_psychologist_payout(booking)
        return {
            "id": str(booking.id),
            "patient_name": booking.patient.user.full_name,
            "psychologist_name": booking.psychologist.user.full_name,
            "date": booking.date,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "consultation_fee": booking.consultation_fee,
            "gst_amount": booking.gst_amount,
            "total_amount": booking.total_amount,
            "wallet_amount": booking.wallet_amount,
            "razorpay_amount": booking.razorpay_amount,
            "admin_commission_amount": payout["commission_amount"],
            "psychologist_payout_amount": payout["psychologist_payout"],
            "admin_retained_amount": payout["admin_retained"],
            "status": booking.status,
            "payment_status": booking.payment_status,
        }

    def get_description(self, obj):
        booking = obj.booking
        if obj.source == "WALLET_TOPUP":
            return f"{obj.wallet.user.full_name} added cash to wallet through Razorpay."

        if not booking:
            return obj.note

        patient_name = booking.patient.user.full_name
        psychologist_name = booking.psychologist.user.full_name

        if obj.source == "APPOINTMENT_PAYMENT":
            return (
                f"{patient_name} paid for an appointment with {psychologist_name}. "
                f"Total includes consultation fee and GST."
            )
        if obj.source == "APPOINTMENT_HOLD":
            return f"{patient_name} paid this amount from wallet for appointment booking."
        if obj.source == "APPOINTMENT_REFUND":
            return f"Refund for cancelled appointment between {patient_name} and {psychologist_name}."
        if obj.source == "PSYCHOLOGIST_PAYOUT":
            payout = calculate_psychologist_payout(booking)
            return (
                f"Completed appointment payout to {psychologist_name}. "
                f"Admin kept 10% commission and GST: {payout['admin_retained']}."
            )

        return obj.note

    def _admin_user(self, obj):
        request = self.context.get("request")
        if request and getattr(request.user, "role", None) == "ADMIN":
            return request.user
        if obj.wallet.user.role == "ADMIN":
            return obj.wallet.user
        return User.objects.filter(role="ADMIN", is_active=True).order_by("date_joined").first()

    def _user_payload(self, user):
        if not user:
            return None
        return {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
        }


"""
WALLET SERIALIZER
"""
class WalletSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="user.role", read_only=True)
    transactions = serializers.SerializerMethodField()
    finance_summary = serializers.SerializerMethodField()

    def get_transactions(self, obj):
        queryset = obj.transactions.select_related(
            "wallet__user",
            "booking__patient__user",
            "booking__psychologist__user",
        ).prefetch_related("booking__razorpay_orders").all()
        if obj.user.role != "ADMIN":
            queryset = queryset[:25]
        return WalletTransactionSerializer(
            queryset,
            many=True,
            context=self.context,
        ).data

    def get_finance_summary(self, obj):
        if obj.user.role != "ADMIN":
            return None

        paid_bookings = Booking.objects.filter(payment_status="PAID")
        admin_transactions = obj.transactions.all()
        today = timezone.localdate()
        month_start = today.replace(day=1)

        total_revenue = self._sum_transactions(
            admin_transactions,
            source="APPOINTMENT_PAYMENT",
            transaction_type="CREDIT",
        )
        total_paid_to_psychologists = self._sum_transactions(
            admin_transactions,
            source="PSYCHOLOGIST_PAYOUT",
            transaction_type="DEBIT",
        )
        total_refund_amount = self._sum_transactions(
            admin_transactions,
            source="APPOINTMENT_REFUND",
            transaction_type="DEBIT",
        )
        todays_revenue = self._sum_transactions(
            admin_transactions.filter(created_at__date=today),
            source="APPOINTMENT_PAYMENT",
            transaction_type="CREDIT",
        )
        monthly_revenue = self._sum_transactions(
            admin_transactions.filter(created_at__date__gte=month_start, created_at__date__lte=today),
            source="APPOINTMENT_PAYMENT",
            transaction_type="CREDIT",
        )
        pending_payouts = sum(
            calculate_psychologist_payout(booking)["psychologist_payout"]
            for booking in paid_bookings.filter(psychologist_paid_at__isnull=True)
        )

        return {
            "total_revenue": total_revenue,
            "total_consultation_revenue": self._sum_bookings(paid_bookings, "consultation_fee"),
            "total_gst_collected": self._sum_bookings(paid_bookings, "gst_amount"),
            "platform_commission_earned": sum(
                calculate_psychologist_payout(booking)["commission_amount"]
                for booking in paid_bookings
            ),
            "total_paid_to_psychologists": total_paid_to_psychologists,
            "pending_payouts": pending_payouts,
            "admin_wallet_balance": obj.balance,
            "total_refund_amount": total_refund_amount,
            "todays_revenue": todays_revenue,
            "monthly_revenue": monthly_revenue,
        }

    def _sum_transactions(self, queryset, source, transaction_type):
        return queryset.filter(source=source, transaction_type=transaction_type).aggregate(
            total=Sum("amount")
        )["total"] or 0

    def _sum_bookings(self, queryset, field):
        return queryset.aggregate(total=Sum(field))["total"] or 0

    class Meta:
        model = Wallet
        fields = ["id", "role", "balance", "finance_summary", "transactions", "updated_at"]


"""
ADD MONEY TO WALLET SERIALIZER
"""
class CreateWalletTopUpOrderSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)


"""
VERIFY RAZORPAY ORDER SERIALIZER
"""
class VerifyRazorpayOrderSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


"""
RAZORPAY ORDER SERIALIZER
"""
class RazorpayOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RazorpayOrder
        fields = [
            "id",
            "purpose",
            "amount",
            "currency",
            "razorpay_order_id",
            "razorpay_payment_id",
            "status",
            "created_at",
            "paid_at",
        ]
