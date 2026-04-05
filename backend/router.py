from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from activity_logger import log_activity, get_recent_activity
from planner import generate_daily_plan, generate_learning_roadmap
from patterns import detect_weak_topics, detect_learning_patterns
from progress_analytics import generate_progress_insights, predict_performance
from prompts import (
    intent_detection_prompt,
    concept_explanation_prompt,
    adaptive_quiz_prompt,
)
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

INTENT_FALLBACK = "concept"

def _safe_llm_invoke(llm, prompt: str) -> str:
    """Call llm.invoke(prompt) and normalize to string."""
    try:
        resp = llm.invoke(prompt)
        return getattr(resp, "content", resp)
    except Exception as e:
        return f"Sorry, I had an internal error while thinking about this: {e}"

def detect_intent(query: str, llm) -> str:
    """Detect high-level intent using a central prompt."""
    prompt = intent_detection_prompt(query)
    label = _safe_llm_invoke(llm, prompt).strip().lower()
    allowed = {"concept", "planning", "quiz", "revision", "motivation", "roadmap", "analytics", "prediction", "general"}
    if label not in allowed:
        first = label.split()[0]
        label = first if first in allowed else INTENT_FALLBACK
    return label

def _summarize_activity_text(user_id: str, session_id: str) -> str:
    """Convert recent MongoDB activity into text for prompts."""
    recent = get_recent_activity(user_id, session_id)
    if not recent:
        return "No prior activity recorded for this student."
    lines = []
    for item in recent[-15:]:
        parts = []
        for key in ["activity", "topic", "score", "query", "intent"]:
            if key in item and item[key] is not None:
                parts.append(f"{key}={item[key]}")
        if parts:
            lines.append(" | ".join(parts))
    return "\n".join(lines) if lines else "Recent activity exists but is sparse."

def _concept_with_rag(user_id: str, query: str, session_id: str, llm, vectorstore) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    activity_text = _summarize_activity_text(user_id, session_id)
    weak_topics_raw = detect_weak_topics(activity_text, llm)
    weak_topics = weak_topics_raw.strip()
    docs = []
    context_text = ""
    if vectorstore is not None:
        retrieval_query = query
        if weak_topics:
            retrieval_query = f"{query}\n\nFocus on these weaker areas: {weak_topics}"
        docs_with_scores = vectorstore.similarity_search_with_score(retrieval_query, k=3)
        DISTANCE_THRESHOLD = 1.35
        valid_docs = [doc for doc, score in docs_with_scores if score <= DISTANCE_THRESHOLD]
        if valid_docs:
            context_text = "\n\n".join(doc.page_content for doc in valid_docs)
            docs = valid_docs
        else:
            context_text = "No relevant context found in course notes. Use general knowledge to answer."
            docs = []
        qa_prompt = PromptTemplate(template="{context}", input_variables=["context"])
        full_prompt_text = concept_explanation_prompt(context=context_text, question=query, recent_activity=activity_text, weak_topics=weak_topics)
        rag_chain = (RunnablePassthrough() | qa_prompt | llm | StrOutputParser())
        answer = rag_chain.invoke({"context": full_prompt_text})
    else:
        full_prompt_text = concept_explanation_prompt(context="", question=query, recent_activity=activity_text, weak_topics=weak_topics)
        answer = _safe_llm_invoke(llm, full_prompt_text)
    source_summaries = [{"source": d.metadata.get("source"), "chunk": d.metadata.get("chunk")} for d in docs]
    return answer, source_summaries, weak_topics or None

def _adaptive_quiz(user_id: str, session_id: str, llm) -> str:
    activity_text = _summarize_activity_text(user_id, session_id)
    weak_topics = detect_weak_topics(activity_text, llm).strip()
    if not weak_topics:
        weak_topics = "recently asked topics and any unclear concepts"
    prompt = adaptive_quiz_prompt(weak_topics=weak_topics, activity=activity_text)
    return _safe_llm_invoke(llm, prompt)

def _motivation(user_id: str, session_id: str, llm) -> str:
    activity_text = _summarize_activity_text(user_id, session_id)
    prompt = (
        "You are a kind, practical study coach.\n\n"
        f"Student's recent activity:\n{activity_text}\n\n"
        "In 3–5 short bullet points:\n- Acknowledge effort\n- Normalize struggles\n- 2–3 concrete actions\n- Motivating line."
    )
    return _safe_llm_invoke(llm, prompt)

def route_query(user_id: str, query: str, session_id: str, llm, vectorstore) -> Dict[str, Any]:
    intent = detect_intent(query, llm)
    log_activity(user_id, session_id, {"activity": "chat", "query": query, "intent": intent})
    source_docs = []
    insights = None
    if intent == "planning":
        recent = get_recent_activity(user_id, session_id)
        result = generate_daily_plan(recent, llm)
        log_activity(user_id, session_id, {"activity": "plan_generated", "content": result})
    elif intent == "roadmap":
        recent = get_recent_activity(user_id, session_id)
        result = generate_learning_roadmap(recent, llm)
        log_activity(user_id, session_id, {"activity": "roadmap_generated", "content": result})
    elif intent == "quiz":
        result = _adaptive_quiz(user_id, session_id, llm)
        log_activity(user_id, session_id, {"activity": "quiz_generated_text", "content": result})
    elif intent in {"analytics", "revision"}:
        recent = get_recent_activity(user_id, session_id)
        result = generate_progress_insights(recent, llm)
        log_activity(user_id, session_id, {"activity": "analytics_generated", "content": result})
    elif intent == "prediction":
        recent = get_recent_activity(user_id, session_id)
        result = predict_performance(recent, llm)
        log_activity(user_id, session_id, {"activity": "prediction_generated", "content": result})
    elif intent == "motivation":
        result = _motivation(user_id, session_id, llm)
        log_activity(user_id, session_id, {"activity": "motivation", "content": result})
    else:
        result, source_docs, weak_topics = _concept_with_rag(user_id, query, session_id, llm, vectorstore)
        if weak_topics: insights = f"Weak topics I focused on: {weak_topics}"
        log_activity(user_id, session_id, {"activity": "concept_explained", "answer": result, "intent": intent})
    return {"intent": intent, "result": result, "insights": insights, "source_documents": source_docs}
