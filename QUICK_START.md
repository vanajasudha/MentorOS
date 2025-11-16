# ⚡ Quick Start Guide - Run AI Mentor Locally

## 🎯 Two Simple Steps

### Step 1: Start Backend (Terminal 1)

**Windows:**
```powershell
.\start_backend.bat
```

**Mac/Linux:**
```bash
./start_backend.sh
```

**Or manually:**
```powershell
.\venv\Scripts\Activate.ps1
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

✅ **Backend runs on:** http://localhost:8000

---

### Step 2: Start Frontend (Terminal 2 - NEW WINDOW!)

**Windows:**
```powershell
.\start_frontend.bat
```

**Mac/Linux:**
```bash
./start_frontend.sh
```

**Or manually:**
```powershell
cd frontend
npm install  # First time only
npm run dev
```

✅ **Frontend runs on:** http://localhost:3000

---

## 🌐 Access Your App

- **Frontend (Main App):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## ⚠️ Important Notes

1. **Backend must be running first** - Start it before the frontend
2. **Use separate terminal windows** - One for backend, one for frontend
3. **Keep both terminals open** - Don't close them while using the app
4. **No API keys needed** - Everything runs locally!

---

## 🐛 Troubleshooting

**Backend won't start?**
- Make sure virtual environment is activated
- Install dependencies: `pip install -r backend\requirements.txt`

**Frontend won't start?**
- Install dependencies: `cd frontend && npm install`
- Check if Node.js is installed: `node --version`

**Can't connect to backend?**
- Make sure backend is running on port 8000
- Check backend terminal for errors

---

For detailed instructions, see **RUN_LOCALLY.md**

