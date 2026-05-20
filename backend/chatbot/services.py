from difflib import SequenceMatcher
import re


TOKEN_RE = re.compile(r"[a-z0-9]+")


INTENT_KNOWLEDGE_BASE = [
    {
        "intent": "booking_support",
        "answer": "Go to Psychologists, select a department or therapist, choose an available slot, and confirm your booking. You can also use Find Psychologist if you are unsure where to start.",
        "examples": [
            "How can I book an appointment?",
            "How to schedule a consultation?",
            "I want to book a therapy session",
            "How to choose a slot?",
        ],
        "keywords": ["book", "booking", "appointment", "schedule", "slot", "consultation", "session"],
    },
    {
        "intent": "reschedule_support",
        "answer": "Yes, you can reschedule from your appointments section before the slot time. Open Appointments, select the consultation, and choose the available action.",
        "examples": [
            "Can I reschedule my consultation?",
            "How do I change my appointment time?",
            "Move my booking to another slot",
        ],
        "keywords": ["reschedule", "change", "move", "another", "time", "slot"],
    },
    {
        "intent": "cancel_support",
        "answer": "You can cancel eligible bookings from Appointments. Open the appointment detail page and use Cancel Booking if it is still allowed before the session time.",
        "examples": [
            "How do I cancel appointment?",
            "Cancel my consultation",
            "Can I cancel a session?",
        ],
        "keywords": ["cancel", "cancellation", "refund", "remove", "stop"],
    },
    {
        "intent": "clinical_psychologist",
        "answer": "Clinical psychologists help with concerns such as anxiety, depression, trauma, emotional distress, behavioral issues, and coping skills. They assess difficulties and provide evidence-based therapy support.",
        "examples": [
            "What does a clinical psychologist do?",
            "Explain clinical psychology",
            "Who helps with anxiety and depression?",
        ],
        "keywords": ["clinical", "psychologist", "anxiety", "depression", "trauma", "emotional", "behavioral"],
    },
    {
        "intent": "department_explanation",
        "answer": "Departments group psychologists by support area, such as clinical psychology, child psychology, relationship support, trauma care, and wellness counseling. If you are unsure, use Find Psychologist for guidance.",
        "examples": [
            "Which department should I choose?",
            "Explain departments",
            "What are psychology departments?",
        ],
        "keywords": ["department", "specialization", "category", "choose", "which", "area"],
    },
    {
        "intent": "platform_support",
        "answer": "Koode helps you find verified psychologists, book consultations, attend secure sessions, manage appointments, use wallet payments, and message your therapist from one patient account.",
        "examples": [
            "How does this platform work?",
            "What can I do on Koode?",
            "Help me use the platform",
        ],
        "keywords": ["platform", "koode", "website", "app", "help", "support", "how"],
    },
    {
        "intent": "mental_wellness",
        "answer": "For general wellness, try a small grounding step: slow breathing, naming what you feel, drinking water, and reaching out to someone safe. If distress feels intense or urgent, please contact local emergency support or a trusted person immediately.",
        "examples": [
            "I feel stressed",
            "How can I calm anxiety?",
            "Give me mental wellness tips",
            "I feel overwhelmed",
        ],
        "keywords": ["stress", "stressed", "anxiety", "anxious", "calm", "wellness", "overwhelmed", "sad", "panic"],
    },
]


FALLBACK_ANSWER = (
    "I can help with booking, consultations, departments, platform support, and basic mental wellness guidance. "
    "Could you share a little more detail about what you need?"
)


def _tokens(text):
    return set(TOKEN_RE.findall(text.lower()))


def _similarity(message, example):
    message_tokens = _tokens(message)
    example_tokens = _tokens(example)
    if not message_tokens or not example_tokens:
        return 0

    overlap = len(message_tokens & example_tokens) / len(message_tokens | example_tokens)
    sequence = SequenceMatcher(None, message.lower(), example.lower()).ratio()
    return (overlap * 0.65) + (sequence * 0.35)


def get_chatbot_reply(message):
    text = message.strip()
    if not text:
        return {
            "reply": "Please type a question so I can help.",
            "intent": "empty_message",
            "confidence": 1,
        }

    scored_intents = []
    message_tokens = _tokens(text)
    for item in INTENT_KNOWLEDGE_BASE:
        keyword_score = len(message_tokens & set(item["keywords"])) / max(len(message_tokens), 1)
        example_score = max(_similarity(text, example) for example in item["examples"])
        score = min(1, (keyword_score * 0.55) + (example_score * 0.45))
        scored_intents.append((score, item))

    confidence, best = max(scored_intents, key=lambda pair: pair[0])
    if confidence < 0.18:
        return {
            "reply": FALLBACK_ANSWER,
            "intent": "fallback",
            "confidence": round(confidence, 3),
        }

    return {
        "reply": best["answer"],
        "intent": best["intent"],
        "confidence": round(confidence, 3),
    }
