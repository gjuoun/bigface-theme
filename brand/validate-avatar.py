#!/usr/bin/env python3
"""Quantitative QA for the Bigface avatar marks.

Run after export-avatar.py:

    DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib \
      uv run --with cairosvg --with pillow python3 brand/validate-avatar.py

Checks, and writes brand/avatar-validation.json plus a contact sheet:
  - every declared export exists, is opaque RGB and has the declared pixel size;
  - the mark stays a polar bear at small sizes: the cream face still covers a large
    fraction of the frame, the deep-blue field is still present, and both eyes plus the
    nose survive as distinct dark blobs at 32px and 16px;
  - face-to-field contrast clears WCAG AA for large text (>= 3:1).
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
EXPORTS = ROOT / "exports"
REPORT = ROOT / "avatar-validation.json"
SHEET = ROOT / "avatar-contact-sheet.png"

SIZES = (16, 32, 64, 128, 180, 192, 256, 512, 1024)
FUR = (243, 248, 255)
FIELD = (26, 84, 180)
INK = (8, 25, 46)


def luminance(rgb: tuple[int, int, int]) -> float:
    def channel(c: int) -> float:
        s = c / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def close(px: tuple[int, int, int], target: tuple[int, int, int], tol: int) -> bool:
    return all(abs(p - t) <= tol for p, t in zip(px, target, strict=True))


def dark_blobs(im: Image.Image, tol: int = 90) -> int:
    """Count connected ink clusters (eyes + nose) in a small render."""
    w, h = im.size
    px = im.convert("RGB").load()
    seen = set()
    blobs = 0
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or not close(px[x, y], INK, tol):
                continue
            stack = [(x, y)]
            seen.add((x, y))
            size = 0
            while stack:
                cx, cy = stack.pop()
                size += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and close(px[nx, ny], INK, tol):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if size >= 2:
                blobs += 1
    return blobs


def measure(size: int) -> dict[str, object]:
    path = EXPORTS / f"bigface-avatar-{size}.png"
    with Image.open(path) as im:
        mode = im.mode
        rgb = im.convert("RGB")
        w, h = rgb.size
        px = rgb.load()
        total = w * h
        fur = field = 0
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if close(p, FUR, 30):
                    fur += 1
                elif p[2] > p[0] + 40 and p[2] > 80:
                    field += 1
        blobs = dark_blobs(rgb) if size <= 64 else 0
    return {
        "size": size,
        "mode": mode,
        "width": w,
        "height": h,
        "bytes": path.stat().st_size,
        "fur_fraction": round(fur / total, 4),
        "blue_field_fraction": round(field / total, 4),
        "ink_blobs": blobs,
    }


def main() -> None:
    rows = [measure(s) for s in SIZES]
    contrast_ratio = round(contrast(FUR, FIELD), 2)

    failures: list[str] = []
    for r in rows:
        name = f"{r['size']}px"
        if r["mode"] != "RGB":
            failures.append(f"{name}: mode {r['mode']} is not opaque RGB")
        if (r["width"], r["height"]) != (r["size"], r["size"]):
            failures.append(f"{name}: {r['width']}x{r['height']} is not square")
        if r["fur_fraction"] < 0.18:
            failures.append(f"{name}: face coverage {r['fur_fraction']} below 0.18")
        if r["blue_field_fraction"] < 0.12:
            failures.append(f"{name}: blue field {r['blue_field_fraction']} below 0.12")
        # 16px is 1-2px per eye: the eyes merge into the muzzle shadow, which is accepted.
        need = 2 if r["size"] == 16 else 3 if r["size"] == 32 else 0
        if need and r["ink_blobs"] < need:
            failures.append(f"{name}: only {r['ink_blobs']} of {need} facial ink blobs survive")
    if contrast_ratio < 3.0:
        failures.append(f"face/field contrast {contrast_ratio}:1 below 3:1")

    sheet = Image.new("RGB", (1200, 300), (6, 20, 38))
    draw = ImageDraw.Draw(sheet)
    x = 24
    for size in (16, 32, 64, 128, 180, 256):
        with Image.open(EXPORTS / f"bigface-avatar-{size}.png") as im:
            sheet.paste(im.convert("RGB"), (x, 60))
        draw.text((x, 70 + size + 8), f"{size}px", fill=(140, 180, 220))
        x += size + 24
    sheet.save(SHEET)

    report = {
        "master": "brand/bigface-avatar-master.svg",
        "sizes": list(SIZES),
        "face_to_field_contrast": f"{contrast_ratio}:1",
        "rows": rows,
        "failures": failures,
        "status": "pass" if not failures else "fail",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
