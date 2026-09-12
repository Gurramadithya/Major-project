import requests

base = 'http://127.0.0.1:8002'
invalid_path = r'E:\MedicalAIProject\dataset\invalid_face.png'
valid_paths = [
    (r'E:\MedicalAIProject\dataset\valid_chest_xray_1.png', 'valid_chest_xray_1.png'),
    (r'E:\MedicalAIProject\dataset\valid_chest_xray_2.png', 'valid_chest_xray_2.png'),
]

with open(invalid_path, 'rb') as f:
    invalid_response = requests.post(
        base + '/api/v1/upload',
        files={'file': ('invalid_face.png', f, 'image/png')},
        timeout=30,
    )
print('INVALID_UPLOAD', invalid_response.status_code, invalid_response.text[:400])

for path, name in valid_paths:
    with open(path, 'rb') as f:
        upload_response = requests.post(
            base + '/api/v1/upload',
            files={'file': (name, f, 'image/png')},
            timeout=30,
        )
    print('VALID_UPLOAD', name, upload_response.status_code, upload_response.text[:500])
    case_id = upload_response.json()['case_id']
    with open(path, 'rb') as f:
        detect_response = requests.post(
            base + '/api/v1/detect',
            files={'file': (name, f, 'image/png')},
            data={'case_id': case_id},
            timeout=90,
        )
    body = detect_response.json()
    print('DETECT', name, body.get('prediction'), body.get('confidence'), body.get('severity'), body.get('affected_region'), body.get('visualization_mode'))
    report_response = requests.get(base + f'/api/v1/reports/download/{case_id}', timeout=60)
    print('PDF', name, report_response.status_code, report_response.headers.get('content-type'), len(report_response.content))
