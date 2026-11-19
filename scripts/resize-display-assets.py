"""Resize shipped images that are much larger than they are ever displayed.

Masters live in Asset/masters/ (same relative path) and are never shipped; this
writes the display copies into Asset/. Run after replacing a master:

    python scripts/resize-display-assets.py

Every target keeps at least ~1.5x the largest on-screen size measured on an
iPhone at 3x and on iPad (see TESTING.md, "Image sizes"), so nothing is shown
at lower resolution than before. Images that are already shown at or above
their own size (backgrounds, opening, judgement words, speaker, run sheets)
are deliberately not listed.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSET = ROOT / 'Asset'
MASTERS = ASSET / 'masters'

# path relative to Asset/ -> (max width, max height); aspect ratio is kept.
TARGETS = {
    **{f'world/cast-neon/{c}{s}.png': (640, 640)
       for c in ('red', 'blue', 'pink', 'green', 'purple') for s in ('', '-hands')},  # shown <= 410px
    'world/play-icon.png': (320, 320),            # shown <= 132px
    'cosmo-coin.png': (256, 256),                 # shown <= 96px (DOM), ~137px (iPad canvas)
    'world/title-arcade.png': (1600, 534),        # shown <= 1020px wide
    'world/menu-icons.png': (576, 384),           # 3x2 cells of 192px, shown <= 111px
    'world/menu-extra-icons.png': (576, 192),     # 3x1 cells of 192px, shown <= 111px
    'world/ui-panel.png': (640, 640),             # 10% border slice = 64px, shown <= 57px; centre is flat
    'social/X.png': (256, 256),                   # shown <= 90px
    'social/instagram.png': (256, 256),
    'social/TikTok.png': (256, 256),
}


def main():
    for rel, (mw, mh) in TARGETS.items():
        dst, src = ASSET / rel, MASTERS / rel
        if not src.exists():
            if not dst.exists():
                raise SystemExit(f'missing {rel}')
            src.parent.mkdir(parents=True, exist_ok=True)
            src.write_bytes(dst.read_bytes())   # first run: keep the original as the master
        im = Image.open(src)
        im.load()
        scale = min(1.0, mw / im.width, mh / im.height)
        size = (round(im.width * scale), round(im.height * scale))
        mode = im.mode
        work = im.convert('RGBA').convert('RGBa')   # resample with premultiplied alpha: no dark fringes
        out = work.resize(size, Image.LANCZOS).convert('RGBA')
        if mode in ('RGB', 'P', 'L') and out.getextrema()[3] == (255, 255):
            out = out.convert('RGB')
        out.save(dst, optimize=True)
        print(f'{rel}: {im.width}x{im.height} -> {size[0]}x{size[1]}  '
              f'{src.stat().st_size // 1024}KB -> {dst.stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
