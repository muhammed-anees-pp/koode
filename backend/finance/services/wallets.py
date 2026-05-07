from rest_framework import serializers

from accounts.models import User
from finance.models import Wallet, WalletTransaction
from .amounts import money


def get_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


def get_admin_wallet():
    admin_user = User.objects.filter(role="ADMIN", is_active=True).order_by("date_joined").first()
    if not admin_user:
        raise serializers.ValidationError("Admin wallet is not available.")
    return get_wallet(admin_user)


def credit_wallet(wallet, amount, source, booking=None, reference="", note=""):
    amount = money(amount)
    wallet.balance = money(wallet.balance + amount)
    wallet.save(update_fields=["balance", "updated_at"])
    return WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type="CREDIT",
        source=source,
        amount=amount,
        balance_after=wallet.balance,
        booking=booking,
        reference=reference,
        note=note,
    )


def debit_wallet(wallet, amount, source, booking=None, reference="", note=""):
    amount = money(amount)
    if wallet.balance < amount:
        raise serializers.ValidationError("Insufficient wallet balance.")
    wallet.balance = money(wallet.balance - amount)
    wallet.save(update_fields=["balance", "updated_at"])
    return WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type="DEBIT",
        source=source,
        amount=amount,
        balance_after=wallet.balance,
        booking=booking,
        reference=reference,
        note=note,
    )
