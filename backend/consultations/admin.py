from django.contrib import admin

from consultations.models import Consultation, ConsultationMessage


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ("room_id", "booking", "status", "started_at", "ended_at")
    search_fields = ("room_id", "booking__id", "booking__patient__user__full_name", "booking__psychologist__user__full_name")
    list_filter = ("status",)


@admin.register(ConsultationMessage)
class ConsultationMessageAdmin(admin.ModelAdmin):
    list_display = ("consultation", "sender", "sent_at")
    search_fields = ("consultation__room_id", "sender__full_name", "text")
