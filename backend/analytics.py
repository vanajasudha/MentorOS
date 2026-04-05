# backend/analytics.py
"""
Lightweight analytics module for tracking student learning behaviour.
Uses MongoDB exclusively for multi-user support.
"""

import os
from datetime import datetime
from typing import Optional
from db import get_collection

# ── Configurable Thresholds ──────────────────────────────────────────────────
ACCURACY_THRESHOLD = 60.0  # Accuracy below this % marks a topic as weak
ATTEMPT_THRESHOLD = 2      # Minimum attempts before marking as weak

# ── Public API ───────────────────────────────────────────────────────────────

def track_query(user_id: str, session_id: str, query: str, topic: Optional[str] = None, intent: Optional[str] = None):
    """Track a user query with user isolation."""
    queries_col = get_collection("queries")
    doc = {
        "user_id": user_id,
        "session_id": session_id,
        "query": query[:300],
        "topic": topic or "General",
        "intent": intent or "query",
        "timestamp": datetime.utcnow()
    }
    try:
        queries_col.insert_one(doc)
    except Exception as e:
        print(f"[Analytics] track_query mongo error: {e}")


def track_quiz_attempt(user_id: str, session_id: str, topic: str, score: float, total: int, correct: int):
    """Track a quiz completion with user isolation."""
    quiz_attempts_col = get_collection("quiz_attempts")
    accuracy = round((correct / total) * 100, 1) if total > 0 else 0
    doc = {
        "user_id": user_id,
        "session_id": session_id,
        "topic": topic,
        "score": round(score, 1),
        "correct": correct,
        "total": total,
        "accuracy": accuracy,
        "timestamp": datetime.utcnow()
    }
    try:
        quiz_attempts_col.insert_one(doc)
    except Exception as e:
        print(f"[Analytics] track_quiz_attempt mongo error: {e}")


def get_weak_topics(user_id: str) -> list[dict]:
    """
    Weak topic = avg_accuracy < 60% AND attempts >= 2
    Returns list of {topic, avg_accuracy, attempts} sorted worst-first.
    """
    quiz_attempts_col = get_collection("quiz_attempts")
    try:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$topic",
                "avg_accuracy": {"$avg": "$accuracy"},
                "attempts":     {"$sum": 1}
            }},
            {"$match": {"avg_accuracy": {"$lt": ACCURACY_THRESHOLD}, "attempts": {"$gte": ATTEMPT_THRESHOLD}}},
            {"$sort": {"avg_accuracy": 1}},
            {"$project": {"_id": 0, "topic": "$_id",
                           "avg_accuracy": {"$round": ["$avg_accuracy", 1]},
                           "attempts": 1}}
        ]
        return list(quiz_attempts_col.aggregate(pipeline))
    except Exception as e:
        print(f"[Analytics] get_weak_topics mongo error: {e}")
        return []


def get_topic_stats(user_id: str) -> list[dict]:
    """All topics with attempt count and accuracy for a specific user."""
    quiz_attempts_col = get_collection("quiz_attempts")
    try:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$topic",
                "avg_accuracy": {"$avg": "$accuracy"},
                "attempts":     {"$sum": 1},
                "best":         {"$max": "$accuracy"}
            }},
            {"$sort": {"avg_accuracy": 1}},
            {"$project": {"_id": 0, "topic": "$_id",
                           "avg_accuracy": {"$round": ["$avg_accuracy", 1]},
                           "best": {"$round": ["$best", 1]},
                           "attempts": 1}}
        ]
        return list(quiz_attempts_col.aggregate(pipeline))
    except Exception as e:
        print(f"[Analytics] get_topic_stats mongo error: {e}")
        return []
