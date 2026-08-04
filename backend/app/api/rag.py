from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..rag.retriever import RAGRetriever

router = APIRouter(prefix="/api/v1/rag", tags=["rag"])


class RAGQueryRequest(BaseModel):
    query: str = Field(min_length=1, description="Search query for medical knowledge retrieval")


class RAGQueryResponse(BaseModel):
    success: bool
    results: list[dict]


@router.post("", response_model=RAGQueryResponse)
def query_rag(payload: RAGQueryRequest):
    normalized_query = payload.query.strip()
    if not normalized_query:
        raise HTTPException(status_code=400, detail="Query must not be empty")

    try:
        retriever = RAGRetriever()
        results = retriever.search(normalized_query, top_k=4)
    except Exception as exc:  # pragma: no cover - defensive handling
        raise HTTPException(status_code=500, detail="RAG retrieval failed") from exc

    return RAGQueryResponse(success=True, results=results)
