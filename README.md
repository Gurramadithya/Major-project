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

## Setup
1. Create and activate a Python virtual environment.
2. Install dependencies from requirements.txt.
3. Install frontend dependencies with npm install.
4. Start the backend with uvicorn backend.app.main:app --reload.
5. Start the frontend with npm run dev.

## Environment Variables
- APP_NAME
- APP_VERSION
- DEBUG
- ENVIRONMENT
- DATABASE_URL
- UPLOAD_DIR
- LOG_LEVEL
- GEMINI_API_KEY

## Notes
The current implementation is a polished research prototype with working core workflows and graceful fallbacks for optional AI dependencies.
