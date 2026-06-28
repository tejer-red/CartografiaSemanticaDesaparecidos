# AGENTS.md

## 🚀 Quick Start Guide

### 🔐 Environment Setup
- Copy & edit `.env` from `.env.example`
- Required vars: `OLD_DB_*`, `NEW_DATABASE_URL`, `DATABASE_URL`

### 🐳 Backend (FastAPI)
**Recommended:**
```bash
docker compose up --build
```
**Local (Advanced):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 📦 Data Migration
```bash
cd backend
source venv/bin/activate
python scripts/migrate_data.py
```
*Automates table creation and bulk load with PostgreSQL index collision fixes*

### 🧱 Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Auto-connects to local backend at http://localhost:8000/api/v1*