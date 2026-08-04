import os
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app

client = TestClient(app)
with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
    tmp.write(b'fake-image-content')
    tmp_path = tmp.name

with open(tmp_path, 'rb') as fh:
    response = client.post('/api/v1/upload', files={'file': ('sample.png', fh, 'image/png')})

print(response.status_code)
print(response.json())
os.remove(tmp_path)
