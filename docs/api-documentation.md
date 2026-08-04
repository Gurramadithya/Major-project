# API Documentation

## Health
- GET /health
- Returns basic service health information.

## Upload
- POST /api/v1/upload
- Accepts an image file and stores it locally.

## Detection
- POST /api/v1/detect
- Runs the current detection pipeline for an uploaded image.

## RAG
- POST /api/v1/rag
- Performs retrieval from the local knowledge base.

## Assistant
- POST /api/v1/assistant
- Generates an AI-assisted response using retrieved context.

## Reports
- POST /api/v1/reports/download
- Generates and returns a PDF report.
