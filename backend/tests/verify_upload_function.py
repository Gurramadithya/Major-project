import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.api.upload import upload_file
from fastapi import UploadFile


class DummyFile:
    def __init__(self, data: bytes):
        self._data = data

    def read(self) -> bytes:
        return self._data

    def close(self) -> None:
        return None


class DummyUploadFile(UploadFile):
    def __init__(self, filename: str, data: bytes):
        super().__init__(filename=filename, file=DummyFile(data))


result = upload_file(DummyUploadFile('sample.png', b'fake-image-content'))
print(result.model_dump())
