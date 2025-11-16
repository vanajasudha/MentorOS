# 🚀 Getting Started with AI Mentor

Welcome to AI Mentor! This guide will help you get up and running in just a few minutes.

## 📋 What You'll Need

Before starting, make sure you have:

- ✅ **Python 3.10+** - [Download here](https://www.python.org/downloads/)
- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
- ✅ **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
- ✅ **Text Editor** - VS Code, Sublime, or any IDE
- ✅ **Terminal/Command Prompt** - Built into your OS

## ⚡ Quick Start (5 Minutes)

### Step 1: Get Your OpenAI API Key (2 minutes)

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click **"Create new secret key"**
4. **Copy the key** (it starts with `sk-`)
5. Save it somewhere safe - you won't see it again!

💡 **Tip**: You might need to add payment info to your OpenAI account, but the API has a free tier to get started.

### Step 2: Set Up Backend (2 minutes)

Open your terminal in the project folder:

**On Windows:**
```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install dependencies
pip install -r backend\requirements.txt

# Create .env file
copy backend\env.example backend\.env
```

**On Mac/Linux:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Create .env file
cp backend/env.example backend/.env
```

Now **edit** `backend/.env` and add your API key:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 3: Set Up Frontend (1 minute)

Open a **NEW** terminal:

```bash
cd frontend
npm install
```

That's it for setup! 🎉

## 🎬 Running the Application

### Easy Way: Use Startup Scripts

**On Windows:**
```bash
# Terminal 1 - Backend
start_backend.bat

# Terminal 2 - Frontend  
start_frontend.bat
```

**On Mac/Linux:**
```bash
# Terminal 1 - Backend
./start_backend.sh

# Terminal 2 - Frontend
./start_frontend.sh
```

### Manual Way:

**Terminal 1 - Backend:**
```bash
# Make sure venv is activated
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

uvicorn backend.app:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### What You Should See:

**Backend Terminal:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Frontend Terminal:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

## 🎯 Your First Steps

### 1. Open the App

Your browser should automatically open to http://localhost:3000

If not, manually go to:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

### 2. Check Connection

Look at the top-right corner of the webpage:
- 🟢 **Green dot** = Connected (Good!)
- 🔴 **Red dot** = Disconnected (Check backend is running)

### 3. Upload Your First Document

1. Click the **"📚 Upload"** tab
2. Drag a PDF file onto the upload area (or click to browse)
   - Try a textbook chapter or lecture notes
   - Make sure it's text-based, not just images
3. Click **"🚀 Upload & Process"**
4. Wait for the success message

**What's happening:**
- Text is extracted from your PDF
- Content is split into chunks
- Embeddings are created (this uses your OpenAI API)
- Everything is stored in a vector database

⏱️ **Processing time**: About 2-5 seconds per page

### 4. Ask Your First Question

1. Click the **"💬 Chat"** tab
2. Type a question about your document:
   - "What are the main topics covered?"
   - "Explain [specific concept]"
   - "Give me a summary of this material"
3. Press **Enter**
4. Get your answer! 🎉

**Pro tips:**
- Be specific with your questions
- The AI will reference your uploaded materials
- It remembers your conversation history

### 5. Generate a Quiz

1. Click the **"🎯 Study Tools"** tab
2. Enter a topic from your materials
3. Select number of questions (3, 5, or 10)
4. Click **"🎯 Generate Quiz"**
5. Answer the questions
6. Click **"✅ Submit Quiz"**
7. See your score and explanations!

### 6. Get a Summary

1. In the **"🎯 Study Tools"** tab
2. Enter a topic
3. Click **"📄 Get Summary"**
4. Read your comprehensive summary

### 7. Track Your Progress

1. Click the **"📊 Progress"** tab
2. View your statistics:
   - Questions asked
   - Quizzes completed
   - Average score
   - Recent activities

## 🎓 Example Workflow

Here's a complete study session:

1. **Upload** your lecture notes PDF
2. **Chat** to clarify confusing concepts
3. **Generate a summary** of key topics
4. **Take a quiz** to test understanding
5. **Check progress** to see your performance
6. **Repeat** with more materials!

## 💡 Tips for Success

### For Best Results:

1. **Upload Quality PDFs**
   - Text-based (not scanned images)
   - Well-formatted course materials
   - Textbooks, lecture notes, study guides work best

2. **Ask Clear Questions**
   - ❌ "What's this about?"
   - ✅ "Explain the difference between supervised and unsupervised learning"

3. **Upload Multiple Documents**
   - More context = Better answers
   - Upload all relevant materials for a topic

4. **Use Quizzes Regularly**
   - Test yourself after studying
   - Review explanations for wrong answers

5. **Track Your Progress**
   - Check your stats regularly
   - Focus on areas where you scored low

### To Save API Costs:

1. Start with **GPT-3.5-turbo** (cheaper than GPT-4)
2. Upload only the materials you're currently studying
3. Be concise with questions
4. Use summaries to review instead of re-reading everything

## 🐛 Troubleshooting

### Problem: Backend won't start

**Solutions:**
```bash
# Check if virtual environment is activated
# You should see (venv) in your terminal prompt

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

# Reinstall dependencies
pip install -r backend/requirements.txt
```

### Problem: "OpenAI API Error"

**Solutions:**
1. Check your API key in `backend/.env`
2. Make sure key starts with `sk-`
3. Verify you have credits in your OpenAI account
4. Restart the backend after adding the key

### Problem: Frontend shows "Disconnected"

**Solutions:**
1. Make sure backend terminal is still running
2. Check if backend is at http://localhost:8000
3. Try refreshing the frontend page

### Problem: "Vector store not found"

**Solution:**
Upload a document first! The vector store is created when you upload your first PDF through the web interface.

### Problem: Slow responses

**Reasons:**
1. Large documents take time to process
2. OpenAI API response time varies
3. First query after upload might be slower

**Solutions:**
- Be patient with large files
- Use smaller chunk sizes if needed
- Check your internet connection

### Problem: Poor quality answers

**Solutions:**
1. Upload more relevant documents
2. Ask more specific questions
3. Make sure your PDFs contain the information
4. Try rephrasing your question

## 📚 Next Steps

Once you're comfortable with the basics:

1. **Explore the API**
   - Visit http://localhost:8000/docs
   - Try the interactive API documentation

2. **Customize Settings**
   - Edit `backend/config.py` for configurations
   - Adjust chunk sizes in `backend/chunker.py`
   - Change models in `backend/app.py`

3. **Read More Docs**
   - `README.md` - Full documentation
   - `FEATURES.md` - All features explained
   - `PROJECT_OVERVIEW.md` - Architecture details

4. **Contribute**
   - Report bugs on GitHub
   - Suggest new features
   - Improve documentation

## 🎯 Learning Objectives

By using AI Mentor, you'll:

- ✅ Master your course materials faster
- ✅ Test your knowledge with quizzes
- ✅ Get instant clarification on confusing topics
- ✅ Track your study progress
- ✅ Study more efficiently

## 💰 Cost Expectations

Typical usage costs with OpenAI API:

- **Processing 100 pages**: ~$0.30-0.50
- **50 chat questions**: ~$0.10-0.20
- **10 quizzes**: ~$0.20-0.40

**Total for a week of heavy use**: ~$1-2

💡 OpenAI often provides free credits for new users!

## ❓ Common Questions

**Q: Do I need to keep both terminals open?**
A: Yes! One for backend, one for frontend. Both need to run.

**Q: Can I use this without internet?**
A: No, it needs internet to call OpenAI API.

**Q: Is my data private?**
A: Your documents stay on your computer. Only text chunks are sent to OpenAI for processing.

**Q: Can I use a different AI model?**
A: Yes! Edit `backend/app.py` to change the model (e.g., gpt-4).

**Q: What file formats are supported?**
A: Currently only PDF. More formats coming soon!

**Q: Can multiple people use this?**
A: It's designed for single user. For multi-user, you'd need to add authentication.

**Q: How do I stop the servers?**
A: Press `Ctrl+C` in both terminal windows.

**Q: Can I deploy this online?**
A: Yes! See README.md for deployment options.

## 🎉 You're Ready!

That's it! You now know everything to get started with AI Mentor.

**Remember:**
- Upload quality documents
- Ask clear questions  
- Take quizzes regularly
- Track your progress
- Study smarter, not harder!

## 🆘 Need Help?

If you're stuck:
1. Check this guide again
2. Read the error messages carefully
3. Look at the backend terminal for errors
4. Check the browser console (F12)
5. Review the full README.md
6. Open an issue on GitHub

---

**Happy Learning! 🎓**

Made with ❤️ for students everywhere.

*Now go ace those exams!* 💪

