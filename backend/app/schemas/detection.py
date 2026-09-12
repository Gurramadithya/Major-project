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
    affected_region: Optional[str] = None
    severity: Optional[str] = None
    highlight_left: bool = False
    highlight_right: bool = False
    visualization_mode: Optional[str] = None
    findings: list[str] = []
    recommendations: list[str] = []
    ai_explanation: Optional[str] = None
    rag_context: Optional[str] = None
    assistant_response: Optional[str] = None
    image_base64: Optional[str] = None
