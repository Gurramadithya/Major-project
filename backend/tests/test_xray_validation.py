import io
import unittest

import numpy as np
from PIL import Image

from backend.app.ai.inference import validate_lung_xray_image


class XrayValidationTests(unittest.TestCase):
    @staticmethod
    def _png_bytes(img):
        buffer = io.BytesIO()
        Image.fromarray(img).save(buffer, format='PNG')
        return buffer.getvalue()

    def test_valid_chest_xray_is_accepted(self):
        h, w = 800, 700
        img = np.ones((h, w, 3), dtype=np.uint8) * 230
        for y in range(int(h * 0.18), int(h * 0.82)):
            for x in range(int(w * 0.18), int(w * 0.5)):
                if abs(x - w * 0.35) < 80 and abs(y - h * 0.5) < 200:
                    img[y, x] = 180
            for x in range(int(w * 0.5), int(w * 0.82)):
                if abs(x - w * 0.65) < 80 and abs(y - h * 0.5) < 200:
                    img[y, x] = 180
        for y in range(int(h * 0.15), int(h * 0.85)):
            for x in range(int(w * 0.42), int(w * 0.58)):
                img[y, x] = 210
        self.assertTrue(validate_lung_xray_image(self._png_bytes(img)))

    def test_face_photo_is_rejected(self):
        img = np.zeros((700, 700, 3), dtype=np.uint8)
        img[:] = (220, 200, 180)
        for y in range(200, 500):
            for x in range(200, 500):
                if (x - 350) ** 2 + (y - 350) ** 2 <= 150 ** 2:
                    img[y, x] = (180, 140, 120)
        img[250:450, 250:450] = (200, 150, 120)
        self.assertFalse(validate_lung_xray_image(self._png_bytes(img)))

    def test_screenshot_and_non_chest_medical_images_are_rejected(self):
        screenshot = np.full((900, 1200, 3), 245, dtype=np.uint8)
        screenshot[100:820, 120:1080] = 235
        screenshot[200:250, 180:1020] = 200
        screenshot[300:760, 220:980] = 245
        for y in range(320, 700, 20):
            for x in range(240, 960, 18):
                screenshot[y:y + 8, x:x + 8] = 210
        self.assertFalse(validate_lung_xray_image(self._png_bytes(screenshot)))

        brain = np.full((720, 720, 3), 220, dtype=np.uint8)
        brain[160:560, 160:560] = 180
        for y in range(220, 500):
            for x in range(220, 500):
                if abs(x - 360) < 100 and abs(y - 360) < 90:
                    brain[y, x] = 90
        self.assertFalse(validate_lung_xray_image(self._png_bytes(brain)))

        hand = np.full((700, 500, 3), 210, dtype=np.uint8)
        hand[:, 120:380] = 180
        self.assertFalse(validate_lung_xray_image(self._png_bytes(hand)))


if __name__ == '__main__':
    unittest.main()
