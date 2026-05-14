import logging
import re
import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from consultations.models import Consultation
from patient_summary.models import PatientSummary

logger = logging.getLogger(__name__)


MAX_SUMMARY_LINES = 6
MAX_OVERVIEW_LINES = MAX_SUMMARY_LINES - 1
MAX_OVERVIEW_CHARS = 900
MAX_LINE_CHARS = 180


SYSTEM_PROMPT = """
You create concise clinical continuity summaries for psychologists.
Use only the information provided. Do not diagnose beyond the notes.
Write in plain language for quick psychologist review.
Rewrite the whole patient summary after every consultation.
The summary must be short, replacing the old summary instead of appending to it.
Do not create a chronological history, visit-by-visit log, essay, or consultation-note dump.
Do not mention session counts or consultation dates unless clinically essential.
Return at most 6 non-empty lines total.
Line 1 must be exactly: Consulted psychologists: <names>.
Lines 2 to 6 must be concise current patient summary lines covering current condition, progress, concerns, risk flags, and future-session focus when present.
Each line must be a short plain sentence.
Do not use bullets, markdown, headings, or labels like "Latest consultation note".
Return only those lines.
""".strip()


"""
GET COMPLETE CONSULTATIONS TO PATIENT IN ORDER
"""
def _completed_consultations_for_patient(patient):
    return (
        Consultation.objects.select_related("booking__psychologist__user")
        .filter(booking__patient=patient, status="COMPLETED")
        .order_by("booking__date", "booking__start_time", "ended_at")
    )


"""
COLLECT UNIQUE PSYCHOLOGIST NAMES FROM PATIENTS CONSULTATIONS
"""
def _psychologist_names_for_patient(patient):
    names = []
    seen = set()
    for consultation in _completed_consultations_for_patient(patient):
        psychologist = consultation.booking.psychologist
        key = psychologist.psychologist_id
        if key in seen:
            continue
        seen.add(key)
        names.append(psychologist.user.full_name)
    return names


"""
BUILD CONSULTED PSYCHOLOGIST LIST
"""
def _psychologist_line(psychologist_names):
    names = ", ".join(psychologist_names) if psychologist_names else "Not available"
    return f"Consulted psychologists: {names}."


"""
REMOVE META DATA FROM THE NOTES
"""
def _extract_overview_text(summary):
    text = (summary or "").strip()
    if not text:
        return ""

    cleaned_lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.lower().startswith("consulted psychologists:"):
            continue
        if stripped.lower().startswith("the patient has consulted multiple psychologists:"):
            continue
        stripped = re.sub(r"^latest consultation note:\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"^overall summary:\s*", "", stripped, flags=re.IGNORECASE)
        if stripped:
            cleaned_lines.append(stripped)

    return " ".join(cleaned_lines).strip()


"""
SPLIT NORMALIZED TEXT TO SENTENCE 
"""
def _sentence_chunks(text):
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if not text:
        return []

    chunks = re.split(r"(?<=[.!?])\s+", text)
    return [chunk.strip(" -\t") for chunk in chunks if chunk.strip(" -\t")]



"""
SHORTEN THE SUMMARY TO MINIMAL LINES
"""
def _trim_line(text):
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if len(text) <= MAX_LINE_CHARS:
        return text

    trimmed = text[:MAX_LINE_CHARS].rsplit(" ", 1)[0].strip()
    return f"{trimmed.rstrip('.')}."


"""
CONVERT LONG OVERVIEW TO MINIMAL LINE SUMMARY
"""
def _compact_overview_text(overview):
    overview = _extract_overview_text(overview)
    if not overview:
        return ""

    overview = overview[:MAX_OVERVIEW_CHARS]
    lines = []
    for chunk in _sentence_chunks(overview):
        line = _trim_line(chunk)
        if line:
            lines.append(line)
        if len(lines) >= MAX_OVERVIEW_LINES:
            break

    return "\n".join(lines).strip()



"""
COMBINE THE PSYCHOLOGIST LINE WITH COMPACT OVERVIEW
"""
def _format_summary(psychologist_names, overview):
    overview = _compact_overview_text(overview)
    if not overview:
        return ""
    return f"{_psychologist_line(psychologist_names)}\n\n{overview}"


"""
BUILD SUMMARY LOCALLY WHEN AI FAIL
"""
def _fallback_summary(previous_summary, latest_note, psychologist_names):
    previous_overview = _extract_overview_text(previous_summary)
    latest_note = _extract_overview_text(latest_note)

    if latest_note and previous_overview:
        overview = f"{latest_note} {previous_overview}"
    elif latest_note:
        overview = latest_note
    else:
        overview = previous_overview
    return _format_summary(psychologist_names, overview)


"""
PROMPT SENT TO MISTRAL FOR REWRITING THE PATIENT SUMMARY
"""
def _build_user_prompt(patient, consultation, current_summary, psychologist_names):
    current_overview = _extract_overview_text(current_summary)

    return f"""
Patient: {patient.user.full_name}
Current summary:
{current_overview or "No existing summary yet."}

Latest finished consultation:
Date: {consultation.booking.date}
Psychologist: {consultation.booking.psychologist.user.full_name}
Psychologist consultation note:
{consultation.psychologist_note.strip()}

Consulted psychologists to show in the first paragraph:
{", ".join(psychologist_names) if psychologist_names else consultation.booking.psychologist.user.full_name}

Rewrite the summary in this exact shape:
Consulted psychologists: <names>.

<up to five short current-summary lines, not a consultation-note history>
""".strip()



"""
NORMALIZE MISTRAL RESPONSE CONTENT INTO PLAIN TEXT
"""
def _message_content_text(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text") or item.get("content") or ""
                if text:
                    parts.append(str(text))
            elif item:
                parts.append(str(item))
        return " ".join(parts).strip()
    return str(content or "").strip()


"""
SEND SUMMARY PROMPT TO MISTRAL AND RETURN THE GENERATED TEXT
"""
def _call_mistral(messages):
    api_key = getattr(settings, "MISTRAL_API_KEY", "")
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        getattr(settings, "MISTRAL_API_URL"),
        headers=headers,
        json={
            "model": getattr(settings, "MISTRAL_MODEL", "mistral-small-latest"),
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 220,
        },
        timeout=getattr(settings, "MISTRAL_TIMEOUT_SECONDS", 30),
    )
    response.raise_for_status()
    payload = response.json()
    content = _message_content_text(
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    if not content:
        raise RuntimeError("Mistral returned an empty summary.")
    return content, payload.get("model") or getattr(settings, "MISTRAL_MODEL", "mistral-small-latest")



"""
GENERATE AND STORE LATEST PATIENT SUMMARY AFTER COMPLETE CONSULTATTION 
"""
def update_patient_summary_for_consultation(consultation):
    consultation = (
        Consultation.objects.select_related(
            "booking__patient__user",
            "booking__psychologist__user",
        )
        .get(id=consultation.id)
    )

    if consultation.status != "COMPLETED":
        return None

    latest_note = consultation.psychologist_note.strip()
    if not latest_note:
        return _mark_summary_skipped(consultation, "Psychologist note is empty.")

    patient = consultation.booking.patient
    summary_report, _ = PatientSummary.objects.get_or_create(patient=patient)
    current_summary = summary_report.summary.strip()
    psychologist_names = _psychologist_names_for_patient(patient)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": _build_user_prompt(
                patient,
                consultation,
                current_summary,
                psychologist_names,
            ),
        },
    ]

    try:
        generated_summary, model = _call_mistral(messages)
        generated_summary = _format_summary(psychologist_names, generated_summary)
        status = "READY"
        error_message = ""
    except Exception as exc:
        logger.exception("Failed to generate patient summary for consultation %s", consultation.id)
        generated_summary = _fallback_summary(current_summary, latest_note, psychologist_names)
        model = getattr(settings, "MISTRAL_MODEL", "mistral-small-latest")
        status = "FAILED"
        error_message = str(exc)

    with transaction.atomic():
        locked_summary, _ = PatientSummary.objects.select_for_update().get_or_create(patient=patient)
        locked_summary.summary = generated_summary.strip()
        locked_summary.last_consultation = consultation
        locked_summary.model = model
        locked_summary.status = status
        locked_summary.error_message = error_message
        locked_summary.generated_at = timezone.now()
        locked_summary.save(update_fields=[
            "summary",
            "last_consultation",
            "model",
            "status",
            "error_message",
            "generated_at",
            "updated_at",
        ])
        return locked_summary


"""
MARK SUMMARY GENERATION AS SKIPPED WHEN CONSULTATION DATA IS MISSING
"""
def _mark_summary_skipped(consultation, reason):
    patient = consultation.booking.patient
    summary_report, _ = PatientSummary.objects.get_or_create(patient=patient)
    summary_report.last_consultation = consultation
    summary_report.status = "SKIPPED"
    summary_report.error_message = reason
    summary_report.save(update_fields=[
        "last_consultation",
        "status",
        "error_message",
        "updated_at",
    ])
    return summary_report
