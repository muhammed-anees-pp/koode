import os
import logging
from functools import lru_cache
import spacy
from spacy.matcher import PhraseMatcher
from psychologists.models import Specialization
from mistralai.client import Mistral

logger = logging.getLogger(__name__)


"""
QUESTIONS SET
"""
QUESTION_TREE = {
    "root": {
        "text": "What is the primary reason you are seeking support today?",
        "helper": "Select the option that best describes your main concern.",
        "options": [
            {
                "id": "opt_mood",
                "label": "Feeling down, sad, or lacking motivation",
                "next": "q_mood",
                "keywords": ["depression", "sad", "low", "mood", "fatigue", "hopeless", "clinical"]
            },
            {
                "id": "opt_anxiety",
                "label": "Excessive worry, stress, or panic",
                "next": "q_anxiety",
                "keywords": ["anxiety", "stress", "worry", "panic", "overthinking", "tension"]
            },
            {
                "id": "opt_trauma",
                "label": "Difficult past experiences or trauma",
                "next": "q_trauma",
                "keywords": ["trauma", "ptsd", "abuse", "flashback", "nightmare", "past"]
            },
            {
                "id": "opt_relationship",
                "label": "Relationship or family issues",
                "next": "q_relationship",
                "keywords": ["relationship", "marriage", "family", "conflict", "breakup", "couple", "communication"]
            },
            {
                "id": "opt_behavior",
                "label": "Anger, emotional regulation, or behavior",
                "next": "q_behavior",
                "keywords": ["anger", "irritability", "outburst", "aggressive", "temper", "behavior"]
            },
            {
                "id": "opt_child",
                "label": "Concerns about a child or adolescent",
                "next": "q_child",
                "keywords": ["child", "adolescent", "kid", "parenting", "school", "development"]
            },
            {
                "id": "opt_health",
                "label": "Health, medical issues, or lifestyle changes",
                "next": "q_health",
                "keywords": ["health", "illness", "chronic", "lifestyle", "medical", "disease"]
            },
            {
                "id": "opt_other",
                "label": "Something else or not sure",
                "next": "q_other",
                "keywords": ["counseling", "consultation", "mental", "support"]
            }
        ]
    },
    "q_mood": {
        "text": "How long have you been experiencing these feelings?",
        "helper": "This helps us understand the severity and duration.",
        "options": [
            {"id": "mood_1", "label": "Less than a month", "next": "q_mood_2", "keywords": ["situational", "counseling"]},
            {"id": "mood_2", "label": "A few months", "next": "q_mood_2", "keywords": ["persistent", "mood"]},
            {"id": "mood_3", "label": "More than a year", "next": "q_mood_2", "keywords": ["chronic", "clinical", "disorder"]}
        ]
    },
    "q_mood_2": {
        "text": "Has this significantly affected your daily life (work, social, or personal care)?",
        "helper": "Knowing the impact on your life helps us find the right level of support.",
        "options": [
            {"id": "mood_2_1", "label": "Yes, I struggle to function", "next": "done", "keywords": ["severe", "impact"]},
            {"id": "mood_2_2", "label": "Somewhat, but I manage", "next": "done", "keywords": ["moderate", "coping"]},
            {"id": "mood_2_3", "label": "No, I am functioning normally", "next": "done", "keywords": ["mild", "functioning"]}
        ]
    },
    "q_anxiety": {
        "text": "Do you experience physical symptoms like racing heart, shortness of breath, or sweating?",
        "helper": "Physical symptoms often accompany anxiety or panic.",
        "options": [
            {"id": "anx_1", "label": "Yes, frequently", "next": "q_anxiety_2", "keywords": ["panic", "physical", "somatic"]},
            {"id": "anx_2", "label": "Sometimes", "next": "q_anxiety_2", "keywords": ["stress", "tension"]},
            {"id": "anx_3", "label": "No, mostly mental worry", "next": "q_anxiety_2", "keywords": ["generalized", "worry"]}
        ]
    },
    "q_anxiety_2": {
        "text": "Are there specific situations or triggers that cause this anxiety?",
        "helper": "This helps determine if it's generalized or specific.",
        "options": [
            {"id": "anx_2_1", "label": "Social situations or public speaking", "next": "done", "keywords": ["social anxiety", "phobia"]},
            {"id": "anx_2_2", "label": "Specific phobias or situations", "next": "done", "keywords": ["specific phobia", "trigger"]},
            {"id": "anx_2_3", "label": "It happens randomly or constantly", "next": "done", "keywords": ["constant", "random", "generalized"]}
        ]
    },
    "q_trauma": {
        "text": "Are these experiences affecting your ability to sleep or function normally?",
        "helper": "Trauma can have wide-ranging impacts on daily life.",
        "options": [
            {"id": "tr_1", "label": "Yes, severely", "next": "q_trauma_2", "keywords": ["severe", "ptsd", "disorder"]},
            {"id": "tr_2", "label": "Somewhat", "next": "q_trauma_2", "keywords": ["adjustment", "healing"]},
            {"id": "tr_3", "label": "No, but they still bother me", "next": "q_trauma_2", "keywords": ["emotional", "support"]}
        ]
    },
    "q_trauma_2": {
        "text": "Do you often have intrusive memories or nightmares about the experience?",
        "helper": "These are common symptoms we can help with.",
        "options": [
            {"id": "tr_2_1", "label": "Yes, very frequently", "next": "done", "keywords": ["nightmares", "intrusive", "flashbacks"]},
            {"id": "tr_2_2", "label": "Occasionally", "next": "done", "keywords": ["occasional", "memories"]},
            {"id": "tr_2_3", "label": "Rarely or never", "next": "done", "keywords": ["avoidance"]}
        ]
    },
    "q_relationship": {
        "text": "Who is the primary relationship you are having difficulties with?",
        "helper": "Different dynamics require different approaches.",
        "options": [
            {"id": "rel_1", "label": "Romantic partner/spouse", "next": "q_relationship_2", "keywords": ["couple", "marriage", "romantic"]},
            {"id": "rel_2", "label": "Family members", "next": "q_relationship_2", "keywords": ["family", "parents", "siblings"]},
            {"id": "rel_3", "label": "Friends or colleagues", "next": "q_relationship_2", "keywords": ["interpersonal", "social", "work"]},
            {"id": "rel_4", "label": "Multiple relationships", "next": "q_relationship_2", "keywords": ["boundaries", "communication"]}
        ]
    },
    "q_relationship_2": {
        "text": "What is the primary issue within this relationship?",
        "helper": "Identifying the core problem helps in finding the right guidance.",
        "options": [
            {"id": "rel_2_1", "label": "Communication problems or frequent arguments", "next": "done", "keywords": ["arguments", "communication issue"]},
            {"id": "rel_2_2", "label": "Trust issues or infidelity", "next": "done", "keywords": ["trust", "infidelity", "betrayal"]},
            {"id": "rel_2_3", "label": "Lack of emotional connection", "next": "done", "keywords": ["intimacy", "connection", "distance"]}
        ]
    },
    "q_behavior": {
        "text": "Do these behaviors lead to negative consequences in your life (e.g., at work or home)?",
        "helper": "Understanding the impact helps tailor the support.",
        "options": [
            {"id": "beh_1", "label": "Yes, often", "next": "q_behavior_2", "keywords": ["management", "impulsivity", "control"]},
            {"id": "beh_2", "label": "Sometimes", "next": "q_behavior_2", "keywords": ["regulation", "frustration"]},
            {"id": "beh_3", "label": "Rarely", "next": "q_behavior_2", "keywords": ["irritability", "stress"]}
        ]
    },
    "q_behavior_2": {
        "text": "Do you feel like you lose control during these outbursts?",
        "helper": "This helps us understand emotional regulation needs.",
        "options": [
            {"id": "beh_2_1", "label": "Yes, completely", "next": "done", "keywords": ["loss of control", "rage"]},
            {"id": "beh_2_2", "label": "Somewhat", "next": "done", "keywords": ["struggle", "escalation"]},
            {"id": "beh_2_3", "label": "No, I am just very easily irritated", "next": "done", "keywords": ["annoyed", "short fuse"]}
        ]
    },
    "q_child": {
        "text": "What is the main concern regarding the child?",
        "helper": "Child psychology covers a broad range of developmental areas.",
        "options": [
            {"id": "ch_1", "label": "Behavioral or disciplinary issues", "next": "q_child_2", "keywords": ["behavioral", "defiance", "discipline"]},
            {"id": "ch_2", "label": "Academic or learning challenges", "next": "q_child_2", "keywords": ["learning", "school", "academic", "cognitive"]},
            {"id": "ch_3", "label": "Emotional (anxiety, sadness)", "next": "q_child_2", "keywords": ["emotion", "mood"]},
            {"id": "ch_4", "label": "Social skills or making friends", "next": "q_child_2", "keywords": ["social", "peer"]}
        ]
    },
    "q_child_2": {
        "text": "How old is the child?",
        "helper": "Age is a key factor in child psychology.",
        "options": [
            {"id": "ch_2_1", "label": "Toddler/Preschool (0-5)", "next": "done", "keywords": ["toddler", "early childhood"]},
            {"id": "ch_2_2", "label": "School Age (6-12)", "next": "done", "keywords": ["school age", "childhood"]},
            {"id": "ch_2_3", "label": "Teenager (13-18)", "next": "done", "keywords": ["teen", "adolescence", "teenager"]}
        ]
    },
    "q_health": {
        "text": "Is this related to a chronic illness, recent diagnosis, or lifestyle change?",
        "helper": "Health psychology focuses on the mind-body connection.",
        "options": [
            {"id": "hlth_1", "label": "Chronic illness management", "next": "q_health_2", "keywords": ["chronic", "pain", "coping"]},
            {"id": "hlth_2", "label": "Recent medical diagnosis", "next": "q_health_2", "keywords": ["medical", "adjustment"]},
            {"id": "hlth_3", "label": "Lifestyle changes (weight, sleep, smoking)", "next": "q_health_2", "keywords": ["lifestyle", "habit", "behavior"]}
        ]
    },
    "q_health_2": {
        "text": "Are you primarily seeking help for physical pain management or emotional coping?",
        "helper": "This helps tailor the approach (e.g. pain psychology vs counseling).",
        "options": [
            {"id": "hlth_2_1", "label": "Physical pain management", "next": "done", "keywords": ["pain management", "somatic"]},
            {"id": "hlth_2_2", "label": "Emotional coping and adjustment", "next": "done", "keywords": ["emotional support", "coping"]},
            {"id": "hlth_2_3", "label": "Both", "next": "done", "keywords": ["holistic", "comprehensive"]}
        ]
    },
    "q_other": {
        "text": "Could you briefly categorize your need?",
        "helper": "This helps us if your concern doesn't fit the main categories.",
        "options": [
            {"id": "oth_1", "label": "Personal growth or self-exploration", "next": "q_other_2", "keywords": ["growth", "self-esteem", "identity"]},
            {"id": "oth_2", "label": "Career or work-related", "next": "q_other_2", "keywords": ["career", "work", "burnout"]},
            {"id": "oth_3", "label": "Legal or forensic matters", "next": "q_other_2", "keywords": ["forensic", "legal", "court"]},
            {"id": "oth_4", "label": "Neurological or cognitive concerns", "next": "q_other_2", "keywords": ["neuropsychology", "cognitive", "memory", "brain", "neuro"]}
        ]
    },
    "q_other_2": {
        "text": "Have you seen a psychologist or specialist before for this issue?",
        "helper": "Knowing your history helps in recommending the right specialist.",
        "options": [
            {"id": "oth_2_1", "label": "Yes, currently seeing one", "next": "done", "keywords": ["ongoing consultation"]},
            {"id": "oth_2_2", "label": "Yes, in the past", "next": "done", "keywords": ["prior consultation"]},
            {"id": "oth_2_3", "label": "No, this is my first time", "next": "done", "keywords": ["first time", "new to consultation"]}
        ]
    }
}


@lru_cache(maxsize=1)
def _nlp():
    return spacy.blank("en")


"""
EXTRACT WORD
"""
def extract_keywords_from_text(text):
    if not text:
        return []
    nlp = _nlp()
    doc = nlp(text[:2000].lower())
    token_terms = {
        token.text
        for token in doc
        if not token.is_space and not token.is_punct and not token.is_stop and len(token.text) > 2
    }
    return list(token_terms)


"""
COLLECT ALL OPTION KEYWORDS
"""
def get_all_option_keywords(answers):
    keywords = set()
    for question_key, q_data in QUESTION_TREE.items():
        for opt in q_data.get("options", []):
            if opt["id"] in answers:
                for kw in opt.get("keywords", []):
                    keywords.add(kw.lower())
    return list(keywords)


"""
AI RECOMMENDATION
"""
def get_mistral_recommendation(keywords, concern_text, specializations):
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        return None
        
    try:
        client = Mistral(api_key=api_key)
        
        spec_list = "\n".join([f"- {s.name}: {s.description}" for s in specializations])
        
        prompt = f"""You are an expert mental health matching assistant.
Given the following user keywords and their optional concern description, choose the BEST matching specialization from the provided list.

User keywords: {', '.join(keywords)}
User description: {concern_text}

Available Specializations:
{spec_list}

Return ONLY the exact name of the best matching specialization from the list, nothing else. If you are unsure, pick the closest one."""

        response = client.chat.complete(
            model="open-mistral-7b",
            messages=[{"role": "user", "content": prompt}]
        )
        
        suggested_name = response.choices[0].message.content.strip()
        
        for spec in specializations:
            if spec.name.lower() in suggested_name.lower():
                return spec
                
        return None
    except Exception as e:
        logger.error(f"Mistral AI recommendation failed: {e}")
        return None


def recommend_department(answers, concern_text=""):
    selected_keywords = get_all_option_keywords(answers)
    text_keywords = extract_keywords_from_text(concern_text)
    all_keywords = set(selected_keywords + text_keywords)

    active_specializations = list(Specialization.objects.filter(active=True))
    if not active_specializations:
        return {
            "department": "General Psychology",
            "title": "General Consultation",
            "subtitle": "Comprehensive Support",
            "approach": "individualized consultation",
            "explanation": "We couldn't find a specific active department, but our general psychologists are ready to help.",
            "nlp_matches": [],
        }

    best_spec = get_mistral_recommendation(list(all_keywords), concern_text, active_specializations)
    best_matches = list(all_keywords) if best_spec else []

    if not best_spec:
        best_score = -1
        nlp = _nlp()

        for spec in active_specializations:
            score = 0
            matches = []
            spec_text = f"{spec.name} {spec.description}".lower()
            spec_doc = nlp(spec_text)
            spec_tokens = {t.text for t in spec_doc}

            for kw in all_keywords:
                if kw in spec_text or kw in spec_tokens:
                    score += 1
                    matches.append(kw)

            name_tokens = {t.text for t in nlp(spec.name.lower())}
            for kw in all_keywords:
                if kw in name_tokens:
                    score += 2
                    if kw not in matches:
                        matches.append(kw)

            if score > best_score:
                best_score = score
                best_spec = spec
                best_matches = matches

        if not best_spec:
            best_spec = active_specializations[0]

    name = best_spec.name
    return {
        "department": name,
        "title": f"{name} Support",
        "subtitle": "Tailored Consultation Options",
        "approach": f"approaches rooted in {name.lower()}",
        "explanation": (
            f"Based on your responses, support focused on {name.lower()} is recommended for you. "
            f"We can help you connect with psychologists in this department."
        ),
        "nlp_matches": {name: list(set(best_matches))},
    }
