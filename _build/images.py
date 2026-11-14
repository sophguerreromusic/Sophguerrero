import sys
from PIL import Image, ImageOps, ImageEnhance
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
g = ImageOps.grayscale(im)
g = ImageOps.autocontrast(g, cutoff=1)
g = ImageEnhance.Contrast(g).enhance(1.12)
duo = ImageOps.colorize(g, black=(18,17,21), mid=(107,91,140), white=(242,239,234), midpoint=110)
# portrait crops
for w in (640, 1080, 1600):
    d = duo.copy(); d.thumbnail((w, w*2))
    d.save(f'{out}/sophia-guerrero-dj-manila-{w}.webp', quality=72, method=6)
    if w == 1080: d.save(f'{out}/sophia-guerrero-dj-manila-{w}.jpg', quality=74, optimize=True, progressive=True)
# social card 1200x630, face is right of centre ~ upper 45%
W,H = duo.size
crop_h = int(W*630/1200)
top = int(H*0.30)
og = duo.crop((0, top, W, top+crop_h)).resize((1200,630), Image.LANCZOS)
og.save(f'{out}/og-sophia-guerrero.jpg', quality=78, optimize=True, progressive=True)
