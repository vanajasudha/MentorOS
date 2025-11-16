# 🚀 Local Setup Guide (No API Required!)

This project now runs **completely locally** without any API calls! No Google API, no OpenAI API - everything runs on your computer.

## 📋 Prerequisites

1. **Python 3.10+** installed
2. **Ollama** installed (for local LLM)
   - Download from: https://ollama.ai
   - Install and make sure it's running

## 🔧 Step-by-Step Setup

### Step 1: Install Ollama

1. Go to https://ollama.ai
2. Download and install Ollama for your operating system
3. After installation, Ollama should start automatically

### Step 2: Download a Language Model

Open a terminal and run one of these commands:

```bash
# Option 1: Llama 2 (7B parameters, ~4GB)
ollama pull llama2

# Option 2: Mistral (7B parameters, ~4GB, often better quality)
ollama pull mistral

# Option 3: Llama 3 (8B parameters, ~4.7GB, newer)
ollama pull llama3

# Option 4: Smaller model if you have limited RAM (3B parameters, ~2GB)
ollama pull phi
```

**Recommendation:** Start with `mistral` or `llama3` for best quality, or `phi` if you have limited RAM.

### Step 3: Verify Ollama is Running

```bash
# Check if Ollama is running
ollama list

# Test it
ollama run llama2 "Hello, how are you?"
```

### Step 4: Install Python Dependencies

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# or
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r backend/requirements.txt
```

**Note:** The first time you run this, it will download the embedding model (~90MB). This only happens once.

### Step 5: Process Your Documents

```bash
# This will create embeddings using the local model
python backend/embed_and_index.py
```

This step:
- Uses **sentence-transformers** (runs locally, no API)
- Creates embeddings for all your document chunks
- Saves them to the FAISS vector store

### Step 6: Test the Query Demo

```bash
python backend/query_demo.py
```

## 🎯 How It Works

### Local Embeddings
- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Size:** ~90MB (downloads automatically on first use)
- **Speed:** Fast, runs on CPU
- **Quality:** Good for semantic search

### Local LLM (Ollama)
- **Models:** Llama2, Mistral, Llama3, Phi, etc.
- **Runs:** Completely on your computer
- **No Internet:** Required after initial download
- **Privacy:** All data stays on your machine

## 🔄 Changing the LLM Model

If you want to use a different model, update these files:

1. **backend/query_demo.py** - Change `model="llama2"` to your model
2. **backend/app.py** - Change `model="llama2"` to your model
3. **backend/config.py** - Change `OLLAMA_MODEL = "llama2"` to your model

Or set environment variable:
```bash
export OLLAMA_MODEL=mistral  # Mac/Linux
set OLLAMA_MODEL=mistral     # Windows
```

## ⚙️ Configuration

You can customize settings in `backend/config.py`:

```python
OLLAMA_BASE_URL = "http://localhost:11434"  # Ollama server URL
OLLAMA_MODEL = "llama2"  # Model to use
```

## 🐛 Troubleshooting

### Ollama not found
- Make sure Ollama is installed and running
- Check: `ollama list` should work
- On Windows, make sure Ollama is in your PATH

### Model not found
- Download the model: `ollama pull llama2`
- Check available models: `ollama list`
- Make sure the model name matches in the code

### Slow performance
- Use a smaller model (e.g., `phi` instead of `llama3`)
- Close other applications to free up RAM
- Consider using GPU if available (requires CUDA setup)

### Out of memory
- Use a smaller model: `ollama pull phi`
- Reduce chunk size in `backend/config.py`
- Close other applications

## 📊 Model Comparison

| Model | Size | RAM Needed | Quality | Speed |
|-------|------|------------|---------|-------|
| phi | ~2GB | 4GB | Good | Fast |
| llama2 | ~4GB | 8GB | Very Good | Medium |
| mistral | ~4GB | 8GB | Excellent | Medium |
| llama3 | ~4.7GB | 10GB | Excellent | Medium |

## ✅ Benefits of Local Setup

- ✅ **No API costs** - Completely free
- ✅ **No rate limits** - Use as much as you want
- ✅ **Privacy** - All data stays on your computer
- ✅ **Works offline** - No internet needed after setup
- ✅ **No API keys** - No configuration needed

## 🎉 You're All Set!

Your AI Mentor now runs completely locally. No APIs, no restrictions, no costs!


