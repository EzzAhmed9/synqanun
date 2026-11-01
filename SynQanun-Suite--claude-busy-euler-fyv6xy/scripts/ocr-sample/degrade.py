"""Turn the two clean page renders into a believable office scan."""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(26)
pages = []
for lang, angle in (('ar', 0.6), ('en', -0.45)):
    img = Image.open(f'{src}/clean-{lang}.png').convert('L')
    # Paper is never white and the platen is never square.
    img = img.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor=255)
    img = img.filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(img).astype(np.float64)
    a = a * 0.86 + 22                      # lifted blacks, greyed paper
    a += rng.normal(0, 7, a.shape)         # sensor noise
    specks = rng.random(a.shape) < 0.0009  # dust
    a[specks] = rng.uniform(40, 120, specks.sum())
    shade = np.linspace(0, 14, a.shape[1])[None, :]  # uneven lamp
    a -= shade
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    pages.append((lang, img))

for lang, img in pages:
    img.save(f'{out}/ocr-sample-scan-{lang}.jpg', quality=72, optimize=True)
# An image-only PDF, which is what a scanner produces: no text layer at all.
first, rest = pages[0][1], [p[1] for p in pages[1:]]
first.save(f'{out}/ocr-sample-scan.pdf', save_all=True, append_images=rest, resolution=150, quality=72)
print('ok')
