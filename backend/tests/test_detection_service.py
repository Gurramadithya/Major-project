import unittest

from backend.app.ai.services.detection_service import DetectionService


class DummyInference:
    def predict(self, image_bytes):
        return {
            "prediction": "Pneumonia",
            "confidence": 0.87,
            "severity": "Moderate",
            "success": True,
            "localization": {
                "localization": "left",
                "highlight_left": True,
                "highlight_right": False,
            },
        }


class DetectionServiceTests(unittest.TestCase):
    def test_pneumonia_result_has_findings_and_region_specific_recommendations(self):
        service = DetectionService(checkpoint_path="unused.pth")
        service._initialized = True
        service.inference = DummyInference()

        result = service.predict(b"fake-image")

        self.assertTrue(result["success"])
        self.assertIn("findings", result)
        self.assertIn("affected_region", result)
        self.assertTrue(result["affected_region"])
        self.assertGreater(len(result["recommendations"]), 0)
        joined = "\n".join(result["recommendations"]).lower()
        self.assertIn("left", joined)

    def test_illustrative_region_is_used_when_localization_is_missing(self):
        service = DetectionService(checkpoint_path="unused.pth")
        service._initialized = True

        class MissingLocalizationInference:
            def predict(self, image_bytes):
                return {
                    "prediction": "Pneumonia",
                    "confidence": 0.92,
                    "severity": "Moderate",
                    "success": True,
                    "localization": {"localization": "none", "highlight_left": False, "highlight_right": False},
                }

        service.inference = MissingLocalizationInference()
        result = service.predict(b"a-valid-xray-image")

        self.assertTrue(result["success"])
        self.assertNotEqual(result["affected_region"], "No dominant lung region")
        self.assertIn(result["affected_region"], {
            "Right Upper Lung",
            "Right Middle Lung",
            "Right Lower Lung",
            "Left Upper Lung",
            "Left Middle Lung",
            "Left Lower Lung",
            "Bilateral Lung",
        })

    def test_findings_and_recommendations_do_not_use_placeholder_region_text(self):
        service = DetectionService(checkpoint_path="unused.pth")
        service._initialized = True

        class MissingLocalizationInference:
            def predict(self, image_bytes):
                return {
                    "prediction": "Pneumonia",
                    "confidence": 0.92,
                    "severity": "Moderate",
                    "success": True,
                    "localization": {"localization": "none", "highlight_left": False, "highlight_right": False},
                }

        service.inference = MissingLocalizationInference()
        result = service.predict(b"a-valid-xray-image")

        self.assertTrue(result["success"])
        self.assertNotIn("No dominant lung region", result["affected_region"])
        joined_findings = " ".join(result["findings"]).lower()
        joined_recommendations = " ".join(result["recommendations"]).lower()
        self.assertNotIn("no dominant lung region", joined_findings)
        self.assertNotIn("no dominant lung region", joined_recommendations)


if __name__ == "__main__":
    unittest.main()
