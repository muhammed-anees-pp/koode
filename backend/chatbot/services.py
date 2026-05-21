import logging
import re
from functools import lru_cache
import requests
import spacy
from django.conf import settings
from spacy.matcher import PhraseMatcher

logger = logging.getLogger(__name__)

TOKEN_RE = re.compile(r"[a-z0-9]+")
ACTION_MESSAGE_PREFIX = "CHATBOT_ACTION::"
FIND_PSYCHOLOGIST_ACTION = f"{ACTION_MESSAGE_PREFIX}find_psychologist"


INTENT_KNOWLEDGE_BASE = [
    {
        "intent": "booking_support",
        "answer": (
            "Please follow these steps to book a consultation:\n"
            "1. Open Psychologists.\n"
            "2. Choose a department or select a psychologist.\n"
            "3. Pick an available consultation slot.\n"
            "4. Review the details and confirm the booking.\n"
            "5. Complete the payment if required.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "How can I book an appointment?",
            "How to schedule a consultation?",
            "I want to book a therapy session",
            "How to choose a slot?",
        ],
        "keywords": ["book", "booking", "appointment", "schedule", "slot"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "manage_consultation",
        "answer": (
            "You can manage your consultations from Appointments.\n\n"
            "From there, you can view consultation details, check the session status, reschedule or cancel if those actions are available, and open related chat or session options.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "Manage consultation",
            "How can I manage my consultation?",
            "Where can I see my appointments?",
            "How do I view my consultation details?",
        ],
        "keywords": ["manage", "appointments", "appointment", "consultations", "consultation", "details", "status"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "reschedule_support",
        "answer": (
            "Please follow these steps to reschedule a consultation:\n"
            "1. Open Appointments.\n"
            "2. Select the consultation you want to change.\n"
            "3. Choose Reschedule if the option is available.\n"
            "4. Pick a new available slot and confirm the change.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "Can I reschedule my consultation?",
            "How do I change my appointment time?",
            "Move my booking to another slot",
        ],
        "keywords": ["reschedule", "change", "move", "another", "time", "slot"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "cancel_support",
        "answer": (
            "Please follow these steps to cancel a consultation:\n"
            "1. Open Appointments.\n"
            "2. Select the consultation you want to cancel.\n"
            "3. Open the appointment details.\n"
            "4. Choose Cancel Booking if cancellation is still allowed.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "How do I cancel appointment?",
            "Cancel my consultation",
            "Can I cancel a session?",
        ],
        "keywords": ["cancel", "cancellation", "remove", "stop"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "refund_support",
        "answer": (
            "For refund-related questions, please check your Wallet and payment history first. "
            "If a refund is expected or money was deducted incorrectly, keep the booking ID and transaction details ready and contact platform support for confirmation.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "Regarding refund",
            "I need refund help",
            "When will I get my refund?",
            "Refund question",
        ],
        "keywords": ["refund", "refunded", "reversal", "money", "deducted"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "payment_support",
        "answer": (
            "For payment issues, please check your Wallet and the booking checkout page first. "
            "If money was deducted but the booking was not confirmed, keep the transaction details ready and contact platform support.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "Payment failed",
            "Money deducted but booking not confirmed",
            "How does wallet payment work?",
        ],
        "keywords": ["payment", "pay", "wallet", "refund", "deducted", "transaction", "checkout", "razorpay"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "clinical_psychologist",
        "answer": (
            "Clinical psychologists support concerns such as anxiety, depression, trauma, emotional distress, behavioral issues, and coping skills through assessment and evidence-based therapy.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "What does a clinical psychologist do?",
            "Explain clinical psychology",
            "Who helps with anxiety and depression?",
        ],
        "keywords": ["clinical", "anxiety", "depression", "trauma", "emotional", "behavioral"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "psychologist_role",
        "answer": (
            "A psychologist helps people understand thoughts, emotions, behavior patterns, stress, relationships, and coping difficulties. "
            "They may provide assessment, counseling, therapy support, and guidance for improving mental well-being.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "What is the role of psychologist?",
            "What does a psychologist do?",
            "Tell me about psychologists",
            "Normally what is the role of a psychologist?",
        ],
        "keywords": ["psychologist", "psychologists", "role", "normally", "general", "therapy", "counseling", "behaviour", "behavior"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "department_explanation",
        "answer": (
            "Departments group psychologists by support area, such as clinical psychology, child psychology, relationship support, trauma care, and wellness counseling. "
            "If you are unsure, please use Find Psychologist for guided matching.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "Which department should I choose?",
            "Explain departments",
            "What are psychology departments?",
        ],
        "keywords": ["department", "specialization", "category", "choose", "which", "area"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "platform_support",
        "answer": (
            "Koode helps you find verified psychologists, book consultations, attend secure sessions, manage appointments, use wallet payments, and message your psychologist from one patient account.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "How does this platform work?",
            "What can I do on Koode?",
            "Help me use the platform",
        ],
        "keywords": ["platform", "koode", "website", "app", "help", "support", "how"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
    {
        "intent": "mental_wellness",
        "answer": (
            "For general wellness, please try one small grounding step now: breathe slowly, name what you feel, drink water, and contact someone safe if you feel overwhelmed. "
            "If this feels urgent or unsafe, contact local emergency support immediately.\n\n"
            "Do you have any other doubts?"
        ),
        "examples": [
            "I feel stressed",
            "How can I calm anxiety?",
            "Give me mental wellness tips",
            "I feel overwhelmed",
        ],
        "keywords": ["stress", "stressed", "anxiety", "anxious", "calm", "wellness", "overwhelmed", "sad", "panic"],
        "quick_replies": ["Resolved", "I have other doubts"],
    },
]

FALLBACK_OPTIONS = [
    "Book consultation",
    "Show booking steps",
    "Choose department",
    "Manage consultation",
    "Payment or wallet help",
]

RESOLUTION_OPTIONS = ["Resolved", "I have other doubts"]
CLOSING_OPTIONS = RESOLUTION_OPTIONS

TASK_ACTION_OPTIONS = [
    "Book consultation",
    "Show me the steps",
    "Manage consultation",
]

OUT_OF_SCOPE_TERMS = {
    "prime minister",
    "president",
    "capital of",
    "weather",
    "cricket",
    "movie",
    "sports",
    "politics",
    "stock market",
}

INTENT_FOLLOWUP_OPTIONS = {
    "booking_support": RESOLUTION_OPTIONS,
    "manage_consultation": RESOLUTION_OPTIONS,
    "reschedule_support": RESOLUTION_OPTIONS,
    "cancel_support": RESOLUTION_OPTIONS,
    "refund_support": RESOLUTION_OPTIONS,
    "payment_support": RESOLUTION_OPTIONS,
    "clinical_psychologist": RESOLUTION_OPTIONS,
    "psychologist_role": RESOLUTION_OPTIONS,
    "department_explanation": RESOLUTION_OPTIONS,
    "platform_support": RESOLUTION_OPTIONS,
    "mental_wellness": RESOLUTION_OPTIONS,
}

STANDARD_REPLY_INTENTS = set(INTENT_FOLLOWUP_OPTIONS)

THANKS_PATTERNS = {
    "thanks",
    "thank",
    "thankyou",
    "ok",
    "okay",
    "resolved",
    "clear",
    "done",
    "no",
    "nothing",
    "that's all",
    "thats all",
}

URGENT_TERMS = {
    "suicide",
    "suicidal",
    "selfharm",
    "self-harm",
    "kill myself",
    "hurt myself",
    "unsafe",
    "emergency",
}

DIRECT_TASK_TERMS = {
    "book consultation",
    "book appointment",
    "book a consultation",
    "book an appointment",
    "book it",
    "book for me",
    "please book",
    "schedule it",
    "schedule for me",
    "cancel it",
    "cancel booking",
    "cancel my consultation",
    "reschedule it",
    "reschedule my consultation",
    "do it",
    "make appointment",
    "make a booking",
}


@lru_cache(maxsize=1)
def _nlp():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        nlp = spacy.blank("en")
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer")
        return nlp


@lru_cache(maxsize=1)
def _phrase_matcher():
    nlp = _nlp()
    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    for item in INTENT_KNOWLEDGE_BASE:
        phrases = item["examples"] + item["keywords"]
        matcher.add(item["intent"], [nlp.make_doc(phrase) for phrase in phrases])
    return matcher


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


def _is_step_reply(text):
    return bool(re.search(r"(?m)^\s*\d+\.\s+", text or ""))


def _split_reply_messages(reply, max_chars=155, max_messages=4):
    text = (reply or "").strip()
    if not text:
        return []
    if _is_step_reply(text):
        return [text]

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n+", text) if part.strip()]
    chunks = []

    for paragraph in paragraphs:
        sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", paragraph) if part.strip()]
        if not sentences:
            sentences = [paragraph]

        current = ""
        for sentence in sentences:
            candidate = f"{current} {sentence}".strip()
            if current and len(candidate) > max_chars:
                chunks.append(current)
                current = sentence
            else:
                current = candidate
        if current:
            chunks.append(current)

    if len(chunks) <= max_messages:
        return chunks

    visible = chunks[: max_messages - 1]
    visible.append(" ".join(chunks[max_messages - 1 :]))
    return visible


def _is_direct_task_request(text):
    lowered = text.lower().strip()
    return any(term in lowered for term in DIRECT_TASK_TERMS)


def _polite_task_notice(text):
    if not _is_direct_task_request(text):
        return None
    return (
        "I am sorry, I cannot complete that task directly from chat, "
        "but I can guide you step by step."
    )


def _finalize_reply(payload, source_text):
    reply = payload.get("reply", "")
    task_notice = _polite_task_notice(source_text)
    if task_notice and "cannot complete that task" not in reply.lower():
        reply = f"{task_notice}\n\n{reply}".strip()

    messages = _split_reply_messages(reply)
    if payload.get("intent") == "department_explanation":
        insert_at = len(messages)
        if messages and "do you have any other doubts" in messages[-1].lower():
            insert_at = len(messages) - 1
        messages.insert(insert_at, FIND_PSYCHOLOGIST_ACTION)

    payload["messages"] = messages or [reply]
    payload["reply"] = "\n\n".join(payload["messages"]).strip()
    return payload


def _unique_options(options, limit=3):
    unique = []
    for option in options:
        if option and option not in unique:
            unique.append(option)
    return unique[:limit]


def _contextual_quick_replies(intent, source_text, reply_text=""):
    lowered = f"{source_text} {reply_text}".lower()

    if intent in {"resolution_check", "chat_resolved"}:
        return RESOLUTION_OPTIONS if intent == "resolution_check" else ["Ask another question"]

    if intent in {"needs_more_help", "continue_chat", "fallback", "empty_message"}:
        return FALLBACK_OPTIONS

    if intent == "urgent_support":
        return ["I am safe now", "Find psychologist", "Book consultation"]

    if intent in STANDARD_REPLY_INTENTS:
        return RESOLUTION_OPTIONS

    if _is_direct_task_request(source_text):
        if "cancel" in lowered:
            return RESOLUTION_OPTIONS
        if "reschedule" in lowered or "change" in lowered or "move" in lowered:
            return RESOLUTION_OPTIONS
        if "payment" in lowered or "wallet" in lowered or "refund" in lowered:
            return RESOLUTION_OPTIONS
        return RESOLUTION_OPTIONS

    if "payment" in lowered or "wallet" in lowered or "refund" in lowered:
        return RESOLUTION_OPTIONS
    if "department" in lowered or "choose" in lowered:
        return RESOLUTION_OPTIONS
    if "reschedule" in lowered:
        return RESOLUTION_OPTIONS
    if "cancel" in lowered:
        return RESOLUTION_OPTIONS

    return _unique_options(INTENT_FOLLOWUP_OPTIONS.get(intent, FALLBACK_OPTIONS))


def _tokens(text):
    return set(TOKEN_RE.findall(text.lower()))


def _normalized_terms(doc):
    terms = set()
    for token in doc:
        if token.is_space or token.is_punct or token.is_stop or len(token.text) <= 2:
            continue
        lemma = token.lemma_.lower().strip() if token.lemma_ and token.lemma_ != "-PRON-" else token.lower_
        terms.add(lemma)
        terms.add(token.lower_)
    try:
        noun_chunks = doc.noun_chunks
        for chunk in noun_chunks:
            phrase = chunk.text.lower().strip()
            if len(phrase) > 2:
                terms.add(phrase)
    except ValueError:
        pass
    return terms


def _is_closing_message(text):
    lowered = text.lower().strip()
    compact = lowered.replace(" ", "")
    return lowered in THANKS_PATTERNS or compact in THANKS_PATTERNS


def _resolution_followup(text):
    lowered = text.lower().strip()
    compact = lowered.replace(" ", "")
    if lowered in {"resolved", "yes resolved", "yes, resolved"} or compact in {"resolved", "yesresolved"}:
        return {
            "reply": (
                "Thank you for confirming. We are glad we could help.\n\n"
                "Koode Assistant is always here if you need support with booking, consultations, payments, or wellness guidance."
            ),
            "intent": "chat_resolved",
            "confidence": 1,
            "quick_replies": [],
        }
    if (
        "other doubt" in lowered
        or "another doubt" in lowered
        or "more doubt" in lowered
        or "still need help" in lowered
        or "need help" in lowered
    ):
        return {
            "reply": "Of course. Please let me know your doubt, and I will help you with the next step.",
            "intent": "needs_more_help",
            "confidence": 1,
            "quick_replies": [],
        }
    if "ask another" in lowered or "another question" in lowered:
        return {
            "reply": "Sure. What would you like help with next?",
            "intent": "continue_chat",
            "confidence": 1,
            "quick_replies": FALLBACK_OPTIONS,
        }
    return None


def _has_urgent_terms(text):
    lowered = text.lower()
    return any(term in lowered for term in URGENT_TERMS)


def _is_out_of_scope(text):
    lowered = text.lower()
    return any(term in lowered for term in OUT_OF_SCOPE_TERMS)


def _forced_intent(text):
    lowered = text.lower()

    if "refund" in lowered or "refunded" in lowered:
        return "refund_support"
    if "manage" in lowered and ("consultation" in lowered or "appointment" in lowered):
        return "manage_consultation"
    if "not" in lowered and "clinical" in lowered and "psychologist" in lowered:
        return "psychologist_role"
    if "psychologist" in lowered and "clinical" not in lowered:
        if "role" in lowered or "normally" in lowered or "what does" in lowered or "what is" in lowered:
            return "psychologist_role"

    return None


def _score_intents(text):
    nlp = _nlp()
    doc = nlp(text[:2000])
    message_terms = _normalized_terms(doc)
    message_tokens = _tokens(text)
    phrase_counts = {}

    for match_id, start, end in _phrase_matcher()(doc):
        intent = nlp.vocab.strings[match_id]
        phrase_counts[intent] = phrase_counts.get(intent, 0) + max(1, end - start)

    scored = []
    for item in INTENT_KNOWLEDGE_BASE:
        if item["intent"] == "booking_support" and not (message_tokens & {"book", "booking", "schedule"}):
            scored.append((0, item, []))
            continue
        if item["intent"] == "cancel_support" and not (message_tokens & {"cancel", "cancellation", "remove", "stop"}):
            scored.append((0, item, []))
            continue
        if item["intent"] == "clinical_psychologist" and "clinical" not in message_tokens:
            scored.append((0, item, []))
            continue

        keyword_terms = set(item["keywords"])
        keyword_overlap = len(message_terms & keyword_terms) / max(len(keyword_terms), 1)
        token_overlap = len(message_tokens & keyword_terms) / max(len(message_tokens), 1)
        phrase_score = min(1, phrase_counts.get(item["intent"], 0) / 3)
        score = min(1, (keyword_overlap * 0.45) + (token_overlap * 0.25) + (phrase_score * 0.3))
        scored.append((score, item, sorted(message_terms & keyword_terms)))

    confidence, best, matches = max(scored, key=lambda pair: pair[0])
    return confidence, best, matches, sorted(message_terms)


def _call_mistral_for_reply(message, base_answer, intent, confidence, history=None):
    api_key = getattr(settings, "MISTRAL_API_KEY", "")
    if not api_key:
        return None

    recent_history = "\n".join(
        f"{item.get('role', 'USER')}: {item.get('content', '')[:240]}"
        for item in (history or [])[-6:]
        if item.get("content")
    )

    system_prompt = (
        "You are Koode Assistant, a concise, warm patient-support chatbot for a mental wellness platform. "
        "Use the provided answer as the source of truth. Do not diagnose. Do not invent policy. "
        "Write politely and professionally. If the source answer contains numbered steps, keep all steps together in one message. "
        "When the patient asks you to perform a task, explain that you cannot complete the task from chat and then guide them step by step. "
        "End resolved support answers by asking: 'Do you have any other doubts?' "
        "If there is risk of harm or emergency, direct the user to local emergency support and a trusted person. "
        "Keep the total response under 90 words."
    )
    user_prompt = (
        f"Patient message: {message}\n"
        f"Detected intent: {intent} with confidence {confidence}\n"
        f"Recent chat:\n{recent_history or 'No previous messages.'}\n"
        f"Source answer: {base_answer}\n\n"
        "Write the best assistant response."
    )

    try:
        response = requests.post(
            getattr(settings, "MISTRAL_API_URL"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": getattr(settings, "MISTRAL_MODEL", "mistral-small-latest"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.35,
                "max_tokens": 160,
            },
            timeout=getattr(settings, "MISTRAL_TIMEOUT_SECONDS", 30),
        )
        response.raise_for_status()
        payload = response.json()
        content = _message_content_text(
            payload.get("choices", [{}])[0].get("message", {}).get("content", "")
        )
        return content or None
    except Exception as exc:
        logger.warning("Mistral chatbot reply failed: %s", exc)
        return None


def _with_resolution_prompt(answer):
    prompt = "Do you have any other doubts?"
    if prompt.lower() in answer.lower():
        return answer
    if answer.rstrip().endswith("?"):
        return answer
    return f"{answer}\n\n{prompt}"


def _knowledge_item(intent):
    return next((item for item in INTENT_KNOWLEDGE_BASE if item["intent"] == intent), None)


def get_chatbot_reply(message, history=None):
    text = message.strip()
    if not text:
        return _finalize_reply({
            "reply": "Please type a question so I can help.",
            "intent": "empty_message",
            "confidence": 1,
            "quick_replies": FALLBACK_OPTIONS,
        }, text)

    resolution_reply = _resolution_followup(text)
    if resolution_reply:
        return _finalize_reply(resolution_reply, text)

    if _is_closing_message(text):
        return _finalize_reply({
            "reply": (
                "Thank you for chatting with Koode Assistant. "
                "Did Koode Assistant resolve your issue?"
            ),
            "intent": "resolution_check",
            "confidence": 1,
            "quick_replies": RESOLUTION_OPTIONS,
        }, text)

    if _has_urgent_terms(text):
        return _finalize_reply({
            "reply": (
                "I am really sorry you are feeling this way. If you might harm yourself or feel unsafe, "
                "please contact local emergency services now or reach a trusted person nearby. "
                "Koode can help with booking support, but urgent safety needs immediate human help."
            ),
            "intent": "urgent_support",
            "confidence": 1,
            "quick_replies": ["Find psychologist", "Book consultation", "I am safe now"],
        }, text)

    if _is_out_of_scope(text):
        return _finalize_reply({
            "reply": (
                "I am sorry, I can help only with Koode support topics such as booking, consultations, departments, payments, and wellness guidance.\n\n"
                "Please ask a Koode-related question, and I will help you."
            ),
            "intent": "out_of_scope",
            "confidence": 1,
            "quick_replies": FALLBACK_OPTIONS,
        }, text)

    forced_intent = _forced_intent(text)
    if forced_intent:
        item = _knowledge_item(forced_intent)
        if item:
            return _finalize_reply({
                "reply": _with_resolution_prompt(item["answer"]),
                "intent": item["intent"],
                "confidence": 1,
                "quick_replies": RESOLUTION_OPTIONS,
                "nlp_matches": [],
                "nlp_terms": [],
            }, text)

    confidence, best, matches, extracted_terms = _score_intents(text)
    if confidence < 0.12:
        fallback = (
            "I can help with booking, consultations, departments, platform support, payments, "
            "and basic mental wellness guidance. Could you share a little more detail about what you need?"
        )
        return _finalize_reply({
            "reply": fallback,
            "intent": "fallback",
            "confidence": round(confidence, 3),
            "quick_replies": FALLBACK_OPTIONS,
            "nlp_matches": matches,
            "nlp_terms": extracted_terms[:12],
        }, text)

    base_answer = _with_resolution_prompt(best["answer"])
    use_llm_rewrite = getattr(settings, "CHATBOT_USE_LLM_REWRITES", True)
    mistral_answer = None
    if (
        use_llm_rewrite
        and best["intent"] not in {"booking_support", "manage_consultation", "reschedule_support", "cancel_support"}
        and not _is_step_reply(base_answer)
    ):
        mistral_answer = _call_mistral_for_reply(
            text,
            base_answer,
            best["intent"],
            round(confidence, 3),
            history=history,
        )
    reply = mistral_answer or base_answer

    quick_replies = _contextual_quick_replies(best["intent"], text, reply)

    return _finalize_reply({
        "reply": reply,
        "intent": best["intent"],
        "confidence": round(confidence, 3),
        "quick_replies": quick_replies,
        "nlp_matches": matches,
        "nlp_terms": extracted_terms[:12],
    }, text)
