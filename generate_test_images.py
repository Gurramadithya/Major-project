import os
import numpy as np
from PIL import Image

root = os.path.join(os.path.dirname(__file__), 'dataset')
os.makedirs(root, exist_ok=True)

# Valid chest X-ray 1
img1 = np.ones((800, 700, 3), dtype=np.uint8) * 230
for y in range(int(800 * 0.18), int(800 * 0.82)):
    for x in range(int(700 * 0.18), int(700 * 0.5)):
        if abs(x - 700 * 0.35) < 80 and abs(y - 800 * 0.5) < 200:
            img1[y, x] = 180
    for x in range(int(700 * 0.5), int(700 * 0.82)):
        if abs(x - 700 * 0.65) < 80 and abs(y - 800 * 0.5) < 200:
            img1[y, x] = 180
for y in range(int(800 * 0.15), int(800 * 0.85)):
    for x in range(int(700 * 0.42), int(700 * 0.58)):
        img1[y, x] = 210
Image.fromarray(img1).save(os.path.join(root, 'valid_chest_xray_1.png'))

# Valid chest X-ray 2 with shifted anatomy to produce a different result
img2 = np.ones((800, 700, 3), dtype=np.uint8) * 230
for y in range(int(800 * 0.18), int(800 * 0.82)):
    for x in range(int(700 * 0.25), int(700 * 0.52)):
        if abs(x - 700 * 0.38) < 90 and abs(y - 800 * 0.55) < 180:
            img2[y, x] = 170
    for x in range(int(700 * 0.48), int(700 * 0.80)):
        if abs(x - 700 * 0.68) < 90 and abs(y - 800 * 0.45) < 160:
            img2[y, x] = 170
for y in range(int(800 * 0.12), int(800 * 0.88)):
    for x in range(int(700 * 0.45), int(700 * 0.55)):
        img2[y, x] = 205
Image.fromarray(img2).save(os.path.join(root, 'valid_chest_xray_2.png'))

# Invalid face-like image
img3 = np.zeros((700, 700, 3), dtype=np.uint8)
img3[:] = (220, 200, 180)
for y in range(200, 500):
    for x in range(200, 500):
        if (x - 350) ** 2 + (y - 350) ** 2 <= 150 ** 2:
            img3[y, x] = (180, 140, 120)
img3[250:450, 250:450] = (200, 150, 120)
Image.fromarray(img3).save(os.path.join(root, 'invalid_face.png'))

print('created:', sorted(os.listdir(root)))
