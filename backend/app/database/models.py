from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from .connection import Base


class CaseRecord(Base):
    __tablename__ = "case_records"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), unique=True, index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(1024), nullable=False)
    prediction = Column(String(255), nullable=True)
    confidence = Column(Float, default=0.0)
    severity = Column(String(80), default="unknown")
    organ = Column(String(80), default="unknown")
    recommendations = Column(Text, default="")
    assistant_response = Column(Text, default="")
    report_generated = Column(Boolean, default=False)
    report_filename = Column(String(255), nullable=True)
    image_base64 = Column(Text, nullable=True)
    case_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict[str, Any]:
        metadata: dict[str, Any] = {}
        if self.case_metadata:
            try:
                metadata = json.loads(self.case_metadata)
            except json.JSONDecodeError:
                metadata = {"raw": self.case_metadata}

        return {
            "id": self.id,
            "case_id": self.case_id,
            "filename": self.filename,
            "filepath": self.filepath,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "severity": self.severity,
            "organ": self.organ,
            "recommendations": self.recommendations,
            "assistant_response": self.assistant_response,
            "report_generated": self.report_generated,
            "report_filename": self.report_filename,
            "image_base64": self.image_base64,
            "metadata": metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
