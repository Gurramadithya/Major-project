from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)


class Settings:
    def __init__(self) -> None:
        self.app_name: str = os.getenv("APP_NAME", "Medical AI Backend")
        self.app_version: str = os.getenv("APP_VERSION", "0.1.0")
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
        self.environment: Literal["development", "testing", "production"] = os.getenv(
            "ENVIRONMENT", "development"
        )
        database_path = PROJECT_ROOT / "medical_ai.db"
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            f"sqlite:///{database_path.as_posix()}",
        )
        self.upload_dir: str = os.getenv("UPLOAD_DIR", str(PROJECT_ROOT / "uploads"))
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()


def configure_logging() -> logging.Logger:
    log_dir = PROJECT_ROOT / "logs"
    log_dir.mkdir(exist_ok=True)

    logger = logging.getLogger("medical_ai_backend")
    logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    logger.propagate = False

    if not logger.handlers:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        file_handler = logging.FileHandler(log_dir / "backend.log", encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

    return logger


logger = configure_logging()
