from decimal import Decimal, ROUND_HALF_UP


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


def calculate_psychologist_payout(booking):
    commission = money(booking.consultation_fee * ADMIN_COMMISSION_RATE)
    payout = money(booking.consultation_fee - commission)
    retained = money(commission + booking.gst_amount)
    return {
        "commission_amount": commission,
        "psychologist_payout": payout,
        "admin_retained": retained,
    }
