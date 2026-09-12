from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..config import logger, settings
from ..ai.inference import validate_lung_xray_image
from ..database.connection import SessionLocal
from ..database.models import CaseRecord
from ..schemas import HealthResponse, UploadResponse

router = APIRouter(prefix="/api/v1", tags=["upload"])
SUPPORTED_FORMATS = {"jpg", "jpeg", "png"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    logger.info("Health check requested")
    return HealthResponse(
        app_name=settings.app_name,
        app_version=settings.app_version,
    )


@router.post("/upload", response_model=UploadResponse)
def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_extension = Path(file.filename).suffix.lower().lstrip(".")
    if file_extension not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        contents = file.file.read()
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to read uploaded file %s", file.filename)
        raise HTTPException(status_code=500, detail="Failed to read uploaded file") from exc

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    if not validate_lung_xray_image(contents):
        raise HTTPException(
            status_code=422,
            detail="Invalid image. Please upload a valid lung/chest X-ray.",
        )

    unique_name = f"{uuid.uuid4().hex}{Path(file.filename).suffix.lower()}"
    destination_path = upload_dir / unique_name

    try:
        destination_path.write_bytes(contents)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to save uploaded file %s", file.filename)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file") from exc
    finally:
        file.file.close()

    logger.info("Uploaded file %s to %s", file.filename, destination_path)

    db: Session = SessionLocal()
    try:
        case_record = CaseRecord(
            case_id=unique_name.replace(Path(unique_name).suffix, ""),
            filename=unique_name,
            filepath=str(destination_path),
            case_metadata=json.dumps({"original_name": file.filename}),
        )
        db.add(case_record)
        db.commit()
        db.refresh(case_record)
    finally:
        db.close()

    return UploadResponse(
        success=True,
        filename=unique_name,
        filepath=str(destination_path),
        message="Upload successful",
        case_id=str(case_record.case_id),
    )
