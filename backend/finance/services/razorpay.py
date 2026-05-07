import hashlib
import hmac

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from finance.models import RazorpayOrder
from .amounts import money


def create_razorpay_order(user, purpose, amount, booking=None, notes=None):
    amount = money(amount)
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise serializers.ValidationError("Razorpay is not configured.")

    receipt = f"{purpose[:6]}-{str(booking.id if booking else user.id)[:24]}"
    payload = {
        "amount": int(amount * 100),
        "currency": "INR",
        "receipt": receipt[:40],
        "notes": notes or {},
    }
    response = requests.post(
        "https://api.razorpay.com/v1/orders",
        json=payload,
        auth=(key_id, key_secret),
        timeout=20,
    )
    if response.status_code >= 400:
        raise serializers.ValidationError("Unable to create Razorpay order.")

    data = response.json()
    return RazorpayOrder.objects.create(
        user=user,
        booking=booking,
        purpose=purpose,
        amount=amount,
        razorpay_order_id=data["id"],
        notes=notes or {},
    )


def verify_razorpay_signature(order_id, payment_id, signature):
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(key_secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def mark_razorpay_paid(order, payment_id):
    order.razorpay_payment_id = payment_id
    order.status = "PAID"
    order.paid_at = timezone.now()
    order.save(update_fields=["razorpay_payment_id", "status", "paid_at"])
    return order
