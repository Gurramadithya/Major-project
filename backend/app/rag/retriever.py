from __future__ import annotations

import os
from typing import Any, List

try:
    from langchain.docstore.document import Document
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    try:
        from langchain_community.vectorstores import Chroma
        from langchain_community.embeddings import HuggingFaceEmbeddings
    except ImportError:
        # LangChain 0.0.x exposes these integrations from its main package.
        from langchain.vectorstores import Chroma
        from langchain.embeddings import HuggingFaceEmbeddings
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
    _instance = None
    _embeddings = None
    _text_splitter = None
    
    def __new__(cls, persist_directory: str | None = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, persist_directory: str | None = None) -> None:
        self.persist_directory = persist_directory or str(PROJECT_ROOT / "vector_db")
        self.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
        self.collection_name = "medical_knowledge"
        self._store = None

        if _IMPORT_ERROR is not None:
            logger.warning("RAG dependencies are unavailable: %s", _IMPORT_ERROR)
            return

        # Cache embedding model and text splitter to avoid reloading
        if RAGRetriever._embeddings is None:
            RAGRetriever._embeddings = HuggingFaceEmbeddings(model_name=self.embedding_model)
        if RAGRetriever._text_splitter is None:
            RAGRetriever._text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
        
        self.embeddings = RAGRetriever._embeddings
        self.text_splitter = RAGRetriever._text_splitter

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
            logger.warning("No documents found in knowledge_base")
            self._store = None
            return

        if self.text_splitter is None or self.embeddings is None or Chroma is None:
            logger.warning("RAG dependencies not available")
            self._store = None
            return

        # Create proper Document objects
        docs = [Document(page_content=doc["page_content"], metadata=doc["metadata"]) for doc in documents]
        
        # Split documents into chunks
        chunks = self.text_splitter.split_documents(docs)
        logger.info(f"Created {len(chunks)} chunks from {len(docs)} documents")

        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Always create fresh index for this implementation
        logger.info("Creating new Chroma index")
        self._store = Chroma.from_documents(
            chunks,
            self.embeddings,
            collection_name=self.collection_name,
            persist_directory=self.persist_directory,
        )
        logger.info(f"Index created with {len(chunks)} chunks")

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
