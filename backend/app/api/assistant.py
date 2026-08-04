from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..llm.assistant import GeminiAssistant
from ..rag.retriever import RAGRetriever

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])


class AssistantRequest(BaseModel):
    query: str = Field(min_length=1, description="Clinical question for assistant")
    disease_prediction: str = "Unknown"
    confidence: float = 0.0


class AssistantResponse(BaseModel):
    success: bool
    response: str
    sources: list[dict]


@router.post("", response_model=AssistantResponse)
def get_assistant_response(payload: AssistantRequest):
    normalized_query = payload.query.strip()
    if not normalized_query:
        raise HTTPException(status_code=400, detail="Query must not be empty")

    try:
        retriever = RAGRetriever()
        context = retriever.search(normalized_query, top_k=4)
        assistant = GeminiAssistant()
        result = assistant.generate_response(context, payload.disease_prediction, payload.confidence)
    except Exception as exc:  # pragma: no cover - defensive handling
        raise HTTPException(status_code=500, detail="Assistant generation failed") from exc

    return AssistantResponse(**result)
