from django.contrib import admin

from patient_summary.models import PatientSummary


@admin.register(PatientSummary)
class PatientSummaryAdmin(admin.ModelAdmin):
    list_display = ("patient", "status", "model", "generated_at", "updated_at")
    search_fields = ("patient__patient_id", "patient__user__full_name", "patient__user__email")
    readonly_fields = ("created_at", "updated_at")
