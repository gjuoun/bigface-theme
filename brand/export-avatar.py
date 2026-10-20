#!/usr/bin/env python3
"""Render brand/bigface-avatar-master.svg into every size the site and stores need.

Run:
    DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib \
      uv run --with cairosvg --with pillow python3 brand/export-avatar.py

Writes brand/exports/bigface-avatar-<size>.png (opaque RGB) and refreshes the copies the
site serves: site/public/favicon.svg, site/public/img/bigface-avatar.svg and the
opengraph card. The master SVG is the single source; nothing here edits it.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
MASTER = ROOT / "bigface-avatar-master.svg"
EXPORTS = ROOT / "exports"
SITE_PUBLIC = REPO / "site" / "public"
OG_SVG = ROOT / "og-card.svg"
OG_PNG = SITE_PUBLIC / "img" / "og.png"

# 16/32 favicon, 180 apple-touch, 192/512 PWA, 1024 press kit.
SIZES = (16, 32, 64, 128, 180, 192, 256, 512, 1024)


def render(svg: Path, out: Path, size: int) -> None:
    cairosvg.svg2png(
        url=str(svg),
        write_to=str(out),
        output_width=size,
        output_height=size,
    )
    with Image.open(out) as im:
        opaque = im.convert("RGB")
        opaque.save(out, "PNG", optimize=True)


def main() -> None:
    if not MASTER.is_file():
        raise SystemExit(f"missing master: {MASTER}")
    EXPORTS.mkdir(exist_ok=True)

    for size in SIZES:
        target = EXPORTS / f"bigface-avatar-{size}.png"
        render(MASTER, target, size)
        print(f"  {target.relative_to(REPO)}  {size}x{size}")

    shutil.copyfile(MASTER, SITE_PUBLIC / "favicon.svg")
    shutil.copyfile(MASTER, SITE_PUBLIC / "img" / "bigface-avatar.svg")
    print("  site/public/favicon.svg, site/public/img/bigface-avatar.svg")

    favicon_32 = EXPORTS / "bigface-avatar-32.png"
    with Image.open(favicon_32) as im:
        im.convert("RGB").save(SITE_PUBLIC / "favicon-32.png", "PNG", optimize=True)
    shutil.copyfile(EXPORTS / "bigface-avatar-180.png", SITE_PUBLIC / "apple-touch-icon.png")

    if OG_SVG.is_file():
        # Inline the mark as a data URI: cairosvg resolves relative image hrefs inconsistently.
        import base64

        mark = base64.b64encode((EXPORTS / "bigface-avatar-512.png").read_bytes()).decode()
        svg = OG_SVG.read_text().replace("exports/bigface-avatar-512.png", f"data:image/png;base64,{mark}")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=str(OG_PNG), output_width=1200, output_height=630)
        with Image.open(OG_PNG) as im:
            im.convert("RGB").save(OG_PNG, "PNG", optimize=True)
        print(f"  {OG_PNG.relative_to(REPO)}  1200x630")


if __name__ == "__main__":
    main()
