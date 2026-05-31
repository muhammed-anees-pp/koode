from datetime import datetime, time, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, DateField, DateTimeField, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from accounts.models import User
from applications.models import PsychologistApplication
from appointments.models import Booking
from complaints.models import Complaint
from consultations.models import Consultation
from finance.models import WalletTransaction
from patients.models import PatientProfile
from psychologists.models import PsychologistProfile, Specialization
from reviews.models import ConsultationReview
from .constants import PLATFORM_DETAILS

def _parse_dashboard_range(request):
    today = timezone.localdate()
    period = request.query_params.get("period", "30d")
    custom_start = request.query_params.get("start")
    custom_end = request.query_params.get("end")

    if custom_start and custom_end:
        try:
            start_date = datetime.strptime(custom_start, "%Y-%m-%d").date()
            end_date = datetime.strptime(custom_end, "%Y-%m-%d").date()
            period = "custom"
        except ValueError:
            start_date = today - timedelta(days=29)
            end_date = today
            period = "30d"
    else:
        days_by_period = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "180d": 180,
            "365d": 365,
        }
        days = days_by_period.get(period, 30)
        start_date = today - timedelta(days=days - 1)
        end_date = today

    if start_date > end_date:
        start_date, end_date = end_date, start_date

    start_dt = timezone.make_aware(datetime.combine(start_date, time.min))
    end_dt = timezone.make_aware(datetime.combine(end_date, time.max))
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=(end_date - start_date).days)
    previous_start_dt = timezone.make_aware(datetime.combine(previous_start, time.min))
    previous_end_dt = timezone.make_aware(datetime.combine(previous_end, time.max))

    return {
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "start_dt": start_dt,
        "end_dt": end_dt,
        "previous_start": previous_start,
        "previous_end": previous_end,
        "previous_start_dt": previous_start_dt,
        "previous_end_dt": previous_end_dt,
    }


def _money(value):
    return float(value or Decimal("0.00"))


def _percentage_change(current, previous):
    current = float(current or 0)
    previous = float(previous or 0)
    if previous == 0:
        return 100 if current > 0 else 0
    return round(((current - previous) / previous) * 100, 1)


def _date_labels(start_date, end_date):
    labels = []
    current = start_date
    while current <= end_date:
        labels.append(current)
        current += timedelta(days=1)
    return labels


def _daily_counts(queryset, date_field, labels):
    model_field = queryset.model._meta.get_field(date_field)
    if isinstance(model_field, DateTimeField):
        rows = (
            queryset.annotate(day=TruncDate(date_field))
            .values("day")
            .annotate(count=Count("pk"))
            .order_by("day")
        )
        counts = {row["day"]: row["count"] for row in rows}
    elif isinstance(model_field, DateField):
        rows = (
            queryset.values(date_field)
            .annotate(count=Count("pk"))
            .order_by(date_field)
        )
        counts = {row[date_field]: row["count"] for row in rows}
    else:
        counts = {}
    return [{"date": day.isoformat(), "label": day.strftime("%d %b"), "value": counts.get(day, 0)} for day in labels]


def _daily_revenue(queryset, labels):
    rows = (
        queryset.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("total_amount"))
        .order_by("day")
    )
    totals = {row["day"]: _money(row["total"]) for row in rows}
    return [{"date": day.isoformat(), "label": day.strftime("%d %b"), "value": totals.get(day, 0)} for day in labels]


def _choice_breakdown(queryset, field, choices):
    rows = queryset.values(field).annotate(count=Count("pk"))
    counts = {row[field]: row["count"] for row in rows}
    return [{"key": key, "label": label, "count": counts.get(key, 0)} for key, label in choices]


def build_dashboard_payload(request):
    ranges = _parse_dashboard_range(request)
    today = timezone.localdate()
    labels = _date_labels(ranges["start_date"], ranges["end_date"])

    period_bookings = Booking.objects.filter(created_at__range=(ranges["start_dt"], ranges["end_dt"]))
    previous_bookings = Booking.objects.filter(created_at__range=(ranges["previous_start_dt"], ranges["previous_end_dt"]))
    paid_period_bookings = period_bookings.filter(payment_status="PAID")
    paid_previous_bookings = previous_bookings.filter(payment_status="PAID")
    period_consultations = Consultation.objects.filter(created_at__range=(ranges["start_dt"], ranges["end_dt"]))
    period_complaints = Complaint.objects.filter(created_at__range=(ranges["start_dt"], ranges["end_dt"]))
    period_wallet_transactions = WalletTransaction.objects.filter(created_at__range=(ranges["start_dt"], ranges["end_dt"]))
    period_patients = PatientProfile.objects.filter(created_at__range=(ranges["start_date"], ranges["end_date"]))
    previous_patients = PatientProfile.objects.filter(created_at__range=(ranges["previous_start"], ranges["previous_end"]))
    period_psychologists = PsychologistProfile.objects.filter(created_at__range=(ranges["start_dt"], ranges["end_dt"]))
    open_complaint_statuses = [
        Complaint.STATUS_PENDING,
        Complaint.STATUS_UNDER_REVIEW,
        Complaint.STATUS_PSYCHOLOGIST_RESPONSE_PENDING,
        Complaint.STATUS_PSYCHOLOGIST_RESPONSE_SUBMITTED,
    ]

    revenue = paid_period_bookings.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
    previous_revenue = paid_previous_bookings.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
    completed = period_bookings.filter(status="COMPLETED").count()
    cancelled = period_bookings.filter(status="CANCELLED").count()
    confirmed = period_bookings.filter(status="CONFIRMED").count()
    pending = period_bookings.filter(status="PENDING").count()
    total_period_bookings = period_bookings.count()
    completion_rate = round((completed / total_period_bookings) * 100, 1) if total_period_bookings else 0
    cancellation_rate = round((cancelled / total_period_bookings) * 100, 1) if total_period_bookings else 0

    total_reviews = ConsultationReview.objects.count()
    average_rating = ConsultationReview.objects.aggregate(avg=Avg("rating"))["avg"] or 0
    wallet_credit_total = period_wallet_transactions.filter(transaction_type="CREDIT").aggregate(total=Sum("amount"))["total"]
    wallet_debit_total = period_wallet_transactions.filter(transaction_type="DEBIT").aggregate(total=Sum("amount"))["total"]
    completed_period_consultations = period_consultations.filter(status="COMPLETED")
    total_session_minutes = 0
    for consultation in completed_period_consultations.filter(started_at__isnull=False, ended_at__isnull=False).only("started_at", "ended_at"):
        total_session_minutes += max(int((consultation.ended_at - consultation.started_at).total_seconds() // 60), 0)

    top_psychologists = (
        PsychologistProfile.objects.select_related("user")
        .annotate(
            completed_sessions=Count("bookings", filter=Q(bookings__status="COMPLETED"), distinct=True),
            gross_revenue=Sum("bookings__total_amount", filter=Q(bookings__payment_status="PAID"), distinct=True),
            average_rating=Avg("consultation_reviews__rating"),
        )
        .order_by("-gross_revenue", "-completed_sessions")[:5]
    )

    upcoming_bookings = (
        Booking.objects.select_related("patient__user", "psychologist__user")
        .filter(date__gte=today)
        .exclude(status__in=["CANCELLED", "COMPLETED"])
        .order_by("date", "start_time")[:6]
    )

    recent_activity = []
    for item in PsychologistApplication.objects.select_related("user").order_by("-updated_at")[:4]:
        recent_activity.append({
            "type": "application",
            "title": f"{item.user.full_name} application {item.status.replace('_', ' ').lower()}",
            "timestamp": item.updated_at,
            "status": item.status,
        })
    for item in Complaint.objects.select_related("patient__user").order_by("-created_at")[:4]:
        recent_activity.append({
            "type": "complaint",
            "title": f"{item.complaint_id}: {item.subject}",
            "timestamp": item.created_at,
            "status": item.status,
        })
    for item in Booking.objects.select_related("patient__user", "psychologist__user").order_by("-created_at")[:4]:
        recent_activity.append({
            "type": "booking",
            "title": f"{item.patient.user.full_name} booked {item.psychologist.user.full_name}",
            "timestamp": item.created_at,
            "status": item.status,
        })
    recent_activity = sorted(recent_activity, key=lambda x: x["timestamp"], reverse=True)[:8]

    payload = {
        "platform": {
            **PLATFORM_DETAILS,
            "generated_at": timezone.localtime(timezone.now()).isoformat(),
            "generated_by": request.user.full_name or request.user.email,
        },
        "admin": {
            "email": request.user.email,
            "name": request.user.full_name,
            "role": request.user.role,
        },
        "filters": {
            "period": ranges["period"],
            "start": ranges["start_date"].isoformat(),
            "end": ranges["end_date"].isoformat(),
        },
        "summary": {
            "total_users": User.objects.count(),
            "total_patients": PatientProfile.objects.count(),
            "new_patients": period_patients.count(),
            "active_patients": PatientProfile.objects.filter(user__is_active=True).count(),
            "total_psychologists": PsychologistProfile.objects.count(),
            "new_psychologists": period_psychologists.count(),
            "active_psychologists": PsychologistProfile.objects.filter(user__is_active=True, active=True).count(),
            "pending_applications": PsychologistApplication.objects.filter(status__in=["SUBMITTED", "INTERVIEW_SCHEDULED"]).count(),
            "approved_applications": PsychologistApplication.objects.filter(status="APPROVED").count(),
            "rejected_applications": PsychologistApplication.objects.filter(status="REJECTED").count(),
            "total_bookings": Booking.objects.count(),
            "period_bookings": total_period_bookings,
            "paid_bookings": paid_period_bookings.count(),
            "pending_bookings": pending,
            "confirmed_bookings": confirmed,
            "cancelled_bookings": cancelled,
            "today_appointments": Booking.objects.filter(date=today).exclude(status="CANCELLED").count(),
            "completed_consultations": Consultation.objects.filter(status="COMPLETED").count(),
            "period_consultations": period_consultations.count(),
            "period_completed_consultations": completed_period_consultations.count(),
            "ongoing_consultations": Consultation.objects.filter(status__in=["WAITING", "ONGOING"]).count(),
            "open_complaints": Complaint.objects.filter(status__in=open_complaint_statuses).count(),
            "period_complaints": period_complaints.count(),
            "resolved_complaints": period_complaints.filter(status=Complaint.STATUS_RESOLVED).count(),
            "high_priority_complaints": Complaint.objects.filter(status__in=open_complaint_statuses, severity=Complaint.SEVERITY_HIGH).count(),
            "gross_revenue": _money(revenue),
            "wallet_volume": _money(period_wallet_transactions.aggregate(total=Sum("amount"))["total"]),
            "wallet_credits": _money(wallet_credit_total),
            "wallet_debits": _money(wallet_debit_total),
            "average_rating": round(float(average_rating), 1),
            "total_reviews": total_reviews,
            "completion_rate": completion_rate,
            "cancellation_rate": cancellation_rate,
            "platform_session_minutes": total_session_minutes,
        },
        "trends": {
            "bookings": _daily_counts(period_bookings, "created_at", labels),
            "revenue": _daily_revenue(paid_period_bookings, labels),
            "patients": _daily_counts(period_patients, "created_at", labels),
            "psychologists": _daily_counts(period_psychologists, "created_at", labels),
            "complaints": _daily_counts(period_complaints, "created_at", labels),
        },
        "breakdowns": {
            "booking_status": _choice_breakdown(period_bookings, "status", Booking.STATUS_CHOICES),
            "payment_status": _choice_breakdown(period_bookings, "payment_status", Booking.PAYMENT_STATUS_CHOICES),
            "consultation_status": _choice_breakdown(period_consultations, "status", Consultation.STATUS_CHOICES),
            "complaint_severity": _choice_breakdown(period_complaints, "severity", Complaint.SEVERITY_CHOICES),
            "application_status": _choice_breakdown(PsychologistApplication.objects.all(), "status", PsychologistApplication.STATUS_CHOICES),
        },
        "insights": {
            "revenue_change": _percentage_change(revenue, previous_revenue),
            "booking_change": _percentage_change(total_period_bookings, previous_bookings.count()),
            "patient_growth": _percentage_change(
                period_patients.count(),
                previous_patients.count(),
            ),
            "psychologist_growth": _percentage_change(period_psychologists.count(), PsychologistProfile.objects.filter(created_at__range=(ranges["previous_start_dt"], ranges["previous_end_dt"])).count()),
            "complaint_change": _percentage_change(period_complaints.count(), Complaint.objects.filter(created_at__range=(ranges["previous_start_dt"], ranges["previous_end_dt"])).count()),
        },
        "top_psychologists": [
            {
                "psychologist_id": item.psychologist_id,
                "name": item.user.full_name,
                "revenue": _money(item.gross_revenue),
                "completed_sessions": item.completed_sessions,
                "average_rating": round(item.average_rating, 1) if item.average_rating else None,
            }
            for item in top_psychologists
        ],
        "upcoming_appointments": [
            {
                "id": str(item.id),
                "patient": item.patient.user.full_name,
                "psychologist": item.psychologist.user.full_name,
                "date": item.date.isoformat(),
                "start_time": item.start_time.strftime("%H:%M"),
                "status": item.status,
                "payment_status": item.payment_status,
                "amount": _money(item.total_amount),
            }
            for item in upcoming_bookings
        ],
        "specializations": [
            {"name": item["name"], "psychologists": item["psychologist_count"]}
            for item in Specialization.objects.annotate(psychologist_count=Count("psychologists")).order_by("-psychologist_count", "name")[:8].values("name", "psychologist_count")
        ],
        "recent_activity": [
            {
                **item,
                "timestamp": timezone.localtime(item["timestamp"]).isoformat(),
                "display_time": timezone.localtime(item["timestamp"]).strftime("%d %b, %I:%M %p"),
            }
            for item in recent_activity
        ],
    }
    return payload

