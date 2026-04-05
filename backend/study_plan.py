# backend/study_plan.py
"""
Personalized study plan generator for MentorOS.
Fully multi-user isolated via MongoDB.
"""

import json
import uuid
from datetime import datetime, date, timedelta
from typing import Optional
from db import get_collection


# ── Rule-based scheduler ─────────────────────────────────────────────────────

def build_study_plan(
    user_id: str,
    session_id: str,
    weak_topics: list[dict],
    topic_stats: list[dict],
    num_days: int = 7
) -> dict:
    today = date.today()
    days = []

    # Priority queue: worst topics first
    priority = sorted(weak_topics, key=lambda x: x["avg_accuracy"])

    # Map of daily structure
    for i in range(1, num_days + 1):
        day_date = today + timedelta(days=i - 1)
        tasks = []
        
        # Rule-based task distribution
        # Phase 1: Prioritize weak topics
        if i <= len(priority):
            wt = priority[i-1]
            topic = wt["topic"]
            tasks.append({"id": str(uuid.uuid4()), "title": f"Study {topic} — explain concepts", "completed": False, "type": "learn"})
            tasks.append({"id": str(uuid.uuid4()), "title": f"Take a practice quiz on {topic}",     "completed": False, "type": "quiz"})
        else:
            # Phase 2: Review stronger topics or free practice
            strong = [t for t in topic_stats if t["avg_accuracy"] >= 60]
            if strong:
                st = strong[(i - len(priority) - 1) % len(strong)]
                tasks.append({"id": str(uuid.uuid4()), "title": f"Quick review of {st['topic']}", "completed": False, "type": "revise"})
            else:
                tasks.append({"id": str(uuid.uuid4()), "title": "Free practice — ask any concept", "completed": False, "type": "rest"})

        days.append({
            "day": i,
            "date": day_date.isoformat(),
            "tasks": tasks
        })

    plan = {
        "user_id": user_id,
        "plan_id": str(uuid.uuid4()),
        "generated_at": datetime.now().isoformat(),
        "num_days": len(days),
        "days": days
    }
    _save_plan(user_id, plan)
    return plan

# ── Persistence ──────────────────────────────────────────────────────────────


# ── Persistence ──────────────────────────────────────────────────────────────

def _save_plan(user_id: str, plan: dict):
    study_plans_col = get_collection("study_plans")
    try:
        study_plans_col.update_one(
            {"user_id": user_id},
            {"$set": plan},
            upsert=True
        )
    except Exception as e:
        print(f"[StudyPlan] Mongo error saving plan: {e}")


def load_plan(user_id: str) -> Optional[dict]:
    study_plans_col = get_collection("study_plans")
    try:
        return study_plans_col.find_one({"user_id": user_id}, {"_id": 0})
    except Exception as e:
        print(f"[StudyPlan] Mongo error loading plan: {e}")
    return None


def mark_task_done(user_id: str, day_num: int, task_id: str) -> dict:
    """Mark a specific task as completed or toggle it. Returns updated plan."""
    plan = load_plan(user_id)
    if not plan:
        raise ValueError("No study plan found")
    
    for day in plan["days"]:
        if day["day"] == day_num:
            for task in day["tasks"]:
                if task["id"] == task_id:
                    task["completed"] = not task.get("completed", False)
                    task["completed_at"] = datetime.now().isoformat() if task["completed"] else None
                    break
            break
    _save_plan(user_id, plan)
    return plan


def get_pending_tasks(user_id: str) -> list[dict]:
    """Fetch all pending tasks that were due today or earlier."""
    plan = load_plan(user_id)
    if not plan: return []
    
    today = date.today()
    pending = []
    for day in plan["days"]:
        day_date = date.fromisoformat(day["date"])
        if day_date <= today:
            for task in day["tasks"]:
                if not task.get("completed", False):
                    pending.append({
                        "id": task["id"],
                        "day_num": day["day"],
                        "text": task.get("title", task.get("text", "")),
                        "date": day["date"]
                    })
    return pending


# ── LLM prompt template ──────────────────────────────────────────────────────

def study_plan_prompt(weak_topics: list[str], quiz_stats: list[dict], activity_summary: str) -> str:
    weak_str = ", ".join(weak_topics) if weak_topics else "none identified yet"
    stats_str = "\n".join(
        f"- {s['topic']}: {s['avg_accuracy']}% avg accuracy over {s['attempts']} attempt(s)"
        for s in quiz_stats[:6]
    ) if quiz_stats else "No quiz data yet."

    return f"""You are a personalized AI study coach. Based on the student's learning data, create a brief, encouraging weekly study plan.

STUDENT DATA:
Weak Topics (need attention): {weak_str}
Quiz Performance:
{stats_str}
Recent Activity Summary: {activity_summary or 'Student has been studying using the AI mentor.'}

INSTRUCTIONS:
1. Acknowledge the student's current performance warmly.
2. For each weak topic, give ONE specific study tip (not just "study more").
3. Recommend a realistic daily structure (e.g., 30-45 mins/day).
4. Keep it motivating and actionable.
5. Format as plain text, no JSON, no markdown headers.

Write the study plan now:"""
