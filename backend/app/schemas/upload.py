from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    app_name: str
    app_version: str


class UploadResponse(BaseModel):
    success: bool
    filename: str
    filepath: str
    message: str
    case_id: str
