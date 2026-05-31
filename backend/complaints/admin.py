from django.contrib import admin
from complaints.models import (
    Complaint, ComplaintAttachment, ComplaintTimelineEvent, PsychologistComplaintAttachment,
)


class ComplaintAttachmentInline(admin.TabularInline):
    model = ComplaintAttachment
    extra = 0
    readonly_fields = ["uploaded_at"]


class ComplaintTimelineEventInline(admin.TabularInline):
    model = ComplaintTimelineEvent
    extra = 0
    readonly_fields = ["created_at"]


class PsychologistComplaintAttachmentInline(admin.TabularInline):
    model = PsychologistComplaintAttachment
    extra = 0
    readonly_fields = ["uploaded_at"]


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = [
        "complaint_id",
        "subject",
        "patient",
        "psychologist",
        "status",
        "severity",
        "show_to_psychologist",
        "created_at",
        "resolved_at",
    ]
    list_filter = ["status", "category", "severity", "show_to_psychologist", "created_at"]
    search_fields = [
        "complaint_id",
        "subject",
        "patient__user__full_name",
        "patient__user__email",
        "psychologist__user__full_name",
        "psychologist__user__email",
    ]
    readonly_fields = ["complaint_id", "created_at", "updated_at"]
    inlines = [ComplaintAttachmentInline, PsychologistComplaintAttachmentInline, ComplaintTimelineEventInline]


@admin.register(ComplaintTimelineEvent)
class ComplaintTimelineEventAdmin(admin.ModelAdmin):
    list_display = ["complaint", "event_type", "title", "actor", "created_at"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["complaint__complaint_id", "title", "note"]


@admin.register(ComplaintAttachment)
class ComplaintAttachmentAdmin(admin.ModelAdmin):
    list_display = ["complaint", "file", "uploaded_at"]
    search_fields = ["complaint__complaint_id"]


@admin.register(PsychologistComplaintAttachment)
class PsychologistComplaintAttachmentAdmin(admin.ModelAdmin):
    list_display = ["complaint", "file", "uploaded_at"]
    search_fields = ["complaint__complaint_id"]
