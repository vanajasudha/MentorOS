"""
AI Mentor Router
This file routes user queries to the correct AI module.
"""

from query_demo import concept_module, load_vector_store, get_llm
from planner import generate_daily_plan, generate_learning_roadmap
from activity_logger import log_activity, get_recent_activity
from progress_analytics import generate_progress_report, predict_performance
from patterns import detect_weak_topics


# ----------------------------
# Intent Detection
# ----------------------------
def detect_intent(query: str, llm):
    """
    Classify user query into mentor tasks.
    """
    prompt = f"""
    You are an intent classifier for an AI learning mentor.

    Classify the query into ONE of these:
    concept, planning, quiz, motivation, roadmap,
    analytics, prediction, revision, general.

    Query: {query}

    Return only the label.
    """

    response = llm.invoke(prompt)
    return response.content.strip().lower()


# ----------------------------
# Adaptive Quiz Module
# ----------------------------
def quiz_module(activity, llm):
    weak_topics = detect_weak_topics(activity, llm)

    prompt = f"""
    Generate a personalized quiz focusing on these weak topics:

    {weak_topics}

    Adjust difficulty:
    - Easier if student struggles
    - Harder if improving

    Include explanations.
    """

    return llm.invoke(prompt).content


# ----------------------------
# Motivation Module
# ----------------------------
def motivation_module(activity, llm):
    prompt = f"""
    Encourage and motivate the student.

    Recent learning:
    {activity}

    Be positive, supportive, and practical.
    """
    return llm.invoke(prompt).content


# ----------------------------
# MAIN ROUTER FUNCTION
# ----------------------------
def handle_query(query: str, session_id: str = "default"):
    """
    Main entry point for AI mentor.
    """

    # Load models
    llm = get_llm()
    vectorstore = load_vector_store()

    # Detect intent
    intent = detect_intent(query, llm)

    # Get recent activity
    activity = get_recent_activity(session_id)

    # Log user query
    log_activity(session_id, {"type": "chat", "query": query})

    # ----------------------------
    # PLANNING
    # ----------------------------
    if intent == "planning":
        result = generate_daily_plan(activity, llm)
        log_activity(session_id, {"type": "plan", "content": result})
        return {"intent": intent, "result": result}

    # ----------------------------
    # ROADMAP
    # ----------------------------
    if intent == "roadmap":
        roadmap = generate_learning_roadmap(activity, llm)
        return {"intent": intent, "result": roadmap}

    # ----------------------------
    # QUIZ
    # ----------------------------
    if intent == "quiz":
        quiz = quiz_module(activity, llm)
        log_activity(session_id, {"type": "quiz_generated", "content": quiz})
        return {"intent": intent, "result": quiz}

    # ----------------------------
    # MOTIVATION
    # ----------------------------
    if intent == "motivation":
        msg = motivation_module(activity, llm)
        return {"intent": intent, "result": msg}

    # ----------------------------
    # ANALYTICS
    # ----------------------------
    if intent == "analytics":
        report = generate_progress_report(activity, llm)
        return {"intent": intent, "result": report}

    # ----------------------------
    # PERFORMANCE PREDICTION
    # ----------------------------
    if intent == "prediction":
        prediction = predict_performance(activity, llm)
        return {"intent": intent, "result": prediction}

    # ----------------------------
    # DEFAULT → RAG CONCEPT LEARNING
    # ----------------------------
    answer, source_docs = concept_module(query, activity, llm, vectorstore)

    # Log response
    log_activity(session_id, {"type": "response", "answer": answer})

    return {
        "intent": "concept",
        "result": answer,
        "sources": [doc.metadata.get("source", "Unknown") for doc in source_docs],
    }
