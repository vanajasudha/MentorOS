# backend/config.py
"""
Configuration file for AI Mentor backend
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Local Model Configuration (No API keys needed!)
# For Ollama LLM - make sure Ollama is installed and running
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")  # Change to mistral, llama3, etc.

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
CHUNK_DIR = DATA_DIR / "chunks"
VECTOR_STORE_PATH = DATA_DIR / "faiss_index"
SESSIONS_DIR = BASE_DIR / "sessions"
PROGRESS_DIR = BASE_DIR / "progress"

# Chunking parameters
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# API Settings
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8000))

# Create necessary directories
DATA_DIR.mkdir(exist_ok=True)
CHUNK_DIR.mkdir(exist_ok=True)
SESSIONS_DIR.mkdir(exist_ok=True)
PROGRESS_DIR.mkdir(exist_ok=True)

# Validation
print("✅ Using local models - no API keys needed!")
print("   - Embeddings: sentence-transformers/all-MiniLM-L6-v2 (runs locally)")
print("   - LLM: Ollama (make sure it's installed and running)")
print("   - Download Ollama from: https://ollama.ai")
print("   - Then run: ollama pull llama2")

