from decimal import Decimal, ROUND_HALF_UP

from finance.models import CommissionRate


GST_RATE = Decimal("0.10")
ADMIN_COMMISSION_RATE = Decimal("0.10")
MIN_RAZORPAY_APPOINTMENT_AMOUNT = Decimal("1.00")


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_booking_amounts(psychologist):
    fee = money(psychologist.consultation_fee)
    gst = money(fee * GST_RATE)
    total = money(fee + gst)
    return {"consultation_fee": fee, "gst_amount": gst, "total_amount": total}


def get_effective_commission_rate(effective_date=None):
    queryset = CommissionRate.objects.all()
    if effective_date:
        queryset = queryset.filter(effective_from__lte=effective_date)
    rate = queryset.order_by("-effective_from", "-created_at").first()
    if not rate:
        return ADMIN_COMMISSION_RATE
    return money(rate.percentage) / Decimal("100.00")


def get_effective_commission_percentage(effective_date=None):
    return money(get_effective_commission_rate(effective_date) * Decimal("100.00"))


def calculate_psychologist_payout(booking):
    commission_rate = get_effective_commission_rate(booking.date)
    commission = money(booking.consultation_fee * commission_rate)
    payout = money(booking.consultation_fee - commission)
    retained = money(commission + booking.gst_amount)
    return {
        "commission_amount": commission,
        "commission_rate": commission_rate,
        "commission_percentage": money(commission_rate * Decimal("100.00")),
        "psychologist_payout": payout,
        "admin_retained": retained,
    }
