# backend/app.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import json
import re
import asyncio
import time
import uuid
import requests
import io
from pathlib import Path
from datetime import datetime
from bson import ObjectId

# Internal imports
from db import get_db, get_collection
from auth_utils import get_password_hash, verify_password, create_access_token, get_current_user_id
from analytics import track_query as _track_query, track_quiz_attempt as _track_quiz_attempt, get_weak_topics, get_topic_stats
from study_plan import build_study_plan, load_plan, mark_task_done, study_plan_prompt
from router import route_query
from activity_logger import log_activity, get_recent_activity
from progress_analytics import generate_progress_insights, predict_performance
from prompts import upload_summary_prompt, shadow_question_prompt, shadow_evaluate_prompt

# LangChain imports
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompt_values import PromptValue

# Optional dependencies
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    import easyocr
    ocr_reader = easyocr.Reader(['en'])
except Exception:
    ocr_reader = None

# Init FastAPI
app = FastAPI(title="MentorOS AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
DATA_DIR = Path("data")
VECTOR_BASE_PATH = DATA_DIR / "vectorstores"
CHUNK_DIR = DATA_DIR / "chunks"

DATA_DIR.mkdir(parents=True, exist_ok=True)
VECTOR_BASE_PATH.mkdir(parents=True, exist_ok=True)
CHUNK_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# LLM Logic
# ─────────────────────────────────────────────────────────────────────────────

def get_llm():
    """Get robust LLM (Groq primary, Ollama fallback)."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    primary_llm = None
    if groq_api_key and groq_api_key != "your_groq_api_key_here":
        try:
            primary_llm = ChatGroq(
                api_key=groq_api_key,
                model="llama-3.1-8b-instant",
                temperature=0.7,
            )
        except Exception: pass

    # Fallback Ollama
    fallback_llm = ChatOllama(
        model="llama3.2:1b",
        temperature=0.7,
        base_url="http://localhost:11434",
    )

    def robust_invoke(prompt):
        prompt_str = prompt.to_string() if isinstance(prompt, PromptValue) else str(prompt)
        try:
            if primary_llm:
                return primary_llm.invoke(prompt_str)
        except Exception:
            print("[LLM Fallback] Groq failed, trying Ollama...")
        return fallback_llm.invoke(prompt_str)

    return RunnableLambda(robust_invoke)

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    created_at: str

class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class QuizRequest(BaseModel):
    topic: str
    num_questions: int = 5
    session_id: Optional[str] = None
    difficulty: Optional[str] = None

class QuizSubmitRequest(BaseModel):
    session_id: str
    topic: str
    score: float
    total_questions: int
    answers: List[dict]

class URLRequest(BaseModel):
    url: str
    session_id: Optional[str] = None

class ShadowStartRequest(BaseModel):
    topic: Optional[str] = None
    level: str = "beginner"
    session_id: Optional[str] = None

class ShadowEvaluateRequest(BaseModel):
    session_id: str
    topic: str
    level: str
    answer: str

class MarkTaskRequest(BaseModel):
    day_num: int
    task_id: str

class SummaryRequest(BaseModel):
    topic: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions (User-Isolated)
# ─────────────────────────────────────────────────────────────────────────────

def get_or_create_session(user_id: str, session_id: Optional[str] = None):
    sessions_col = get_collection("chat_sessions")
    if session_id:
        try:
            session = sessions_col.find_one({"_id": ObjectId(session_id), "user_id": user_id})
            if session:
                return str(session["_id"])
        except: pass
    
    new_doc = {
        "user_id": user_id,
        "title": "New Chat",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "chat_history": [],
        "progress": []
    }
    res = sessions_col.insert_one(new_doc)
    return str(res.inserted_id)

def load_vector_store(user_id: str):
    user_path = VECTOR_BASE_PATH / user_id
    if not (user_path / "index.faiss").exists():
        return None
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return FAISS.load_local(str(user_path), embeddings, allow_dangerous_deserialization=True)

def process_and_embed_text(text: str, source_name: str, user_id: str):
    user_path = VECTOR_BASE_PATH / user_id
    user_path.mkdir(parents=True, exist_ok=True)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)
    docs = [Document(page_content=c, metadata={"source": source_name, "chunk": i}) for i, c in enumerate(chunks)]
    
    if (user_path / "index.faiss").exists():
        vs = FAISS.load_local(str(user_path), embeddings, allow_dangerous_deserialization=True)
        vs.add_documents(docs)
    else:
        vs = FAISS.from_documents(docs, embeddings)
    vs.save_local(str(user_path))
    return len(chunks)

def adaptive_difficulty(user_id: str, requested_diff: Optional[str] = None) -> str:
    if requested_diff in ["easy", "medium", "hard"]: return requested_diff
    recent = list(get_collection("quiz_attempts").find({"user_id": user_id}).sort("timestamp", -1).limit(3))
    if not recent: return "medium"
    avg = sum(r["accuracy"] for r in recent) / len(recent)
    if avg >= 80: return "hard"
    if avg <= 40: return "easy"
    return "medium"

# ─────────────────────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/auth/signup", response_model=Token)
async def signup(u: UserSignup):
    col = get_collection("users")
    if col.find_one({"email": u.email}): raise HTTPException(400, "Email exists")
    user_doc = {
        "name": u.name, "email": u.email,
        "password_hash": get_password_hash(u.password),
        "created_at": datetime.utcnow().isoformat()
    }
    uid = col.insert_one(user_doc).inserted_id
    return {"access_token": create_access_token({"sub": str(uid)}), "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(u: UserLogin):
    user = get_collection("users").find_one({"email": u.email})
    if not user or not verify_password(u.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_access_token({"sub": str(user["_id"])}), "token_type": "bearer"}

@app.get("/auth/me", response_model=UserProfile)
async def me(user_id: str = Depends(get_current_user_id)):
    u = get_collection("users").find_one({"_id": ObjectId(user_id)})
    return {"id": str(u["_id"]), "name": u["name"], "email": u["email"], "created_at": u["created_at"]}

# ─────────────────────────────────────────────────────────────────────────────
# Core API
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/query")
async def query(req: QueryRequest, user_id: str = Depends(get_current_user_id)):
    sid = get_or_create_session(user_id, req.session_id)
    vs = load_vector_store(user_id)
    llm = get_llm()
    
    routed = route_query(user_id, req.query, sid, llm, vs)
    
    # Persistent Chat History Update
    sessions_col = get_collection("chat_sessions")
    curr = sessions_col.find_one({"_id": ObjectId(sid)})
    
    updates = {
        "$push": {"chat_history": {"$each": [
            {"role": "user", "content": req.query, "timestamp": datetime.utcnow().isoformat()},
            {"role": "assistant", "content": routed["result"], "timestamp": datetime.utcnow().isoformat()}
        ]}},
        "$set": {"updated_at": datetime.utcnow().isoformat()}
    }

    # Auto-generate title if it's the first real message
    if curr and (not curr.get("chat_history") or curr.get("title") == "New Chat"):
        new_title = req.query[:40] + ("..." if len(req.query) > 40 else "")
        updates["$set"]["title"] = new_title

    sessions_col.update_one({"_id": ObjectId(sid)}, updates)
    
    _track_query(user_id, sid, req.query, routed.get("intent"))
    return {**routed, "session_id": sid}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), session_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    if not PyPDF2: raise HTTPException(500, "PyPDF2 missing")
    text = ""
    reader = PyPDF2.PdfReader(file.file)
    for p in reader.pages: text += p.extract_text() or ""
    
    count = process_and_embed_text(text, file.filename, user_id)
    get_collection("uploaded_materials").insert_one({
        "user_id": user_id, "file_name": file.filename, "type": "pdf", "created_at": datetime.utcnow().isoformat()
    })
    
    sid = get_or_create_session(user_id, session_id)
    llm = get_llm()
    summary = llm.invoke(upload_summary_prompt(file.filename, text)).content
    log_activity(user_id, sid, {"activity": "upload", "file": file.filename})

    return {"message": summary, "session_id": sid}

@app.post("/upload-url")
async def upload_url(req: URLRequest, user_id: str = Depends(get_current_user_id)):
    if not BeautifulSoup: raise HTTPException(500, "BeautifulSoup missing")
    try:
        res = requests.get(req.url, timeout=10)
        soup = BeautifulSoup(res.content, "html.parser")
        for s in soup(["script", "style"]): s.decompose()
        text = soup.get_text(separator=' ', strip=True)
        
        count = process_and_embed_text(text, req.url, user_id)
        get_collection("uploaded_materials").insert_one({
            "user_id": user_id, "file_name": req.url, "type": "url", "created_at": datetime.utcnow().isoformat()
        })
        
        sid = get_or_create_session(user_id, req.session_id)
        llm = get_llm()
        summary = llm.invoke(upload_summary_prompt(req.url, text[:2000])).content
        log_activity(user_id, sid, {"activity": "upload", "file": req.url})
        return {"message": summary, "session_id": sid}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...), session_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    if not ocr_reader: raise HTTPException(500, "OCR Reader not initialized")
    contents = await file.read()
    results = ocr_reader.readtext(contents)
    text = " ".join([r[1] for r in results])
    
    count = process_and_embed_text(text, file.filename, user_id)
    get_collection("uploaded_materials").insert_one({
        "user_id": user_id, "file_name": file.filename, "type": "image", "created_at": datetime.utcnow().isoformat()
    })
    
    sid = get_or_create_session(user_id, session_id)
    llm = get_llm()
    summary = llm.invoke(upload_summary_prompt(file.filename, text)).content
    log_activity(user_id, sid, {"activity": "upload", "file": file.filename})
    return {"message": summary, "session_id": sid}

@app.post("/generate-quiz")
async def quiz_gen(req: QuizRequest, user_id: str = Depends(get_current_user_id)):
    sid = get_or_create_session(user_id, req.session_id)
    diff = adaptive_difficulty(user_id, req.difficulty)
    vs = load_vector_store(user_id)
    context = ""
    source = "ai"
    
    if vs:
        docs = vs.similarity_search(req.topic, k=3)
        context = "\n".join([d.page_content for d in docs])
        if context.strip():
            source = "docs"
    
    from prompts import fallback_quiz_prompt
    if source == "docs":
        prompt = f"You are an AI tutor. Generate {req.num_questions} MCQs about {req.topic} using this context: {context[:1500]}. Difficulty: {diff}. Return JSON array only: [{{question, options:[], correct_answer:'A', explanation}}]"
    else:
        prompt = fallback_quiz_prompt(req.topic, req.num_questions, diff)

    llm = get_llm()
    resp = llm.invoke(prompt).content
    
    match = re.search(r"\[.*\]", resp, re.DOTALL)
    if not match: raise HTTPException(500, "LLM failed to generate valid JSON")
    try:
        data = json.loads(match.group(0))
        return {"quiz": data, "difficulty": diff, "session_id": sid, "source": source}
    except: raise HTTPException(500, "Parse error")

@app.post("/quiz/submit")
async def quiz_sub(req: QuizSubmitRequest, user_id: str = Depends(get_current_user_id)):
    acc = round((req.score / req.total_questions) * 100, 1) if req.total_questions > 0 else 0
    doc = {
        "user_id": user_id, "session_id": req.session_id, "topic": req.topic,
        "score": req.score, "total": req.total_questions, "accuracy": acc,
        "answers": req.answers, "timestamp": datetime.utcnow().isoformat()
    }
    res = get_collection("quiz_attempts").insert_one(doc)
    _track_quiz_attempt(user_id, req.session_id, req.topic, req.score, req.total_questions, int(req.score))
    log_activity(user_id, req.session_id, {
        "activity": "quiz_completed", 
        "topic": req.topic, 
        "score": acc,
        "attempt_id": str(res.inserted_id),
        "total": req.total_questions
    })
    return {"accuracy": acc}

@app.post("/generate-summary")
async def generate_summary(req: SummaryRequest, user_id: str = Depends(get_current_user_id)):
    # Check cache first
    summaries_col = get_collection("summaries")
    topic_key = req.topic.strip().lower() if req.topic else "general_summary"
    
    vs = load_vector_store(user_id)
    source = "docs" if vs else "ai"
    
    # Differentiate cache by source
    cache_id = f"{topic_key}_{source}"
    cached = summaries_col.find_one({"user_id": user_id, "topic_key": cache_id})
    if cached:
        return {"summary": cached["summary"], "cached": True, "source": source}

    context = ""
    if vs:
        query = req.topic if req.topic else "Give me a general overview of all materials."
        docs = vs.similarity_search(query, k=5)
        context = "\n---\n".join([d.page_content for d in docs])
        if not context.strip():
            source = "ai"

    llm = get_llm()
    from prompts import generate_summary_prompt, fallback_summary_prompt
    
    if source == "docs":
        prompt = generate_summary_prompt(context)
    else:
        prompt = fallback_summary_prompt(req.topic or "general topic")
    
    try:
        res = llm.invoke(prompt)
        summary_text = res.content if hasattr(res, 'content') else str(res)
        
        # Cache the result
        summaries_col.update_one(
            {"user_id": user_id, "topic_key": cache_id},
            {"$set": {
                "summary": summary_text,
                "topic": req.topic,
                "source": source,
                "created_at": datetime.utcnow().isoformat()
            }},
            upsert=True
        )
        
        return {"summary": summary_text, "cached": False, "source": source}
    except Exception as e:
        raise HTTPException(500, f"AI summary generation failed: {str(e)}")

@app.get("/quiz/history")
async def quiz_hist(user_id: str = Depends(get_current_user_id)):
    hist = list(get_collection("quiz_attempts").find({"user_id": user_id}).sort("timestamp", -1))
    return [{"id": str(h["_id"]), "topic": h["topic"], "accuracy": h["accuracy"], "timestamp": h["timestamp"]} for h in hist]

@app.get("/quiz/attempts/{aid}")
async def quiz_attempt_detail(aid: str, user_id: str = Depends(get_current_user_id)):
    try:
        a = get_collection("quiz_attempts").find_one({"_id": ObjectId(aid), "user_id": user_id})
        if not a: raise HTTPException(404, "Attempt not found")
        a["id"] = str(a.pop("_id"))
        return a
    except: raise HTTPException(400, "Invalid ID")

@app.get("/progress")
async def progress(user_id: str = Depends(get_current_user_id)):
    stats = get_topic_stats(user_id)
    sessions = list(get_collection("chat_sessions").find({"user_id": user_id}))
    activities = []
    for s in sessions: activities.extend(s.get("progress", []))
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return {"stats": stats, "recent": activities[:15]}

@app.get("/chat/sessions")
async def sessions_list(user_id: str = Depends(get_current_user_id)):
    s = list(get_collection("chat_sessions").find({"user_id": user_id}).sort("updated_at", -1))
    return [{"id": str(x["_id"]), "title": x["title"], "updated_at": x["updated_at"]} for x in s]

@app.get("/chat/sessions/{sid}")
async def session_detail(sid: str, user_id: str = Depends(get_current_user_id)):
    s = get_collection("chat_sessions").find_one({"_id": ObjectId(sid), "user_id": user_id})
    if not s: raise HTTPException(404)
    return {"id": str(s["_id"]), "title": s["title"], "history": s["chat_history"], "progress": s["progress"]}

@app.post("/chat/sessions")
async def create_session(user_id: str = Depends(get_current_user_id)):
    sid = get_or_create_session(user_id)
    return {"session_id": sid}

@app.delete("/chat/sessions/{sid}")
async def delete_session(sid: str, user_id: str = Depends(get_current_user_id)):
    try:
        res = get_collection("chat_sessions").delete_one({"_id": ObjectId(sid), "user_id": user_id})
        if res.deleted_count == 0: raise HTTPException(404)
        return {"message": "Deleted"}
    except: raise HTTPException(400)

@app.get("/materials")
async def materials(user_id: str = Depends(get_current_user_id)):
    m = list(get_collection("uploaded_materials").find({"user_id": user_id}).sort("created_at", -1))
    return [{"id": str(x["_id"]), "name": x["file_name"], "type": x["type"], "at": x["created_at"]} for x in m]

@app.get("/analytics/weak-topics")
async def weak(user_id: str = Depends(get_current_user_id)):
    return {"weak_topics": get_weak_topics(user_id)}

@app.get("/study-plan/current")
async def study_plan_get(user_id: str = Depends(get_current_user_id)):
    plan = load_plan(user_id)
    if not plan: return {"plan": None}
    return {"plan": plan}

@app.post("/study-plan/generate")
async def study_plan_gen(user_id: str = Depends(get_current_user_id)):
    weak_ts = get_weak_topics(user_id)
    stats = get_topic_stats(user_id)
    # Get last session id
    last_s = get_collection("chat_sessions").find_one({"user_id": user_id}, sort=[("updated_at", -1)])
    sid = str(last_s["_id"]) if last_s else "default"
    plan = build_study_plan(user_id, sid, weak_ts, stats)
    return {"plan": plan}

@app.patch("/study-plan/task")
async def study_plan_task_done(req: MarkTaskRequest, user_id: str = Depends(get_current_user_id)):
    try:
        from study_plan import mark_task_done
        plan = mark_task_done(user_id, req.day_num, req.task_id)
        return {"plan": plan}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.get("/study-plan/pending")
async def study_plan_pending(user_id: str = Depends(get_current_user_id)):
    from study_plan import get_pending_tasks
    p = get_pending_tasks(user_id)
    return {"pending": p}

@app.post("/shadow/start")
async def shad_start(req: ShadowStartRequest, user_id: str = Depends(get_current_user_id)):
    vs = load_vector_store(user_id)
    ctx = ""
    topic = req.topic or "any interesting topic"
    if vs:
        try:
            docs = vs.similarity_search(topic, k=2)
            ctx = "\n".join([d.page_content for d in docs])
        except:
            ctx = ""
    
    from prompts import student_persona_prompt
    persona = student_persona_prompt(topic, req.level, ctx)
    
    # Create new session for this mode to ensure separation
    sessions_col = get_collection("chat_sessions")
    new_sess = {
        "user_id": user_id,
        "title": f"Teaching: {topic} ({req.level})",
        "chat_history": [],
        "progress": [],
        "updated_at": datetime.utcnow().isoformat()
    }
    res = sessions_col.insert_one(new_sess)
    sid = str(res.inserted_id)
    
    greeting = f"Hi! I'm really curious to learn about {topic}. I don't know much about it yet. Can you teach me?"
    
    # Save the greeting to the new session
    sessions_col.update_one(
        {"_id": ObjectId(sid)},
        {"$push": {"chat_history": {"role": "assistant", "content": greeting, "timestamp": datetime.utcnow().isoformat()}}}
    )
    
    log_activity(user_id, sid, {"activity": "start_teaching", "topic": topic})
    return {"question": greeting, "session_id": sid, "persona": persona}

@app.post("/shadow/evaluate")
async def shad_eval(req: ShadowEvaluateRequest, user_id: str = Depends(get_current_user_id)):
    # This is now the conversational roleplay endpoint for student mode
    sessions_col = get_collection("chat_sessions")
    s = sessions_col.find_one({"_id": ObjectId(req.session_id), "user_id": user_id})
    if not s: raise HTTPException(404, "Session not found")
    
    history = s.get("chat_history", [])
    
    vs = load_vector_store(user_id)
    ctx = ""
    if vs:
        try:
            docs = vs.similarity_search(req.topic, k=2)
            ctx = "\n".join([d.page_content for d in docs])
        except:
            ctx = ""
        
    from prompts import student_persona_prompt
    persona = student_persona_prompt(req.topic, req.level, ctx)
    
    history_str = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-6:]])
    
    prompt = f"""
{persona}

Current conversation history:
{history_str}

The teacher says: "{req.answer}"

Respond as the student. Stay in character. Keep your response very short (1-2 sentences). 
Ask a follow-up question or share a doubt like a confused student.
"""
    llm = get_llm()
    student_response = llm.invoke(prompt).content
    
    # Save to history
    now = datetime.utcnow().isoformat()
    sessions_col.update_one(
        {"_id": ObjectId(req.session_id)},
        {"$push": {"chat_history": {"$each": [
            {"role": "user", "content": req.answer, "timestamp": now},
            {"role": "assistant", "content": student_response, "timestamp": now}
        ]}}, "$set": {"updated_at": now}}
    )
    
    return {"evaluation": student_response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
