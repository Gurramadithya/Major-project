import tempfile
import unittest

from fastapi.testclient import TestClient

from backend.app.main import app


class Phase1FoundationTests(unittest.TestCase):
    def test_health_endpoint(self):
        client = TestClient(app)
        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_upload_endpoint_accepts_file(self):
        client = TestClient(app)
        with tempfile.NamedTemporaryFile(suffix=".jpg") as temp_file:
            temp_file.write(b"fake-image-content")
            temp_file.flush()
            response = client.post(
                "/api/v1/upload",
                files={"file": ("sample.jpg", temp_file.read(), "image/jpeg")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("filename", response.json())


if __name__ == "__main__":
    unittest.main()
