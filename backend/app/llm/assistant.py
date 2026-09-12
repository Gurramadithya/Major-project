from __future__ import annotations

import os
from typing import Optional

from ..config import logger

try:
    import google.generativeai as genai
except Exception as exc:  # pragma: no cover - environment guard
    genai = None
    logger.warning("google-generativeai is unavailable: %s", exc)


class GeminiAssistant:
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self._model = None
        self._configured = False

        if genai is not None and self.api_key:
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel("gemini-1.5-flash")
            self._configured = True

    def generate_response(self, context: list[dict], disease_prediction: str, confidence: float) -> dict:
        if not self._configured:
            # Fallback response when Gemini is not configured
            documents = "\n\n".join(item.get("content", "") for item in context)
            
            fallback_response = f"""
Based on the detection of {disease_prediction} with {confidence:.0%} confidence:

1. **Condition Explanation**: The detected pattern suggests potential {disease_prediction.lower()}. This should be correlated with clinical symptoms and patient history.

2. **Treatment Considerations**: Conservative management with monitoring is recommended. Consult with appropriate specialists for definitive treatment planning.

3. **Specialist Consultation**: Based on the detection, consultation with a relevant specialist is advised for further evaluation and management.

4. **Important Note**: This is AI-generated information based on image analysis only and should not be used as a medical diagnosis. Always consult with qualified healthcare professionals.

{f"Context from medical literature: {documents[:200]}..." if documents else ""}
            """.strip()
            
            return {
                "success": True,
                "response": fallback_response,
                "sources": context,
            }

        documents = "\n\n".join(item.get("content", "") for item in context)
        prompt = f"""
You are a surgical assistant. Use the provided medical context to explain the case in simple medical language.
The disease detection output says: {disease_prediction} with confidence {confidence}.
Context:
{documents}

Provide:
1. A short explanation of the likely condition in plain language.
2. Possible treatment considerations.
3. Which specialist should be consulted.
4. A clear note that this is AI-generated and not a medical diagnosis.
"""

        try:
            response = self._model.generate_content(prompt)
            text = getattr(response, "text", str(response))
        except Exception as exc:  # pragma: no cover - defensive handling
            logger.exception("Gemini assistant generation failed")
            return {
                "success": False,
                "response": f"The assistant could not generate a response: {exc}",
                "sources": [],
            }

        return {
            "success": True,
            "response": text,
            "sources": context,
        }
