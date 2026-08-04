from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .api import assistant_router, detection_router, rag_router, reports_router, upload_router
from .config import logger, settings
from .database.connection import Base, engine
from .database.models import CaseRecord

app = FastAPI(title=settings.app_name, version=settings.app_version, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(detection_router)
app.include_router(rag_router)
app.include_router(assistant_router)
app.include_router(reports_router)

from fastapi import APIRouter
from sqlalchemy.orm import Session
from .database.connection import SessionLocal

history_router = APIRouter(prefix="/api/v1/history", tags=["history"])
analytics_router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

@history_router.get("")
def list_history() -> list[dict]:
    db: Session = SessionLocal()
    try:
        records = db.query(CaseRecord).order_by(CaseRecord.created_at.desc()).all()
        return [record.to_dict() for record in records]
    finally:
        db.close()

@history_router.delete("/{case_id}")
def delete_history_case(case_id: str) -> dict:
    db: Session = SessionLocal()
    try:
        record = db.query(CaseRecord).filter(CaseRecord.case_id == case_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        db.delete(record)
        db.commit()
        return {"success": True, "message": "Case deleted"}
    finally:
        db.close()

@analytics_router.get("")
def get_analytics() -> dict:
    db: Session = SessionLocal()
    try:
        records = db.query(CaseRecord).order_by(CaseRecord.created_at.desc()).all()
        total_cases = len(records)
        total_reports = sum(1 for record in records if record.report_generated)
        average_confidence = round(sum(record.confidence for record in records) / total_cases, 4) if total_cases else 0.0
        prediction_counts: dict[str, int] = {}
        for record in records:
            prediction = record.prediction or "Unknown"
            prediction_counts[prediction] = prediction_counts.get(prediction, 0) + 1
        most_predicted_disease = max(prediction_counts.items(), key=lambda item: item[1], default=("Unknown", 0))[0] if prediction_counts else "Unknown"
        return {
            "success": True,
            "total_cases": total_cases,
            "total_reports": total_reports,
            "average_confidence": average_confidence,
            "most_predicted_disease": most_predicted_disease,
            "prediction_breakdown": [item[0] for item in list(prediction_counts.items())[:5]],
            "report_history": [record.prediction or "Case" for record in records[:5]],
            "assistant_usage": [record.organ or "Clinical review" for record in records[:5]],
        }
    finally:
        db.close()

app.include_router(history_router)
app.include_router(analytics_router)


@app.on_event("startup")
def startup_event() -> None:
    logger.info("Initializing backend startup")
    Base.metadata.create_all(bind=engine)

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Medical AI backend is running"}


@app.get("/health")
def health() -> dict[str, str]:
    logger.info("Health endpoint called")
    return {"status": "ok"}
