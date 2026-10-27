# Medical AI Platform

## Overview
This project is a research-ready medical AI prototype that combines image upload, disease detection, 3D visualization, retrieval-augmented medical knowledge, an AI assistant, PDF reporting, and analytics in a single web application.

## Architecture
- Frontend: React + Vite + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + SQLite
- AI: lightweight detection service, RAG retrieval, Gemini-style assistant wrapper
- Reports: PDF generation using ReportLab

## Features
- Medical image upload with validation
- Disease detection workflow
- Interactive 3D anatomy placeholder viewer
- Retrieval-augmented medical knowledge retrieval
- Assistant response generation
- PDF report download
- Analytics dashboard view
- AI Clinical Assistant
- Medical Library with comprehensive condition information

## Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Git

## Setup Instructions (For New Machine)

### 1. Clone the Repository
```bash
git clone https://github.com/Gurramadithya/Major-project.git
cd Major-project
```

### 2. Backend Setup
```bash
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend

# Install Node.js dependencies
npm install

# Go back to project root
cd ..
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
# Make sure virtual environment is activated
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8002
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application
- Frontend: http://127.0.0.1:4173
- Backend API: http://127.0.0.1:8002
- API Documentation: http://127.0.0.1:8002/docs

## Environment Variables (Optional)
Create a `.env` file in the project root if needed:
- APP_NAME
- APP_VERSION
- DEBUG
- ENVIRONMENT
- DATABASE_URL
- UPLOAD_DIR
- LOG_LEVEL
- GEMINI_API_KEY

## Notes
- The current implementation is a polished research prototype with working core workflows and graceful fallbacks for optional AI dependencies.
- The database file (medical_ai.db) will be created automatically on first run.
- Uploaded images are stored in the `uploads/` directory.
- Generated reports are stored in the `reports/` directory.
- If RAG dependencies (langchain, chromadb, etc.) are not installed, the system uses mock medical knowledge as a fallback.
