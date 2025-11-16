# 🚀 Quick Setup Guide for AI Mentor

Follow these steps to get your AI Mentor up and running in minutes!

## 📋 Prerequisites Checklist

- [ ] Python 3.10 or higher installed
- [ ] Node.js 18 or higher installed
- [ ] OpenAI API account and API key
- [ ] Basic command line knowledge

## 🔧 Step-by-Step Setup

### Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again!)
5. **Important**: Keep this key secure and never share it

### Step 2: Set Up the Backend

```bash
# Open terminal in the project directory
cd ai_mentor

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 3: Configure Environment

Create a file named `.env` in the `backend/` folder:

```
# backend/.env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Replace** `sk-your-actual-api-key-here` with your real API key!

### Step 4: Process Existing Course Materials (Optional)

If you have PDFs in `backend/data/`, process them now:

```bash
# Step 1: Extract text from PDFs
python backend/ingest.py

# Step 2: Create chunks
python backend/chunker.py

# Step 3: Generate embeddings and create vector store
python backend/embed_and_index.py
```

**Note**: This step requires your OpenAI API key to work. It will use API credits to generate embeddings.

### Step 5: Start the Backend Server

```bash
# Make sure you're in the project root and venv is activated
uvicorn backend.app:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Keep this terminal open!** The backend needs to stay running.

### Step 6: Set Up the Frontend

Open a **NEW** terminal window:

```bash
# Navigate to frontend directory
cd ai_mentor/frontend

# Install dependencies (this might take a few minutes)
npm install

# Start the development server
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

### Step 7: Open the Application

Your browser should automatically open to http://localhost:3000

If not, manually open your browser and go to:
- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs

## ✅ Verify Everything Works

### Test 1: Check Backend Connection
- Look at the top-right of the webpage
- You should see a green dot with "Connected"
- If it's red, check that the backend is running

### Test 2: Upload a PDF
1. Click the "Upload" tab
2. Drop a PDF or click to select one
3. Click "Upload & Process"
4. Wait for "Successfully uploaded" message

### Test 3: Ask a Question
1. Click the "Chat" tab
2. Type a question like "What is this course about?"
3. Press Enter
4. You should get a response from the AI

### Test 4: Generate a Quiz
1. Click "Study Tools" tab
2. Enter a topic from your course
3. Click "Generate Quiz"
4. Answer the questions

## 🐛 Common Issues and Solutions

### Issue: "Module not found" error (Python)
**Solution**: Make sure virtual environment is activated and run:
```bash
pip install -r backend/requirements.txt
```

### Issue: "Cannot find module" error (Node.js)
**Solution**: Delete node_modules and reinstall:
```bash
cd frontend
rm -rf node_modules
npm install
```

### Issue: Backend shows "Disconnected"
**Solutions**:
1. Check if backend terminal is still running
2. Restart backend: `uvicorn backend.app:app --reload`
3. Check if port 8000 is available

### Issue: "OpenAI API error" or "Invalid API key"
**Solutions**:
1. Verify `.env` file exists in `backend/` folder
2. Check that API key is correct (starts with `sk-`)
3. Ensure you have credits in your OpenAI account
4. Restart the backend after adding the `.env` file

### Issue: "Vector store not found"
**Solution**: Run the processing steps:
```bash
python backend/ingest.py
python backend/chunker.py
python backend/embed_and_index.py
```

### Issue: Port already in use
**Solutions**:
- For backend (port 8000): Kill the process using port 8000 or change port in command
- For frontend (port 3000): Kill the process or edit `vite.config.js` to use different port

## 💰 OpenAI API Costs

- **Embeddings** (ada-002): ~$0.0001 per 1,000 tokens
- **GPT-3.5-turbo**: ~$0.002 per 1,000 tokens
- **Example**: Processing 100 pages + 50 questions ≈ $0.50 - $2.00

Tips to save money:
- Start with GPT-3.5-turbo (cheaper than GPT-4)
- Use smaller chunk sizes if needed
- Set usage limits in OpenAI dashboard

## 📚 Next Steps

Once everything is running:

1. **Upload your course materials** - PDFs work best
2. **Start chatting** - Ask questions about your materials
3. **Generate quizzes** - Test your knowledge
4. **Get summaries** - Review topics quickly
5. **Track your progress** - Check session info

## 🎯 Tips for Best Experience

1. **Upload quality PDFs**: Scanned images won't work well
2. **Be specific with questions**: "Explain decision trees" vs "What's ML?"
3. **Upload multiple files**: More context = Better answers
4. **Use topic-specific quizzes**: Focus on what you're studying
5. **Review summaries regularly**: Great for exam prep

## 📞 Need Help?

If you're stuck:
1. Check the error messages in both terminals
2. Read the full README.md for detailed information
3. Verify all prerequisites are installed correctly
4. Make sure your OpenAI API key is valid and has credits

## 🎉 Success!

If you can chat with the AI and get responses, you're all set!

Now start uploading your course materials and studying smarter! 🚀

---

**Happy Learning! 🎓**

