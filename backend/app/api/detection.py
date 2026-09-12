from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..ai.inference import validate_lung_xray_image
from ..ai.services import DetectionService
from ..config import logger
from ..database.connection import SessionLocal
from ..database.models import CaseRecord
from ..llm.assistant import GeminiAssistant
from ..rag.retriever import RAGRetriever
from ..schemas import DetectionResponse

router = APIRouter(prefix="/api/v1", tags=["detection"])
service = DetectionService()


@router.post("/detect", response_model=DetectionResponse)
def detect_image(file: UploadFile = File(...), case_id: str | None = Form(None)) -> DetectionResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    try:
        contents = file.file.read()
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to read detection image")
        raise HTTPException(status_code=500, detail="Failed to read uploaded image") from exc
    finally:
        file.file.close()

    if not validate_lung_xray_image(contents):
        raise HTTPException(
            status_code=422,
            detail="Invalid image. Please upload a valid lung/chest X-ray.",
        )

    result = service.predict(contents)
    logger.info("Detection completed with result %s", result)

    if not result.get("success", False):
        raise HTTPException(
            status_code=422,
            detail="Invalid image. Please upload a valid lung/chest X-ray.",
        )

    rag_results = RAGRetriever().search(result["prediction"], top_k=3)
    assistant_result = GeminiAssistant().generate_response(
        rag_results, result["prediction"], result["confidence"]
    )
    result["rag_context"] = "\n\n".join(
        f"[{item['source']}] {item['content']}" for item in rag_results
    )
    result["assistant_response"] = assistant_result.get("response", "")

    db: Session = SessionLocal()
    try:
        resolved_case_id = case_id
        if not resolved_case_id:
            for suffix in [".jpg", ".jpeg", ".png", ".bmp"]:
                if file.filename.endswith(suffix):
                    resolved_case_id = file.filename[:-len(suffix)]
                    break
        if not resolved_case_id:
            resolved_case_id = file.filename or "case"

        record = db.query(CaseRecord).filter(CaseRecord.case_id == resolved_case_id).first()
        if record is None:
            record = CaseRecord(
                case_id=resolved_case_id,
                filename=file.filename,
                filepath="",
                case_metadata=json.dumps({"source": "detection"}),
            )
            db.add(record)
            db.commit()
            db.refresh(record)

        record.prediction = result.get("prediction")
        record.confidence = float(result.get("confidence", 0.0))
        record.severity = result.get("severity", "unknown")
        record.organ = result.get("affected_organ", "unknown")
        record.recommendations = "\n".join(result.get("recommendations", []))
        record.assistant_response = result.get("assistant_response", "")
        record.rag_context = result.get("rag_context", "")
        record.image_base64 = result.get("image_base64", "")
        record.processing_time = result.get("processing_time", "")
        record.ai_explanation = result.get("ai_explanation", "")
        metadata = json.loads(record.case_metadata or "{}")
        metadata.update({
            "source": "detection",
            "validation_result": "valid lung/chest X-ray",
            "affected_region": result.get("affected_region", "unknown"),
            "visualization_mode": result.get("visualization_mode", "none"),
            "findings": result.get("findings", []),
            "recommendations": result.get("recommendations", []),
            "assistant_response": result.get("assistant_response", ""),
            "rag_context": result.get("rag_context", ""),
            "severity": result.get("severity", "unknown"),
            "confidence": float(result.get("confidence", 0.0)),
            "ai_explanation": result.get("ai_explanation", ""),
            "project_title": "Medical AI Project",
            "hospital_name": "Medical AI Platform",
            "department": "Pulmonology" if (result.get("prediction") or "").lower() == "pneumonia" else "General Medicine",
            "next_steps": result.get("recommendations", [])[:3],
        })
        record.case_metadata = json.dumps(metadata)
        db.commit()
    finally:
        db.close()

    return DetectionResponse(**result)
