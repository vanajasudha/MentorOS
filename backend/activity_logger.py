# backend/activity_logger.py
"""
Activity logger for MentorOS.
Stores user activities in MongoDB under chat_sessions.progress and a dedicated activity_logs collection if needed.
"""

from datetime import datetime
from db import get_collection
from bson import ObjectId

def log_activity(user_id: str, session_id: str, activity: dict):
    """Store activity like chat, quiz, topic in the session's progress list."""
    sessions_col = get_collection("chat_sessions")
    
    activity_entry = activity.copy()
    if "timestamp" not in activity_entry:
        activity_entry["timestamp"] = datetime.now().isoformat()
    
    try:
        sessions_col.update_one(
            {"_id": ObjectId(session_id), "user_id": user_id},
            {"$push": {"progress": activity_entry}, "$set": {"updated_at": datetime.now().isoformat()}}
        )
    except Exception as e:
        print(f"[ActivityLogger] Error logging activity: {e}")


def get_recent_activity(user_id: str, session_id: str, k: int = 15):
    """Get last k activities from the session progress."""
    sessions_col = get_collection("chat_sessions")
    try:
        session = sessions_col.find_one({"_id": ObjectId(session_id), "user_id": user_id})
        if session and "progress" in session:
            return session["progress"][-k:]
    except Exception as e:
        print(f"[ActivityLogger] Error fetching activity: {e}")
    return []