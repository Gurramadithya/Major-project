from __future__ import annotations

import io
import json
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


@router.get("/download/{case_id}")
def download_report(case_id: str):
    """Download report for a given case ID."""
    db: Session = SessionLocal()
    try:
        record = db.query(CaseRecord).filter(CaseRecord.case_id == case_id).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Case not found")
        metadata = json.loads(record.case_metadata or "{}")
        
        # Build report data from database record
        findings = metadata.get("findings") or []
        recommendations = metadata.get("recommendations") or (record.recommendations or "").split("\n") if metadata.get("recommendations") is not None else ((record.recommendations or "").split("\n") if record.recommendations else [])
        if isinstance(recommendations, str):
            recommendations = [recommendations]
        if not recommendations:
            recommendations = ["No recommendations provided."]

        overall_summary = (
            f"{record.prediction or 'Unknown'} with "
            f"{(float(record.confidence) if record.confidence else 0.0):.1%} confidence "
            f"and affected region {metadata.get('affected_region', 'unknown')} ."
        )
        suggested_specialist = metadata.get("department") or ("Pulmonologist" if (record.prediction or "").lower() == "pneumonia" else "General Physician")
        rag_context = metadata.get("rag_context") or record.rag_context or "No retrieval context provided."
        report_data = {
            "case_id": record.case_id,
            "project_title": metadata.get("project_title") or "Medical AI Project",
            "hospital_name": metadata.get("hospital_name") or "Medical AI Platform",
            "disease_prediction": record.prediction or "Unknown",
            "prediction": record.prediction or "Unknown",
            "confidence": float(record.confidence) if record.confidence else 0.0,
            "severity": metadata.get("severity") or record.severity or "Unknown",
            "processing_time": record.processing_time or "N/A",
            "ai_explanation": metadata.get("ai_explanation") or record.ai_explanation or "No explanation provided.",
            "rag_medical_knowledge": rag_context,
            "rag_context": rag_context,
            "suggested_specialist": suggested_specialist,
            "department": suggested_specialist,
            "image_base64": record.image_base64,
            "filename": metadata.get("original_name", record.filename),
            "validation_result": metadata.get("validation_result", "valid lung/chest X-ray"),
            "affected_region": metadata.get("affected_region", "unknown"),
            "visualization_mode": metadata.get("visualization_mode", "none"),
            "recommendations": recommendations,
            "assistant_response": metadata.get("assistant_response") or record.assistant_response or "No assistant response provided.",
            "analysis_date": record.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if record.created_at else "N/A",
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "findings": findings if findings else ["No findings were captured for this case."],
            "overall_summary": overall_summary,
            "next_steps": metadata.get("next_steps") or recommendations[:3] or ["Follow up as clinically indicated."],
            "medical_disclaimer": "This AI-assisted report is educational and support-oriented only and is not a substitute for professional medical evaluation, diagnosis, or treatment.",
        }
        
        pdf_bytes = generate_report_pdf(report_data)
        
        # Update record to indicate report was generated
        record.report_generated = True
        record.report_filename = f"medical_report_{case_id}.pdf"
        db.commit()
        
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(exc)}") from exc
    finally:
        db.close()

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=medical_report_{case_id}.pdf"},
    )
