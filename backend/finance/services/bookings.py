from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from finance.models import Wallet
from .amounts import calculate_psychologist_payout
from .wallets import credit_wallet, debit_wallet, get_admin_wallet, get_wallet


@transaction.atomic
def credit_admin_for_booking(booking, reference=""):
    if booking.payment_status == "PAID":
        return
    admin_wallet = Wallet.objects.select_for_update().get(id=get_admin_wallet().id)
    credit_wallet(
        admin_wallet,
        booking.total_amount,
        "APPOINTMENT_PAYMENT",
        booking=booking,
        reference=reference,
        note="Appointment amount credited to admin wallet.",
    )
    booking.payment_status = "PAID"
    booking.status = "CONFIRMED"
    booking.save(update_fields=["payment_status", "status"])


@transaction.atomic
def refund_booking_to_patient(booking, note=""):
    if booking.payment_status == "REFUNDED":
        return

    patient_wallet = Wallet.objects.select_for_update().get(id=get_wallet(booking.patient.user).id)
    if booking.payment_status == "PAID":
        admin_wallet = Wallet.objects.select_for_update().get(id=get_admin_wallet().id)
        debit_wallet(
            admin_wallet,
            booking.total_amount,
            "APPOINTMENT_REFUND",
            booking=booking,
            note="Refunded appointment amount to patient wallet.",
        )
        credit_wallet(
            patient_wallet,
            booking.total_amount,
            "APPOINTMENT_REFUND",
            booking=booking,
            note=note or "Appointment cancelled refund.",
        )
        booking.payment_status = "REFUNDED"
        booking.save(update_fields=["payment_status"])
    elif booking.wallet_amount > 0:
        credit_wallet(
            patient_wallet,
            booking.wallet_amount,
            "APPOINTMENT_REFUND",
            booking=booking,
            note="Released pending appointment wallet hold.",
        )
        booking.payment_status = "REFUNDED"
        booking.save(update_fields=["payment_status"])


@transaction.atomic
def complete_booking_payment(booking):
    if booking.psychologist_paid_at:
        return
    if booking.payment_status != "PAID":
        raise serializers.ValidationError("Only paid appointments can be completed.")

    admin_wallet = Wallet.objects.select_for_update().get(id=get_admin_wallet().id)
    psychologist_wallet = Wallet.objects.select_for_update().get(id=get_wallet(booking.psychologist.user).id)
    payout = calculate_psychologist_payout(booking)
    debit_wallet(
        admin_wallet,
        payout["psychologist_payout"],
        "PSYCHOLOGIST_PAYOUT",
        booking=booking,
        note=(
            f"Psychologist payout after 10% admin commission. "
            f"Admin retained {payout['admin_retained']} including GST and commission."
        ),
    )
    credit_wallet(
        psychologist_wallet,
        payout["psychologist_payout"],
        "PSYCHOLOGIST_PAYOUT",
        booking=booking,
        note=(
            f"Consultation fee credited after 10% admin commission. "
            f"Commission: {payout['commission_amount']}."
        ),
    )
    booking.psychologist_paid_at = timezone.now()
    booking.save(update_fields=["psychologist_paid_at"])
