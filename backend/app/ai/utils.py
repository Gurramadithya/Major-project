from __future__ import annotations

from pathlib import Path


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).resolve().parents[3]


def get_model_path() -> Path:
    """Get the default model path."""
    return get_project_root() / "backend" / "models" / "chest_model.pth"


def get_dataset_path() -> Path:
    """Get the default dataset path."""
    return get_project_root() / "dataset" / "archive" / "chest_xray" / "chest_xray"


def ensure_dir(path: Path) -> None:
    """Ensure a directory exists."""
    path.mkdir(parents=True, exist_ok=True)
