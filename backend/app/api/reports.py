from __future__ import annotations

import io
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import SessionLocal
from ..database.models import CaseRecord
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..reports.report_service import generate_report_pdf

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


class ReportRequest(BaseModel):
    case_id: str | None = None
    disease_prediction: str = "Pending"
    confidence: float = 0.0
    processing_time: str = "N/A"
    ai_explanation: str = "No explanation provided."
    rag_medical_knowledge: str = "No retrieval context provided."
    suggested_specialist: str = "Referring clinician"
    hospital_name: str = "Medical AI Platform"
    image_base64: str | None = None


@router.post("/download")
def download_report(payload: ReportRequest):
    try:
        pdf_bytes = generate_report_pdf(
            {
                **payload.model_dump(),
                "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            }
        )
    except Exception as exc:  # pragma: no cover - defensive handling
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if payload.case_id:
        db: Session = SessionLocal()
        try:
            record = db.query(CaseRecord).filter(CaseRecord.case_id == payload.case_id).first()
            if record is not None:
                record.report_generated = True
                record.report_filename = "medical_report.pdf"
                db.commit()
        finally:
            db.close()

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=medical_report.pdf"},
    )
