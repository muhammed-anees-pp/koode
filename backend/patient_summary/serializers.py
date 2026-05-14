from rest_framework import serializers
from patient_summary.models import PatientSummary


"""
PATIENT SUMMARY SERIALIZER
"""
class PatientSummarySerializer(serializers.ModelSerializer):
    patient_id = serializers.CharField(source="patient.patient_id", read_only=True)

    class Meta:
        model = PatientSummary
        fields = [
            "id",
            "patient_id",
            "summary",
            "last_consultation",
            "model",
            "status",
            "generated_at",
        ]
        read_only_fields = fields


def patient_summary_payload(patient):
    try:
        summary_report = patient.summary_report
    except PatientSummary.DoesNotExist:
        return None

    if not summary_report.summary.strip():
        return None

    return PatientSummarySerializer(summary_report).data
