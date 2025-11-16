from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from pathlib import Path
import os

CHUNK_DIR = Path("backend/data/chunks")
VECTOR_STORE_PATH = Path("backend/data/faiss_index")

# Load local embeddings (no API needed!)
# Using all-MiniLM-L6-v2 - a lightweight, fast model that runs locally
print("Loading local embedding model (this may take a moment on first run)...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'},  # Use CPU (change to 'cuda' if you have GPU)
    encode_kwargs={'normalize_embeddings': True}
)
print("Embedding model loaded!")

# Gather chunks
chunk_files = list(CHUNK_DIR.glob("*.txt"))
documents = []

for file in chunk_files:
    text = file.read_text(encoding="utf-8")
    doc = Document(page_content=text, metadata={"source": file.name})
    documents.append(doc)

# Create FAISS vector store
vectorstore = FAISS.from_documents(documents, embeddings)

# Save vector store
VECTOR_STORE_PATH.mkdir(exist_ok=True)
vectorstore.save_local(str(VECTOR_STORE_PATH))

print(f"Indexed {len(documents)} chunks and saved vector store to {VECTOR_STORE_PATH}")
