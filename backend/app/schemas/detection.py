from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class DetectionResponse(BaseModel):
    success: bool
    prediction: str
    confidence: float
    processing_time: str
    heatmap: Optional[str] = None
    message: Optional[str] = None
    affected_organ: Optional[str] = None
    severity: Optional[str] = None
    recommendations: list[str] = []
    ai_explanation: Optional[str] = None
