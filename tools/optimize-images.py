# Tao ban .webp cho moi anh jpg/png trong assets/img + ghi kich thuoc vao data/img-meta.json
# (build.js dung file nay de gan width/height va doi src sang .webp).
# Giu nguyen file goc (og:image van dung jpg/png cho Facebook/Zalo).
# Chay: python tools/optimize-images.py
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'assets', 'img')
MAX_W = 1200

meta = {}
for name in sorted(os.listdir(IMG)):
    base, ext = os.path.splitext(name)
    src = os.path.join(IMG, name)
    if ext.lower() == '.gif':  # gif dong: giu nguyen, chi lay kich thuoc
        with Image.open(src) as im:
            meta[name] = {'w': im.width, 'h': im.height}
        continue
    if ext.lower() not in ('.jpg', '.jpeg', '.png') or name in ('favicon-32.png', 'apple-touch-icon.png', 'logo-512.png'):
        continue
    dst = os.path.join(IMG, base + '.webp')
    with Image.open(src) as im:
        im.load()
        if im.mode in ('P', 'LA') or (im.mode == 'RGBA'):
            im = im.convert('RGBA')
        elif im.mode != 'RGB':
            im = im.convert('RGB')
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            im.save(dst, 'WEBP', quality=80, method=6)
        meta[name] = {'w': im.width, 'h': im.height, 'webp': base + '.webp'}

with open(os.path.join(ROOT, 'data', 'img-meta.json'), 'w', encoding='utf8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=0)
print('Da xu ly', len(meta), 'anh')
