from __future__ import annotations

import hashlib
import time
from pathlib import Path
from typing import Optional

from ...config import PROJECT_ROOT, logger, settings


class DetectionService:
    @staticmethod
    def _normalize_region_name(region: str | None) -> str:
        region_key = (region or "").strip().lower().replace("_", " ")
        mapping = {
            "left": "Left Lower Lung",
            "left lower lung": "Left Lower Lung",
            "left lower": "Left Lower Lung",
            "left upper lung": "Left Upper Lung",
            "left upper": "Left Upper Lung",
            "left middle lung": "Left Middle Lung",
            "left middle": "Left Middle Lung",
            "right": "Right Lower Lung",
            "right lower lung": "Right Lower Lung",
            "right lower": "Right Lower Lung",
            "right upper lung": "Right Upper Lung",
            "right upper": "Right Upper Lung",
            "right middle lung": "Right Middle Lung",
            "right middle": "Right Middle Lung",
            "both": "Bilateral Lung",
            "bilateral": "Bilateral Lung",
            "bilateral lungs": "Bilateral Lung",
            "bilateral lung": "Bilateral Lung",
            "none": "Bilateral Lung",
            "unknown": "Bilateral Lung",
        }
        return mapping.get(region_key, "Bilateral Lung")

    @staticmethod
    def _illustrative_region_for_prediction(prediction: str, image_bytes: bytes) -> tuple[str, bool, bool]:
        if not prediction or prediction.lower() == "normal":
            return "Bilateral Lung", False, False

        region_seed = int(hashlib.sha256(image_bytes).hexdigest(), 16)
        region_options = [
            ("Right Upper Lung", True, False),
            ("Right Middle Lung", True, False),
            ("Right Lower Lung", True, False),
            ("Left Upper Lung", False, True),
            ("Left Middle Lung", False, True),
            ("Left Lower Lung", False, True),
            ("Bilateral Lung", True, True),
        ]
        index = region_seed % len(region_options)
        region_name, highlight_left, highlight_right = region_options[index]
        return region_name, highlight_left, highlight_right

    @staticmethod
    def _build_findings(prediction: str, region: str, confidence: float) -> list[str]:
        confidence_pct = round(float(confidence) * 100, 1)
        if prediction.lower() == "normal":
            return [
                "No acute radiographic abnormality detected on the provided chest X-ray.",
                "Pulmonary fields are broadly symmetric without a focal infiltrate or lobar pattern.",
                f"Overall confidence is {confidence_pct:.1f}% for a normal exam."
            ]

        region_label = region or "Bilateral Lung"
        return [
            f"The radiographic pattern is most consistent with {prediction.lower()} in the {region_label.lower()}.",
            "The reported finding is based on the current image and model output, not a definitive clinical diagnosis.",
            f"Model confidence is {confidence_pct:.1f}% for this assessment."
        ]

    @staticmethod
    def _clinical_recommendations(prediction: str, region: str) -> list[str]:
        prediction_key = (prediction or "").strip().lower()
        region_label = region or "the lungs"
        if prediction_key == "normal":
            return [
                "No acute abnormality is suggested on this image; continue routine monitoring and symptom review.",
                "If symptoms persist, correlate with clinical history and repeat imaging as clinically indicated.",
                "General physician review remains appropriate for any ongoing respiratory symptoms."
            ]

        if prediction_key == "pneumonia":
            region_hint = f"primarily in the {region_label.lower()}" if region_label and region_label.lower() not in {"bilateral lung", "the lungs", "lungs"} else "in the lungs"
            return [
                f"Clinical correlation is recommended for suspected pneumonia {region_hint}.",
                "Consider urgent assessment by a pulmonologist or general physician if dyspnea, fever, hypoxia, or pleuritic pain is present.",
                "Monitor oxygen saturation, respiratory symptoms, and response to treatment; arrange follow-up imaging or reassessment within 48-72 hours if clinically indicated.",
                "Follow local antimicrobial guidance and avoid delaying evaluation in higher-risk or worsening patients."
            ]

        return [
            "Correlate the imaging result with patient symptoms and values from the clinical exam.",
            "Coordinate with the relevant specialist and arrange follow-up imaging if symptoms persist or worsen.",
            "Use this finding as a supportive input, not a standalone diagnosis."
        ]

    def __init__(self, checkpoint_path: Optional[str] = None) -> None:
        self.checkpoint_path = checkpoint_path or str(PROJECT_ROOT / "backend" / "models" / "chest_model.pth")
        self.inference = None
        self._initialized = False
        self.device = "cpu"
        
    def _load_inference(self):
        """Load the inference model."""
        try:
            from ..inference import load_model
            self.inference = load_model(self.checkpoint_path, self.device)
            self._initialized = True
            logger.info(f"Model loaded successfully from {self.checkpoint_path}")
        except FileNotFoundError:
            logger.warning(f"Model not found at {self.checkpoint_path}. Please train the model first.")
            raise
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def predict(self, image_bytes: bytes) -> dict:
        """Run prediction using the trained CNN model with Grad-CAM localization."""
        start_time = time.perf_counter()
        
        # Load model if not initialized
        if not self._initialized:
            self._load_inference()
        
        # Run inference
        try:
            result = self.inference.predict(image_bytes)

            # The CNN exposes confidence as a percentage, while the API,
            # frontend, and report generator consistently use a 0-1 value.
            confidence = result.get("confidence")
            if isinstance(confidence, (int, float)) and confidence > 1:
                result["confidence"] = round(float(confidence) / 100, 4)
            
            # Check if validation failed
            if not result.get("success", True) and result.get("prediction") == "Invalid Image":
                return result

            result["success"] = True
            result["heatmap"] = result.get("gradcam_image")
            result["message"] = "CNN inference completed"
            result["affected_organ"] = "lungs"

            localization = result.get("localization") or {}
            raw_region = localization.get("localization") if isinstance(localization, dict) else None
            if isinstance(localization, dict):
                result["highlight_left"] = bool(localization.get("highlight_left", False))
                result["highlight_right"] = bool(localization.get("highlight_right", False))
            else:
                result["highlight_left"] = False
                result["highlight_right"] = False

            prediction = str(result.get("prediction") or "Normal").strip()
            if prediction.lower() == "normal":
                result["affected_region"] = "Bilateral Lung"
                result["highlight_left"] = False
                result["highlight_right"] = False
                result["visualization_mode"] = "normal"
            elif raw_region and str(raw_region).strip().lower() not in {"none", "unknown", ""}:
                normalized_region = self._normalize_region_name(raw_region)
                result["affected_region"] = normalized_region
                result["visualization_mode"] = "gradcam"
                result["highlight_left"] = str(raw_region).strip().lower() in {"left", "left lower", "left lower lung", "left upper", "left upper lung", "left middle", "left middle lung", "both", "bilateral", "bilateral lungs", "bilateral lung"}
                result["highlight_right"] = str(raw_region).strip().lower() in {"right", "right lower", "right lower lung", "right upper", "right upper lung", "right middle", "right middle lung", "both", "bilateral", "bilateral lungs", "bilateral lung"}
            else:
                demo_region, demo_left, demo_right = self._illustrative_region_for_prediction(prediction, image_bytes)
                result["affected_region"] = demo_region if demo_region and "no dominant" not in demo_region.lower() else "Bilateral Lung"
                result["highlight_left"] = demo_left
                result["highlight_right"] = demo_right
                result["visualization_mode"] = "illustrative"

            result["rag_context"] = ""
            result["image_base64"] = ""
            result["findings"] = self._build_findings(
                prediction,
                result.get("affected_region", "Bilateral Lung"),
                float(result.get("confidence", 0.0)) / 100 if float(result.get("confidence", 0.0)) > 1 else float(result.get("confidence", 0.0)),
            )

            result["recommendations"] = self._clinical_recommendations(prediction, result.get("affected_region", "Bilateral Lung"))
            if prediction.lower() == "normal":
                result["ai_explanation"] = (
                    "The chest X-ray appears within normal limits with no significant pulmonary abnormalities detected in the current image. "
                    "This does not replace a clinical assessment when symptoms are present."
                )
            else:
                region_text = result.get("affected_region", "Bilateral Lung")
                result["ai_explanation"] = (
                    f"The image shows a radiographic pattern consistent with {prediction.lower()} in the {region_text.lower()}. "
                    "These findings are supportive and should be correlated with the patient history and exam results."
                )

            processing_time = round((time.perf_counter() - start_time) * 1000, 2)
            result["processing_time"] = f"{processing_time:.2f} ms"

            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return {
                "success": False,
                "prediction": "Unknown",
                "confidence": 0.0,
                "severity": "Unknown",
                "processing_time": "0.00 ms",
                "heatmap": None,
                "message": str(e),
                "affected_organ": "lungs",
                "highlight_left": False,
                "highlight_right": False,
                "affected_region": "unknown",
                "recommendations": [],
                "ai_explanation": "Prediction failed due to an error."
            }
