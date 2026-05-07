import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models


"""
WALLET MODEL
"""
class Wallet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet",)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.balance}"


"""
WALLET TRANSACTION MODEL
"""
class WalletTransaction(models.Model):
    TYPE_CHOICES = (
        ("CREDIT", "Credit"),
        ("DEBIT", "Debit"),
    )
    SOURCE_CHOICES = (
        ("WALLET_TOPUP", "Wallet Top-up"),
        ("APPOINTMENT_PAYMENT", "Appointment Payment"),
        ("APPOINTMENT_HOLD", "Appointment Hold"),
        ("APPOINTMENT_REFUND", "Appointment Refund"),
        ("PSYCHOLOGIST_PAYOUT", "Psychologist Payout"),
        ("ADMIN_ADJUSTMENT", "Admin Adjustment"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    source = models.CharField(max_length=40, choices=SOURCE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    booking = models.ForeignKey(
        "appointments.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_transactions",
    )
    reference = models.CharField(max_length=120, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.wallet.user.email} {self.transaction_type} {self.amount}"


"""
RAZORPAY ORDER MODEL
"""
class RazorpayOrder(models.Model):
    PURPOSE_CHOICES = (
        ("WALLET_TOPUP", "Wallet Top-up"),
        ("APPOINTMENT_PAYMENT", "Appointment Payment"),
    )
    STATUS_CHOICES = (
        ("CREATED", "Created"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
        ("CANCELLED", "Cancelled"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="razorpay_orders")
    booking = models.ForeignKey(
        "appointments.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="razorpay_orders",
    )
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    razorpay_order_id = models.CharField(max_length=80, unique=True)
    razorpay_payment_id = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="CREATED")
    notes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.purpose} {self.razorpay_order_id} {self.status}"
