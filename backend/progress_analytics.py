from typing import List, Dict, Any

from patterns import detect_learning_patterns
from prompts import performance_prediction_prompt, analytics_insights_prompt


def _activity_to_text(activity: List[Dict[str, Any]]) -> str:
    """Flatten recent activity into a short text summary for prompts."""
    if not activity:
        return "No activity recorded yet."

    lines = []
    for item in activity[-30:]:  # keep it small for slow hardware
        parts = []
        if "timestamp" in item:
            parts.append(str(item["timestamp"]))
        if "activity" in item:
            parts.append(str(item["activity"]))
        if "topic" in item:
            parts.append(f"topic={item['topic']}")
        if "score" in item and item["score"] is not None:
            parts.append(f"score={item['score']}")
        if "query" in item:
            parts.append(f"query={item['query']}")
        if "intent" in item:
            parts.append(f"intent={item['intent']}")
        if parts:
            lines.append(" | ".join(parts))
    return "\n".join(lines)


def generate_progress_insights(activity: List[Dict[str, Any]], llm) -> str:
    """
    High-level progress analytics:
    - Strong topics
    - Weak topics
    - Study habits
    - Recommendations
    """
    activity_text = _activity_to_text(activity)

    # Use existing pattern detector for a rich summary
    patterns_summary = detect_learning_patterns(activity_text, llm)

    prompt = analytics_insights_prompt(patterns_summary)
    return llm.invoke(prompt).content


def predict_performance(activity: List[Dict[str, Any]], llm) -> str:
    """
    Predict near-term performance and give guidance.
    """
    activity_text = _activity_to_text(activity)
    prompt = performance_prediction_prompt(activity_text)
    return llm.invoke(prompt).content

