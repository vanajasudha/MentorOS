# 🚀 Running AI Mentor Locally - Complete Guide

This guide will help you run both the **backend** (Python/FastAPI) and **frontend** (React/Vite) on your local machine.

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Python 3.10+ installed
- ✅ Node.js 18+ installed
- ✅ Virtual environment set up (already done)
- ✅ All Python dependencies installed
- ✅ Ollama installed (for local LLM) - see LOCAL_SETUP.md

---

## 🔧 Step 1: Start the Backend Server

The backend is a **Python FastAPI** application that runs on **http://localhost:8000**

### Option A: Using the Start Script (Easiest)

**Windows:**
```powershell
.\start_backend.bat
```

**Mac/Linux:**
```bash
./start_backend.sh
```

### Option B: Manual Start

1. **Open a terminal/PowerShell window**

2. **Navigate to the project root:**
   ```powershell
   cd C:\Users\pujar\OneDrive\Documents\ai_mentor
   ```

3. **Activate the virtual environment:**
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   
   On Mac/Linux:
   ```bash
   source venv/bin/activate
   ```

4. **Verify dependencies are installed:**
   ```powershell
   pip list | findstr "fastapi uvicorn"
   ```
   
   If not installed, run:
   ```powershell
   pip install -r backend\requirements.txt
   ```

5. **Start the FastAPI server:**
   ```powershell
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Verify the backend is running:**
   - You should see: `INFO:     Uvicorn running on http://0.0.0.0:8000`
   - Open your browser and go to: **http://localhost:8000**
   - You should see the API welcome message
   - API documentation: **http://localhost:8000/docs**

### ✅ Backend Success Indicators:
- Terminal shows: `Application startup complete`
- Browser shows API response at http://localhost:8000
- No error messages in terminal

**⚠️ Important:** Keep this terminal window open! The backend must stay running.

---

## 🎨 Step 2: Start the Frontend Server

The frontend is a **React/Vite** application that runs on **http://localhost:3000**

### Option A: Using the Start Script (Easiest)

**Windows:**
```powershell
.\start_frontend.bat
```

**Mac/Linux:**
```bash
./start_frontend.sh
```

### Option B: Manual Start

1. **Open a NEW terminal/PowerShell window** (keep the backend terminal running!)

2. **Navigate to the project root:**
   ```powershell
   cd C:\Users\pujar\OneDrive\Documents\ai_mentor
   ```

3. **Navigate to the frontend folder:**
   ```powershell
   cd frontend
   ```

4. **Install dependencies (first time only):**
   ```powershell
   npm install
   ```
   
   This will install:
   - React
   - Vite
   - Tailwind CSS
   - Other frontend dependencies

5. **Start the development server:**
   ```powershell
   npm run dev
   ```

6. **Verify the frontend is running:**
   - You should see: `Local: http://localhost:3000/`
   - The browser should automatically open
   - If not, manually go to: **http://localhost:3000**

### ✅ Frontend Success Indicators:
- Terminal shows: `VITE v5.x.x ready in XXX ms`
- Browser shows the AI Mentor interface
- No error messages in terminal

---

## 🌐 Accessing the Application

Once both servers are running:

- **Frontend (Main App):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

---

## 📝 Quick Reference Commands

### Backend Commands
```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Start backend
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

# Or use the script
.\start_backend.bat
```

### Frontend Commands
```powershell
# Navigate to frontend
cd frontend

# Install dependencies (first time)
npm install

# Start dev server
npm run dev

# Or use the script
cd ..
.\start_frontend.bat
```

---

## 🔍 Troubleshooting

### Backend Issues

**Problem: Port 8000 already in use**
```powershell
# Use a different port
uvicorn backend.app:app --reload --port 8001
```
Then update frontend API URL in `frontend/src/App.jsx` if needed.

**Problem: Module not found errors**
```powershell
# Reinstall dependencies
pip install -r backend\requirements.txt
```

**Problem: Ollama connection error**
- Make sure Ollama is installed: https://ollama.ai
- Make sure Ollama is running: `ollama list`
- Download a model: `ollama pull llama2`

### Frontend Issues

**Problem: Port 3000 already in use**
- Vite will automatically use the next available port (3001, 3002, etc.)
- Check the terminal for the actual URL
- Or change the port in `frontend/vite.config.js`

**Problem: npm install fails**
```powershell
# Clear cache and reinstall
npm cache clean --force
npm install
```

**Problem: Cannot connect to backend**
- Make sure backend is running on http://localhost:8000
- Check browser console for CORS errors
- Verify backend CORS settings in `backend/app.py`

**Problem: API calls failing**
- Check that backend is running
- Verify the API URL in frontend code matches backend port
- Check browser Network tab for error details

---

## 🛑 Stopping the Servers

### To Stop Backend:
- Press `Ctrl + C` in the backend terminal

### To Stop Frontend:
- Press `Ctrl + C` in the frontend terminal

---

## 📊 What's Running Where

| Component | Technology | Port | URL |
|-----------|-----------|------|-----|
| Backend API | FastAPI (Python) | 8000 | http://localhost:8000 |
| Frontend UI | React + Vite | 3000 | http://localhost:3000 |
| API Docs | Swagger UI | 8000 | http://localhost:8000/docs |

---

## ✅ Verification Checklist

Before using the app, verify:

- [ ] Backend terminal shows "Application startup complete"
- [ ] Backend accessible at http://localhost:8000
- [ ] Frontend terminal shows "VITE ready"
- [ ] Frontend accessible at http://localhost:3000
- [ ] No error messages in either terminal
- [ ] Browser console shows no errors (F12 → Console tab)

---

## 🎯 Next Steps

Once both servers are running:

1. **Test the frontend:**
   - Upload a PDF file
   - Ask questions in the chat
   - Generate quizzes

2. **Check the backend:**
   - Visit http://localhost:8000/docs
   - Test API endpoints
   - View API documentation

3. **Monitor logs:**
   - Backend logs appear in the backend terminal
   - Frontend logs appear in the frontend terminal
   - Browser console (F12) shows frontend errors

---

## 💡 Tips

- **Keep both terminals visible** so you can see logs from both servers
- **Use separate terminal windows** for backend and frontend
- **Check the terminal output** if something isn't working
- **The backend must be running** before the frontend can make API calls
- **Hot reload is enabled** - changes to code will automatically refresh

---

**Happy coding! 🚀**

