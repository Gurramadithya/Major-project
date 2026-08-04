from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..ai.services import DetectionService
from ..config import logger
from ..database.connection import SessionLocal
from ..database.models import CaseRecord
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

    result = service.predict(contents)
    logger.info("Detection completed with result %s", result)

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
                case_metadata={"source": "detection"},
            )
            db.add(record)
            db.commit()
            db.refresh(record)

        record.prediction = result.get("prediction")
        record.confidence = float(result.get("confidence", 0.0))
        record.severity = result.get("severity", "unknown")
        record.organ = result.get("affected_organ", "unknown")
        record.recommendations = "\n".join(result.get("recommendations", []))
        record.assistant_response = result.get("ai_explanation", "")
        record.case_metadata = str({"source": "detection", "message": result.get("message", "")})
        db.commit()
    finally:
        db.close()

    return DetectionResponse(**result)
