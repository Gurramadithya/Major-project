from __future__ import annotations

import os
from typing import Any, List

try:
    from langchain.docstore.document import Document
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import Chroma
    from langchain_community.embeddings import HuggingFaceEmbeddings
except Exception as exc:  # pragma: no cover - environment guard
    Document = Any  # type: ignore[assignment]
    RecursiveCharacterTextSplitter = None
    Chroma = None
    HuggingFaceEmbeddings = None
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

from ..config import PROJECT_ROOT, logger


class RAGRetriever:
    def __init__(self, persist_directory: str | None = None) -> None:
        self.persist_directory = persist_directory or str(PROJECT_ROOT / "vector_db")
        self.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
        self.embeddings = None
        self.text_splitter = None
        self._store = None

        if _IMPORT_ERROR is not None:
            logger.warning("RAG dependencies are unavailable: %s", _IMPORT_ERROR)
            return

        self.embeddings = HuggingFaceEmbeddings(model_name=self.embedding_model)
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)

    def _load_documents(self) -> List[dict[str, Any]]:
        knowledge_dir = PROJECT_ROOT / "knowledge_base"
        documents: List[dict[str, Any]] = []

        if not knowledge_dir.exists():
            return documents

        for file_path in sorted(knowledge_dir.iterdir()):
            if file_path.is_dir():
                continue
            if file_path.suffix.lower() in {".txt", ".md"}:
                text = file_path.read_text(encoding="utf-8")
                documents.append({"page_content": text, "metadata": {"source": str(file_path.name)}})
            elif file_path.suffix.lower() == ".pdf":
                try:
                    from pypdf import PdfReader
                except ImportError:
                    logger.warning("pypdf is not installed; skipping PDF file %s", file_path)
                    continue
                reader = PdfReader(str(file_path))
                content = "\n".join(page.extract_text() or "" for page in reader.pages)
                documents.append({"page_content": content, "metadata": {"source": str(file_path.name)}})

        return documents

    def build_or_load_index(self) -> None:
        documents = self._load_documents()
        if not documents:
            self._store = None
            return

        if self.text_splitter is None or self.embeddings is None or Chroma is None:
            self._store = None
            return

        chunks = []
        for document in documents:
            chunk = type("Chunk", (), {"page_content": document["page_content"], "metadata": document["metadata"]})()
            chunks.append(chunk)

        os.makedirs(self.persist_directory, exist_ok=True)
        self._store = Chroma.from_documents(
            chunks,
            self.embeddings,
            persist_directory=self.persist_directory,
        )

    def search(self, query: str, top_k: int = 4) -> List[dict]:
        if self._store is None:
            self.build_or_load_index()

        if self._store is None:
            return []

        if self._store is None:
            return []

        results = self._store.similarity_search_with_score(query, k=top_k)
        return [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", "unknown"),
                "score": round(float(score), 4),
            }
            for doc, score in results
        ]
