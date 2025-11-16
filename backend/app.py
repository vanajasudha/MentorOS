# backend/app.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import re
import asyncio
from pathlib import Path
from datetime import datetime
import PyPDF2
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import uuid

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Mentor API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
DATA_DIR = Path("backend/data")
CHUNK_DIR = DATA_DIR / "chunks"
VECTOR_STORE_PATH = DATA_DIR / "faiss_index"
SESSIONS_DIR = Path("backend/sessions")
PROGRESS_DIR = Path("backend/progress")

# Create directories
SESSIONS_DIR.mkdir(exist_ok=True)
PROGRESS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
CHUNK_DIR.mkdir(exist_ok=True)

# Store sessions in memory (in production, use Redis or database)
sessions = {}

def get_llm():
    """Get LLM instance (lazy initialization)."""
    # Use local Ollama LLM (no API needed!)
    # For slower systems, use smaller models like: llama3.2:1b, phi3:mini, or tinyllama
    # Faster models: llama3.2:1b (1.3GB), phi3:mini (2.3GB), tinyllama (637MB)
    # Slower but better: llama2 (3.8GB), llama3.2:3b (2GB), mistral (4.1GB)
    
    # Try smaller models first for speed, fallback to llama2 if not available
    model_priority = [
        "llama3.2:1b",      # Fastest, smallest (1.3GB) - Best for slow systems
        "phi3:mini",        # Fast, small (2.3GB)
        "tinyllama",        # Very fast, tiny (637MB) - Fastest option
        "llama3.2:3b",      # Medium speed (2GB)
        "llama2",           # Slower but good quality (3.8GB) - Fallback
    ]
    
    try:
        import requests
        # First check if Ollama is accessible
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=2)
            if response.status_code != 200:
                raise Exception(f"Ollama API returned status {response.status_code}")
            
            # Get available models
            available_models = []
            available_models_full = []
            if response.status_code == 200:
                models_data = response.json()
                for model in models_data.get("models", []):
                    model_name = model.get("name", "")
                    available_models_full.append(model_name)
                    # Also add base name (without tag)
                    base_name = model_name.split(":")[0]
                    if base_name not in available_models:
                        available_models.append(base_name)
        except requests.exceptions.RequestException as e:
            raise Exception(f"Could not connect to Ollama at http://localhost:11434. Make sure Ollama is running. Error: {e}")
        
        # Try to find the best available model
        model_to_use = None
        for model in model_priority:
            # Check if exact model name matches
            if model in available_models_full:
                model_to_use = model
                break
            # Check if base name matches (e.g., "llama3.2" matches "llama3.2:1b")
            model_base = model.split(":")[0]
            if model_base in available_models:
                # Try to find the exact variant
                for full_model in available_models_full:
                    if full_model.startswith(model_base + ":"):
                        model_to_use = full_model
                        break
                if model_to_use:
                    break
                # If no variant found, use the base name
                model_to_use = model_base
                break
        
        # Fallback to llama2 if nothing found
        if not model_to_use:
            model_to_use = "llama2"
            print(f"Warning: Using default model {model_to_use}. For faster responses, install a smaller model:")
            print(f"  ollama pull llama3.2:1b  # Fastest (1.3GB)")
            print(f"  ollama pull phi3:mini    # Fast (2.3GB)")
            print(f"  ollama pull tinyllama    # Very fast (637MB)")
        else:
            print(f"Using model: {model_to_use} for faster responses")
        
        return ChatOllama(
            model=model_to_use,
            temperature=0.7,
            base_url="http://localhost:11434",
            timeout=60.0,  # Increased timeout for slower systems
            num_ctx=2048,  # Reduced context window for faster processing
            num_predict=256,  # Limit response length for faster generation
        )
    except Exception as e:
        raise Exception(f"Could not connect to Ollama. Make sure Ollama is installed and running. Error: {e}")

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class QuizRequest(BaseModel):
    topic: str
    num_questions: int = 5
    session_id: Optional[str] = None

class SummaryRequest(BaseModel):
    topic: str
    session_id: Optional[str] = None

class ProgressUpdate(BaseModel):
    session_id: str
    topic: str
    score: Optional[float] = None
    activity: str

# Helper functions
def get_or_create_session(session_id: Optional[str] = None):
    """Get existing session or create new one."""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in sessions:
        sessions[session_id] = {
            "memory": ChatMessageHistory(),  # Simple chat history
            "created_at": datetime.now().isoformat(),
            "progress": []
        }
    
    return session_id, sessions[session_id]

def load_vector_store():
    """Load FAISS vector store."""
    if not VECTOR_STORE_PATH.exists():
        return None
    
    # Use local embeddings (no API needed!)
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    vectorstore = FAISS.load_local(
        str(VECTOR_STORE_PATH), 
        embeddings, 
        allow_dangerous_deserialization=True
    )
    return vectorstore

def save_session_to_disk(session_id: str, session_data: dict):
    """Save session data to disk for persistence."""
    session_file = SESSIONS_DIR / f"{session_id}.json"
    
    # Extract chat history from memory
    chat_history = []
    if "memory" in session_data and session_data["memory"]:
        for message in session_data["memory"].messages:
            role = "user" if "Human" in message.__class__.__name__ else "assistant"
            chat_history.append({
                "role": role,
                "content": message.content,
                "timestamp": getattr(message, "timestamp", datetime.now().isoformat())
            })
    
    data = {
        "created_at": session_data["created_at"],
        "progress": session_data["progress"],
        "chat_history": chat_history
    }
    
    with open(session_file, "w") as f:
        json.dump(data, f, indent=2)

def load_session_from_disk(session_id: str):
    """Load session data from disk."""
    session_file = SESSIONS_DIR / f"{session_id}.json"
    if session_file.exists():
        with open(session_file, "r") as f:
            data = json.load(f)
            # Restore chat history to memory
            if "chat_history" in data and data["chat_history"]:
                memory = ChatMessageHistory()
                from langchain_core.messages import HumanMessage, AIMessage
                for msg in data["chat_history"]:
                    if msg["role"] == "human":
                        memory.add_user_message(msg["content"])
                    elif msg["role"] == "ai":
                        memory.add_ai_message(msg["content"])
                data["memory"] = memory
            return data
    return None

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "AI Mentor API is running!",
        "endpoints": {
            "upload": "/upload-pdf",
            "query": "/query",
            "quiz": "/generate-quiz",
            "summary": "/generate-summary",
            "progress": "/progress",
            "session": "/session/{session_id}"
        }
    }

@app.get("/health")
async def health_check():
    """Check if Ollama is accessible."""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        ollama_status = "connected" if response.status_code == 200 else "error"
        return {
            "status": "ok",
            "ollama": ollama_status,
            "message": "Backend is running" + (" and Ollama is accessible" if ollama_status == "connected" else " but Ollama is not accessible")
        }
    except Exception as e:
        return {
            "status": "ok",
            "ollama": "disconnected",
            "message": f"Backend is running but Ollama is not accessible: {str(e)}"
    }

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF and process it for RAG."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Save PDF
        pdf_path = DATA_DIR / file.filename
        with open(pdf_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Extract text
        text = ""
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
        
        # Save as txt
        txt_path = pdf_path.with_suffix(".txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        # Create chunks using RecursiveCharacterTextSplitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        chunks = text_splitter.split_text(text)
        
        # Save chunks
        base_name = pdf_path.stem
        for i, chunk in enumerate(chunks, start=1):
            chunk_file = CHUNK_DIR / f"{base_name}_chunk{i}.txt"
            with open(chunk_file, "w", encoding="utf-8") as f:
                f.write(chunk)
        
        # Create embeddings and update vector store (using local embeddings)
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        documents = [Document(page_content=chunk, metadata={"source": base_name, "chunk": i}) 
                    for i, chunk in enumerate(chunks)]
        
        # Load existing vector store or create new one
        if VECTOR_STORE_PATH.exists():
            vectorstore = FAISS.load_local(
                str(VECTOR_STORE_PATH), 
                embeddings, 
                allow_dangerous_deserialization=True
            )
            vectorstore.add_documents(documents)
        else:
            vectorstore = FAISS.from_documents(documents, embeddings)
        
        # Save vector store
        VECTOR_STORE_PATH.mkdir(exist_ok=True)
        vectorstore.save_local(str(VECTOR_STORE_PATH))
        
        return {
            "message": "PDF uploaded and processed successfully",
            "filename": file.filename,
            "chunks_created": len(chunks),
            "text_length": len(text)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/query")
async def query_ai_mentor(request: QueryRequest):
    """Query the AI mentor with context from uploaded documents."""
    try:
        session_id, session = get_or_create_session(request.session_id)
        
        # Load vector store
        vectorstore = load_vector_store()
        
        if not vectorstore:
            # No documents uploaded yet, use basic conversation
            prompt = PromptTemplate(
                input_variables=["input"],
                template="""You are a helpful AI mentor for college students. 
                You help them understand concepts, provide summaries, and guide their learning.
                
                Student: {input}
                AI Mentor:"""
            )
            
            # Simple LLM call without memory for now
            llm_instance = get_llm()
            chain = prompt | llm_instance | StrOutputParser()
            # Add timeout wrapper for the LLM call (longer timeout for slower systems)
            import asyncio
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(chain.invoke, {"input": request.query}),
                    timeout=90.0  # 90 second timeout for slower systems
                )
            except asyncio.TimeoutError:
                raise Exception("LLM call timed out after 90 seconds. Consider using a smaller model: ollama pull llama3.2:1b")
        else:
            # Use RAG with uploaded documents
            qa_prompt = PromptTemplate(
                template="""You are an AI mentor helping a college student learn. 
                Use the following context from their course materials to answer their question.
                If you can provide examples or clarifications, please do so.
                If the context doesn't contain the answer, use your general knowledge but mention that.
                
                Context: {context}
                
                Question: {question}
                
                Helpful Answer:""",
                input_variables=["context", "question"]
            )
            
            # Create retriever
            retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
            
            # Format documents
            def format_docs(docs):
                return "\n\n".join(doc.page_content for doc in docs)
            
            # Create RAG chain using LangChain 1.0 style
            llm_instance = get_llm()
            rag_chain = (
                {"context": retriever | format_docs, "question": RunnablePassthrough()}
                | qa_prompt
                | llm_instance
                | StrOutputParser()
            )
            
            # Add timeout wrapper for the LLM call (longer timeout for slower systems)
            import asyncio
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(rag_chain.invoke, request.query),
                    timeout=90.0  # 90 second timeout for slower systems
                )
            except asyncio.TimeoutError:
                raise Exception("LLM call timed out after 90 seconds. Consider using a smaller model: ollama pull llama3.2:1b")
            
            # Store in memory
            from langchain_core.messages import HumanMessage, AIMessage
            session["memory"].add_user_message(request.query)
            session["memory"].add_ai_message(response)
        
        # Track progress
        session["progress"].append({
            "timestamp": datetime.now().isoformat(),
            "activity": "query",
            "query": request.query
        })
        
        # Save to disk
        save_session_to_disk(session_id, session)
        
        return {
            "response": response,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        import traceback
        error_details = str(e)
        traceback_str = traceback.format_exc()
        print(f"ERROR in query endpoint: {error_details}")
        print(f"Traceback: {traceback_str}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {error_details}")

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """Generate a mini-quiz on a specific topic."""
    try:
        session_id, session = get_or_create_session(request.session_id)
        
        # Load vector store for context
        vectorstore = load_vector_store()
        context = ""
        
        if vectorstore:
            docs = vectorstore.similarity_search(request.topic, k=3)
            context = "\n".join([doc.page_content for doc in docs])
        
        quiz_prompt = f"""You are a quiz generator. Generate EXACTLY {request.num_questions} multiple-choice questions about: {request.topic}

        ⚠️ CRITICAL REQUIREMENT: You MUST generate exactly {request.num_questions} questions. 
        - The JSON array must contain exactly {request.num_questions} question objects
        - Not {request.num_questions - 1} questions
        - Not {request.num_questions + 1} questions  
        - Exactly {request.num_questions} questions
        
        {"Context from uploaded documents: " + context[:500] if context else ""}
        
        JSON FORMAT RULES (MUST FOLLOW):
        1. Return ONLY a valid JSON array - no other text, no explanations, no markdown
        2. Start with [ and end with ]
        3. Escape all quotes inside strings using \\"
        4. Keep explanations short (1-2 sentences max)
        5. Use simple language - avoid complex punctuation
        6. Each question MUST have exactly 4 options (A, B, C, D)
        7. correct_answer MUST be exactly one letter in quotes: "A", "B", "C", or "D"
        8. Do NOT include any text before or after the JSON array
        
        REQUIRED FORMAT (generate exactly {request.num_questions} question objects):
        [
            {{
                "question": "First question text here?",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct_answer": "A",
                "explanation": "Brief explanation"
            }},
            {{
                "question": "Second question text here?",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct_answer": "B",
                "explanation": "Brief explanation"
            }},
            {{
                "question": "Third question text here?",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct_answer": "C",
                "explanation": "Brief explanation"
            }}
            ... (continue this pattern until you have exactly {request.num_questions} question objects in total)
        ]
        
        ⚠️ FINAL REMINDER: Generate exactly {request.num_questions} questions. Count them carefully. The array must have exactly {request.num_questions} objects. Return ONLY the JSON array, nothing else."""
        
        # Use LangChain 1.0 style with async timeout
        llm_instance = get_llm()
        
        # Wrap LLM call in async with timeout
        try:
            llm_response = await asyncio.wait_for(
                asyncio.to_thread(llm_instance.invoke, quiz_prompt),
                timeout=90.0  # 90 second timeout for slower systems
            )
            response = llm_response.content
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=500,
                detail="LLM call timed out after 90 seconds. Consider using a smaller model: ollama pull llama3.2:1b"
            )
        
        # Clean the response - remove markdown code blocks and extra text
        original_response = response
        print(f"DEBUG: Original LLM response (first 1000 chars): {original_response[:1000]}")
        
        # Remove markdown code blocks (```json ... ``` or ``` ... ```)
        cleaned = re.sub(r'```(?:json)?\s*\n?', '', response)
        cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()
        
        # Try multiple extraction strategies
        extracted_json = None
        
        # Strategy 1: Response already starts with [
        if cleaned.startswith('['):
            extracted_json = cleaned
        else:
            # Strategy 2: Remove text before the first [
            if '[' in cleaned:
                first_bracket = cleaned.find('[')
                extracted_json = cleaned[first_bracket:]
            else:
                # Strategy 3: Try to find JSON array pattern anywhere
                json_match = re.search(r'\[[\s\S]*?\]', cleaned, re.DOTALL)
                if json_match:
                    extracted_json = json_match.group(0)
        
        # If we found something, extract the complete JSON array
        if extracted_json:
            # Find the matching closing bracket to get complete array
            if extracted_json.startswith('['):
                bracket_count = 0
                end_pos = -1
                for i, char in enumerate(extracted_json):
                    if char == '[':
                        bracket_count += 1
                    elif char == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            end_pos = i + 1
                            break
                if end_pos > 0:
                    response = extracted_json[:end_pos].strip()
                else:
                    # No matching closing bracket found
                    response = extracted_json.strip()
            else:
                response = extracted_json.strip()
        else:
            # No JSON array found - try to parse as-is or return error
            response = cleaned.strip()
            if not response or len(response) < 10:
                raise ValueError(f"LLM response is empty or too short. Original response: {original_response[:200]}")
        
        print(f"DEBUG: Extracted JSON (first 500 chars): {response[:500]}")
        
        # Final check - ensure we have something that looks like JSON
        if not response or not (response.startswith('[') or response.startswith('{')):
            raise ValueError(f"Could not extract valid JSON from LLM response. Extracted: {response[:200]}")
        
        # Try to repair common JSON syntax errors
        def repair_json(json_str):
            """Attempt to fix common JSON syntax errors that LLMs sometimes produce."""
            repaired = json_str
            
            # 1. Remove trailing commas before closing brackets/braces
            repaired = re.sub(r',(\s*[}\]])', r'\1', repaired)
            
            # 2. Add missing commas between objects in arrays
            repaired = re.sub(r'\}\s*\{', r'}, {', repaired)
            
            # 3. Fix missing commas after closing braces before closing brackets
            repaired = re.sub(r'\}\s*\]', r'}]', repaired)
            
            # 4. CRITICAL: Fix unterminated correct_answer fields specifically
            # Pattern: "correct_answer": "  (missing closing quote and value)
            # This is a common error - correct_answer should be A, B, C, or D
            repaired = re.sub(
                r'"correct_answer"\s*:\s*"\s*([,\n}])',
                r'"correct_answer": "A"\1',
                repaired
            )
            # Pattern: "correct_answer": "A  (missing closing quote)
            repaired = re.sub(
                r'"correct_answer"\s*:\s*"([A-D])\s*([,\n}])',
                r'"correct_answer": "\1"\2',
                repaired
            )
            # Pattern: "correct_answer": "  (just quote, no value, followed by comma/brace)
            repaired = re.sub(
                r'"correct_answer"\s*:\s*"\s*"([,\n}])',
                r'"correct_answer": "A"\1',
                repaired
            )
            
            # 5. Try to fix other unterminated strings by finding and closing them
            # This is a heuristic approach - look for patterns like "text without closing quote
            lines = repaired.split('\n')
            fixed_lines = []
            in_string = False
            string_start_line = -1
            
            for line_idx, line in enumerate(lines):
                # Count unescaped quotes in this line
                unescaped_quotes = len(re.findall(r'(?<!\\)"', line))
                
                # Track if we're inside a string
                if in_string:
                    # We're continuing a string from previous line
                    if unescaped_quotes > 0:
                        # Found closing quote
                        in_string = False
                        string_start_line = -1
                else:
                    # Not in a string, check if this line starts one
                    if unescaped_quotes % 2 == 1:
                        # Odd number of quotes - string starts but doesn't end
                        in_string = True
                        string_start_line = line_idx
                
                # If we're at the end and still in a string, try to close it
                if in_string and (line_idx == len(lines) - 1 or 
                                 (line_idx < len(lines) - 1 and 
                                  (lines[line_idx + 1].strip().startswith('"') or 
                                   lines[line_idx + 1].strip().startswith('}') or
                                   lines[line_idx + 1].strip().startswith(']')))):
                    # Try to close the string before the next structural element
                    if not line.rstrip().endswith('"') and not line.rstrip().endswith('\\'):
                        # Find where the string value should end
                        # Look for patterns like: "key": "value that needs closing
                        if '":' in line:
                            colon_pos = line.find('":')
                            after_colon = line[colon_pos + 2:].strip()
                            if after_colon.startswith('"') and not after_colon.endswith('"'):
                                # This is a string value that needs closing
                                # Find where it should end (before comma, }, or end of line)
                                value_part = after_colon[1:]  # Skip opening quote
                                
                                # Special handling for correct_answer - should be single letter
                                if '"correct_answer"' in line[:colon_pos]:
                                    # For correct_answer, if we see a single letter, use it; otherwise default to A
                                    letter_match = re.search(r'([A-D])', value_part)
                                    if letter_match:
                                        letter = letter_match.group(1)
                                        # Close the string with the letter
                                        line = line[:colon_pos + 2 + 1] + letter + '"'
                                    else:
                                        # No letter found, default to A
                                        line = line[:colon_pos + 2 + 1] + 'A"'
                                    in_string = False
                                else:
                                    # For other fields, try to find a reasonable place to close
                                    for end_marker in [',', '}', '\n']:
                                        if end_marker in value_part:
                                            # Close before the marker
                                            marker_pos = value_part.find(end_marker)
                                            line = line[:colon_pos + 2 + 1] + value_part[:marker_pos] + '"' + value_part[marker_pos:]
                                            in_string = False
                                            break
                                    else:
                                        # No marker found, close at end of line
                                        line = line.rstrip() + '"'
                                        in_string = False
                
                fixed_lines.append(line)
            repaired = '\n'.join(fixed_lines)
            
            return repaired
        
        # Alternative: Try to extract valid questions from broken JSON using regex
        def extract_questions_from_text(text):
            """Fallback: Try to extract question objects using regex patterns."""
            questions = []
            # Pattern to match question objects
            # Look for question: "...", options: [...], correct_answer: "...", explanation: "..."
            pattern = r'"question"\s*:\s*"([^"]*(?:\\.[^"]*)*)"'
            question_matches = list(re.finditer(pattern, text))
            
            for i, q_match in enumerate(question_matches):
                try:
                    start_pos = q_match.start()
                    # Try to find the end of this question object (next } or end)
                    end_pos = text.find('}', start_pos)
                    if end_pos == -1:
                        end_pos = len(text)
                    
                    question_block = text[start_pos:end_pos+1]
                    # Try to extract fields using regex
                    question_text = q_match.group(1).replace('\\"', '"')
                    
                    # Extract options
                    options_match = re.search(r'"options"\s*:\s*\[(.*?)\]', question_block, re.DOTALL)
                    if not options_match:
                        continue
                    options_str = options_match.group(1)
                    options = []
                    for opt_match in re.finditer(r'"([^"]*(?:\\.[^"]*)*)"', options_str):
                        options.append(opt_match.group(1).replace('\\"', '"'))
                    
                    if len(options) < 2:
                        continue
                    
                    # Extract correct answer - handle unterminated strings
                    # Try strict match first
                    correct_match = re.search(r'"correct_answer"\s*:\s*"([A-D])"', question_block)
                    if not correct_match:
                        # Try to find unterminated correct_answer: "A or correct_answer: "A
                        correct_match = re.search(r'"correct_answer"\s*:\s*"([A-D])(?:\s*[,\n}])', question_block)
                        if not correct_match:
                            # Try to find just the pattern "correct_answer": " followed by A-D
                            correct_match = re.search(r'"correct_answer"\s*:\s*"([A-D])', question_block)
                            if not correct_match:
                                # Last resort: look for A-D near correct_answer
                                correct_match = re.search(r'"correct_answer"[^}]*?([A-D])(?:\s*[,\n}])', question_block)
                                if not correct_match:
                                    continue
                    correct_answer = correct_match.group(1).upper()
                    # Ensure it's valid
                    if correct_answer not in ['A', 'B', 'C', 'D']:
                        continue
                    
                    # Extract explanation (optional)
                    explanation_match = re.search(r'"explanation"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', question_block)
                    explanation = explanation_match.group(1).replace('\\"', '"') if explanation_match else ""
                    
                    questions.append({
                        "question": question_text,
                        "options": options,
                        "correct_answer": correct_answer,
                        "explanation": explanation
                    })
                except Exception as e:
                    print(f"DEBUG: Failed to extract question {i+1} from text: {e}")
                    continue
            
            return questions
        
        # Validate it's valid JSON before returning
        try:
            # Try to parse the JSON
            try:
                parsed = json.loads(response)
                print(f"DEBUG: Successfully parsed JSON on first attempt")
            except json.JSONDecodeError as e:
                print(f"DEBUG: Initial JSON parse failed: {e}")
                print(f"DEBUG: Attempting to repair JSON...")
                # Try to repair common issues
                repaired = repair_json(response)
                try:
                    parsed = json.loads(repaired)
                    print(f"DEBUG: Successfully parsed after repair")
                    response = repaired  # Update response to repaired version
                except json.JSONDecodeError as e2:
                    print(f"DEBUG: Repair attempt also failed: {e2}")
                    # Try fallback: extract questions using regex
                    print(f"DEBUG: Attempting fallback extraction using regex...")
                    try:
                        # Try extracting from original response first, then repaired
                        extracted_questions = extract_questions_from_text(original_response)
                        if len(extracted_questions) == 0:
                            extracted_questions = extract_questions_from_text(repaired)
                        
                        if len(extracted_questions) > 0:
                            print(f"DEBUG: Successfully extracted {len(extracted_questions)} questions using fallback method (requested {request.num_questions})")
                            parsed = extracted_questions
                        else:
                            # Re-raise the original error - we'll handle it below
                            raise e
                    except Exception as fallback_error:
                        print(f"DEBUG: Fallback extraction also failed: {fallback_error}")
                        # Re-raise the original error - we'll handle it below
                        raise e
            
            print(f"DEBUG: Successfully parsed JSON, type: {type(parsed)}, length: {len(parsed) if isinstance(parsed, list) else 'N/A'}")
            
            if not isinstance(parsed, list):
                parsed = [parsed]
            
            if len(parsed) == 0:
                raise ValueError("LLM returned an empty array. No questions were generated.")
            
            print(f"DEBUG: LLM generated {len(parsed)} questions (requested {request.num_questions})")
            if len(parsed) < request.num_questions:
                print(f"WARNING: LLM only generated {len(parsed)} questions, but {request.num_questions} were requested!")
            
            print(f"DEBUG: Starting validation of {len(parsed)} questions")
            
            # Validate each question has required fields and clean data
            seen_questions = set()
            valid_questions = []
            for i, q in enumerate(parsed):
                try:
                    if not isinstance(q, dict):
                        print(f"WARNING: Question {i+1} is not a valid object, skipping")
                        continue
                    if 'question' not in q or not q['question']:
                        print(f"WARNING: Question {i+1} missing 'question' field, skipping")
                        continue
                    if 'options' not in q or not isinstance(q['options'], list) or len(q['options']) < 2:
                        print(f"WARNING: Question {i+1} missing or invalid 'options' field, skipping")
                        continue
                    if 'correct_answer' not in q:
                        print(f"WARNING: Question {i+1} missing 'correct_answer' field, skipping")
                        continue
                    
                    # Clean question text
                    q['question'] = q['question'].strip()
                    if not q['question']:
                        print(f"WARNING: Question {i+1} has empty question text after cleaning, skipping")
                        continue
                    
                    # Check for duplicate questions
                    question_lower = q['question'].lower()
                    if question_lower in seen_questions:
                        print(f"WARNING: Question {i+1} is a duplicate, skipping")
                        continue
                    seen_questions.add(question_lower)
                    
                    # Clean options
                    if isinstance(q['options'], list):
                        q['options'] = [str(opt).strip() for opt in q['options'] if opt and str(opt).strip()]
                        if len(q['options']) < 2:
                            print(f"WARNING: Question {i+1} has less than 2 valid options after cleaning, skipping")
                            continue
                    
                    # Clean explanation
                    if 'explanation' in q:
                        q['explanation'] = str(q['explanation']).strip()
                    
                    # Validate correct_answer is valid
                    correct_ans = str(q['correct_answer']).strip().upper()
                    if correct_ans not in ['A', 'B', 'C', 'D']:
                        print(f"WARNING: Question {i+1} has invalid correct_answer: {correct_ans}, skipping")
                        continue
                    q['correct_answer'] = correct_ans
                    
                    # If we got here, the question is valid
                    valid_questions.append(q)
                    print(f"DEBUG: Question {i+1} validated successfully")
                except Exception as e:
                    print(f"WARNING: Error validating question {i+1}: {e}, skipping")
                    continue
            
            # Ensure we have at least one valid question
            if len(valid_questions) == 0:
                # Last resort: try to extract from original response using regex
                print(f"DEBUG: No valid questions after validation, trying last-resort extraction...")
                try:
                    extracted_questions = extract_questions_from_text(original_response)
                    if len(extracted_questions) > 0:
                        print(f"DEBUG: Last-resort extraction found {len(extracted_questions)} questions")
                        valid_questions = extracted_questions
                    else:
                        raise ValueError(f"No valid questions found after validation. Started with {len(parsed)} questions, but all were invalid (missing fields, duplicates, or invalid answers).")
                except Exception as e:
                    raise ValueError(f"No valid questions found after validation. Started with {len(parsed)} questions, but all were invalid (missing fields, duplicates, or invalid answers). Last-resort extraction also failed: {e}")
            
            # Check if we have fewer questions than requested
            if len(valid_questions) < request.num_questions:
                filtered_count = len(parsed) - len(valid_questions)
                print(f"WARNING: Generated {len(valid_questions)} valid questions, but {request.num_questions} were requested.")
                print(f"WARNING: LLM generated {len(parsed)} questions, but {filtered_count} were filtered out during validation.")
                print(f"WARNING: This may be because:")
                print(f"  - LLM generated fewer than {request.num_questions} questions ({len(parsed)} instead of {request.num_questions})")
                print(f"  - {filtered_count} questions were filtered out during validation (invalid format, duplicates, missing fields, etc.)")
                print(f"WARNING: Returning {len(valid_questions)} questions instead of {request.num_questions}")
                
                # If we have significantly fewer questions, try to be more lenient with validation
                if len(valid_questions) < request.num_questions and len(parsed) >= request.num_questions:
                    print(f"INFO: Attempting to recover filtered questions with more lenient validation...")
                    # Try to recover questions that were filtered out
                    recovered = []
                    for i, q in enumerate(parsed):
                        # Skip if already in valid_questions
                        if any(vq.get('question', '').lower() == q.get('question', '').lower() for vq in valid_questions):
                            continue
                        
                        # More lenient validation - try to fix common issues
                        try:
                            fixed_q = {}
                            
                            # Fix question field
                            if 'question' not in q or not q.get('question'):
                                continue  # Can't fix missing question
                            fixed_q['question'] = str(q['question']).strip()
                            if not fixed_q['question']:
                                continue
                            
                            # Fix options field
                            if 'options' not in q or not isinstance(q.get('options'), list):
                                continue  # Can't fix missing options
                            fixed_q['options'] = [str(opt).strip() for opt in q['options'] if opt and str(opt).strip()]
                            if len(fixed_q['options']) < 2:
                                # Try to pad with generic options if we have at least 1
                                if len(fixed_q['options']) == 1:
                                    fixed_q['options'].extend(['B) Option B', 'C) Option C', 'D) Option D'])
                                else:
                                    continue
                            # Ensure we have exactly 4 options
                            while len(fixed_q['options']) < 4:
                                letter = chr(65 + len(fixed_q['options']))
                                fixed_q['options'].append(f"{letter}) Option {letter}")
                            fixed_q['options'] = fixed_q['options'][:4]  # Trim to 4
                            
                            # Fix correct_answer field
                            if 'correct_answer' not in q:
                                fixed_q['correct_answer'] = 'A'  # Default to A
                            else:
                                correct_ans = str(q['correct_answer']).strip().upper()
                                # Try to extract letter from various formats
                                letter_match = re.search(r'([A-D])', correct_ans)
                                if letter_match:
                                    fixed_q['correct_answer'] = letter_match.group(1)
                                else:
                                    fixed_q['correct_answer'] = 'A'  # Default
                            
                            # Fix explanation field
                            fixed_q['explanation'] = str(q.get('explanation', 'No explanation provided')).strip()
                            
                            recovered.append(fixed_q)
                            print(f"INFO: Recovered question {len(valid_questions) + len(recovered)}: {fixed_q['question'][:50]}...")
                            
                            if len(valid_questions) + len(recovered) >= request.num_questions:
                                break
                        except Exception as e:
                            print(f"DEBUG: Could not recover question {i+1}: {e}")
                            continue
                    
                    if recovered:
                        valid_questions.extend(recovered[:request.num_questions - len(valid_questions)])
                        print(f"INFO: Recovered {len(recovered)} questions. Now have {len(valid_questions)} total questions.")
            
            # If we have more questions than requested, trim to requested number
            if len(valid_questions) > request.num_questions:
                print(f"INFO: Generated {len(valid_questions)} questions, but only {request.num_questions} were requested. Trimming to {request.num_questions}.")
                valid_questions = valid_questions[:request.num_questions]
            
            # Re-serialize to ensure clean JSON
            response = json.dumps(valid_questions, ensure_ascii=False)
            print(f"SUCCESS: Returning {len(valid_questions)} valid quiz questions (requested {request.num_questions}, started with {len(parsed)} from LLM)")
        except (json.JSONDecodeError, ValueError) as e:
            # Log the original response for debugging
            print(f"ERROR: Failed to parse quiz JSON")
            print(f"ERROR: Original response length: {len(original_response)} chars")
            print(f"ERROR: Original response (first 1000 chars): {original_response[:1000]}")
            print(f"ERROR: Extracted response length: {len(response)} chars")
            print(f"ERROR: Extracted response (first 500 chars): {response[:500]}")
            print(f"ERROR: Parse error: {str(e)}")
            print(f"ERROR: Error type: {type(e).__name__}")
            
            # Provide more helpful error message with location info
            error_detail = f"LLM returned invalid JSON format. Error: {str(e)}. "
            
            # Extract line/column info from error if available
            if hasattr(e, 'lineno') and hasattr(e, 'colno'):
                error_detail += f"Error at line {e.lineno}, column {e.colno}. "
                # Try to show the problematic line and surrounding context
                try:
                    lines = response.split('\n')
                    if e.lineno <= len(lines):
                        problem_line = lines[e.lineno - 1]
                        error_detail += f"Problematic line: {problem_line[:100]}. "
                        # Show context (previous and next lines)
                        if e.lineno > 1:
                            error_detail += f"Previous line: {lines[e.lineno - 2][:80]}. "
                        if e.lineno < len(lines):
                            error_detail += f"Next line: {lines[e.lineno][:80]}. "
                        
                        # Special handling for correct_answer errors
                        if '"correct_answer"' in problem_line:
                            error_detail += "Detected correct_answer field issue. Attempting automatic fix... "
                except:
                    pass
            
            if "Expecting value" in str(e) or "line 1" in str(e):
                error_detail += "The response may be empty or not start with valid JSON. "
            elif "delimiter" in str(e) or "Expecting" in str(e):
                error_detail += "There may be a missing comma, bracket, or quote. "
            
            error_detail += "Please try: 1) Regenerating the quiz, 2) Using a simpler topic, 3) Checking backend logs for the actual LLM response."
            
            # If JSON parsing fails, return error with helpful message
            raise HTTPException(
                status_code=500, 
                detail=error_detail
            )
        
        # Track progress
        session["progress"].append({
            "timestamp": datetime.now().isoformat(),
            "activity": "quiz_generated",
            "topic": request.topic,
            "num_questions": request.num_questions
        })
        
        return {
            "quiz": response,
            "session_id": session_id,
            "topic": request.topic
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

@app.post("/generate-summary")
async def generate_summary(request: SummaryRequest):
    """Generate an intelligent summary of a topic."""
    try:
        session_id, session = get_or_create_session(request.session_id)
        
        # Load vector store
        vectorstore = load_vector_store()
        
        if not vectorstore:
            raise HTTPException(status_code=400, detail="No documents uploaded yet")
        
        # Get relevant documents
        docs = vectorstore.similarity_search(request.topic, k=5)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        summary_prompt = f"""You are an AI mentor creating a comprehensive summary for a student.
        
        Topic: {request.topic}
        
        Course Material Context:
        {context}
        
        Create a clear, structured summary that includes:
        1. Key Concepts
        2. Important Details
        3. Examples (if available)
        4. How concepts relate to each other
        
        Make it easy to understand and study-friendly."""
        
        # Use LangChain 1.0 style
        llm_instance = get_llm()
        summary = llm_instance.invoke(summary_prompt).content
        
        # Track progress
        session["progress"].append({
            "timestamp": datetime.now().isoformat(),
            "activity": "summary_generated",
            "topic": request.topic
        })
        
        return {
            "summary": summary,
            "session_id": session_id,
            "topic": request.topic,
            "sources_used": len(docs)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.post("/progress")
async def update_progress(request: ProgressUpdate):
    """Update user progress."""
    try:
        session_id, session = get_or_create_session(request.session_id)
        
        progress_entry = {
            "timestamp": datetime.now().isoformat(),
            "activity": request.activity,
            "topic": request.topic,
            "score": request.score
        }
        
        session["progress"].append(progress_entry)
        save_session_to_disk(session_id, session)
        
        return {
            "message": "Progress updated",
            "session_id": session_id,
            "progress_entry": progress_entry
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating progress: {str(e)}")

@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session information and progress."""
    if session_id not in sessions:
        # Try to load from disk
        session_data = load_session_from_disk(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        # Restore to memory sessions
        sessions[session_id] = {
            "memory": session_data.get("memory", ChatMessageHistory()),
            "created_at": session_data["created_at"],
            "progress": session_data.get("progress", [])
        }
        session = sessions[session_id]
    else:
        session = sessions[session_id]
    
    # Extract chat messages
    chat_messages = []
    if session.get("memory"):
        for message in session["memory"].messages:
            chat_messages.append({
                "role": "user" if message.__class__.__name__ == "HumanMessage" else "assistant",
                "content": message.content,
                "timestamp": getattr(message, "timestamp", datetime.now().isoformat())
            })
    
    return {
        "session_id": session_id,
        "created_at": session["created_at"],
        "progress": session["progress"],
        "total_activities": len(session["progress"]),
        "chat_messages": chat_messages
    }

@app.get("/sessions")
async def list_sessions():
    """List all sessions (active and from disk)."""
    # Get all session files from disk
    session_files = list(SESSIONS_DIR.glob("*.json"))
    all_sessions = []
    
    # Add active sessions
    for session_id in sessions.keys():
        session = sessions[session_id]
        all_sessions.append({
            "session_id": session_id,
            "created_at": session["created_at"],
            "message_count": len(session.get("memory", ChatMessageHistory()).messages) if session.get("memory") else 0,
            "activity_count": len(session.get("progress", []))
        })
    
    # Add sessions from disk that aren't in memory
    for session_file in session_files:
        session_id = session_file.stem
        if session_id not in sessions:
            try:
                with open(session_file, "r") as f:
                    data = json.load(f)
                    all_sessions.append({
                        "session_id": session_id,
                        "created_at": data.get("created_at", ""),
                        "message_count": len(data.get("chat_history", [])),
                        "activity_count": len(data.get("progress", []))
                    })
            except:
                continue
    
    # Sort by created_at (newest first)
    all_sessions.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "sessions": all_sessions,
        "total": len(all_sessions)
    }

@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id in sessions:
        del sessions[session_id]
    
    session_file = SESSIONS_DIR / f"{session_id}.json"
    if session_file.exists():
        session_file.unlink()
    
    return {"message": "Session deleted", "session_id": session_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

