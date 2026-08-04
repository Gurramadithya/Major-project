from .assistant import router as assistant_router
from .detection import router as detection_router
from .rag import router as rag_router
from .reports import router as reports_router
from .upload import router as upload_router

__all__ = ["upload_router", "detection_router", "rag_router", "assistant_router", "reports_router"]
