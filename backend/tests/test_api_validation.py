import unittest

from fastapi.testclient import TestClient

from backend.app.main import app


class ApiValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_rag_rejects_empty_query(self) -> None:
        response = self.client.post('/api/v1/rag', json={'query': '   '})
        self.assertEqual(response.status_code, 400)

    def test_assistant_rejects_empty_query(self) -> None:
        response = self.client.post('/api/v1/assistant', json={'query': '   '})
        self.assertEqual(response.status_code, 400)


if __name__ == '__main__':
    unittest.main()
