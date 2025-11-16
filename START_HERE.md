# 🚀 START HERE - Run AI Mentor Locally

## Quick Start (2 Steps)

### 📍 Step 1: Start Backend

**Open Terminal/PowerShell Window 1:**

```powershell
# Navigate to project
cd C:\Users\pujar\OneDrive\Documents\ai_mentor

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start backend server
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

**OR use the script:**
```powershell
.\start_backend.bat
```

✅ **Backend URL:** http://localhost:8000  
✅ **API Docs:** http://localhost:8000/docs

**Keep this terminal open!**

---

### 📍 Step 2: Start Frontend

**Open Terminal/PowerShell Window 2 (NEW WINDOW!):**

```powershell
# Navigate to project
cd C:\Users\pujar\OneDrive\Documents\ai_mentor

# Go to frontend folder
cd frontend

# Install dependencies (first time only)
npm install

# Start frontend server
npm run dev
```

**OR use the script:**
```powershell
.\start_frontend.bat
```

✅ **Frontend URL:** http://localhost:3000

---

## ✅ Verify Everything Works

1. **Backend Terminal** should show:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000
   INFO:     Application startup complete.
   ```

2. **Frontend Terminal** should show:
   ```
   VITE v5.x.x  ready in XXX ms
   ➜  Local:   http://localhost:3000/
   ```

3. **Browser** should open automatically to http://localhost:3000

4. **Test Backend:** Visit http://localhost:8000 in browser

---

## 🎯 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend API** | http://localhost:8000 | API server |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |

---

## ⚠️ Important Notes

1. ✅ **Backend must be running FIRST** - Start it before frontend
2. ✅ **Use separate terminal windows** - Don't run both in same window
3. ✅ **Keep both terminals open** - Closing them stops the servers
4. ✅ **No API keys needed** - Everything runs locally!

---

## 🛑 To Stop

- **Backend:** Press `Ctrl + C` in backend terminal
- **Frontend:** Press `Ctrl + C` in frontend terminal

---

## 📚 More Help

- **Detailed Guide:** See `RUN_LOCALLY.md`
- **Local Models Setup:** See `LOCAL_SETUP.md`
- **Troubleshooting:** Check `RUN_LOCALLY.md` troubleshooting section

---

**That's it! You're ready to go! 🎉**

