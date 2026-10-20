# Bigface brand marks

The site's identity is one mark: **a polar bear on a deep blue field**. Bigface is a mascot theme —
the bear is the face, the blue is the palette's own keyword/link colour (`#00b0ff`) pushed into a
field, so the mark and the theme are the same hue family.

## Master

- File: `brand/bigface-avatar-master.svg`
- Canvas: `512 × 512`, `viewBox="0 0 512 512"`, opaque, no external fonts, filters or linked assets
- Structure: 2 background rects, 1 aurora path, 4 sparkle paths, 2 ears + 2 inner ears, 1 head path,
  1 muzzle ellipse, 2 eyes + 2 catchlights, 1 nose path, 3 mouth strokes
- Colours: field `#2E7BE6 → #1A54B4 → #08265C`, fur `#FFFFFF → #D6E6FA`, ink `#08192E`

The master is the single source. Nothing below edits it; every raster is rendered from it.

## Concept

- **Polar bear, not a generic bear**: cream fur, small round ears, low wide muzzle, no fur markings —
  it reads as polar at 32 px from silhouette alone, without colour cues.
- **Face fills the frame**: head occupies ~64 % of the width, so the same file works as an app icon, a
  favicon and a social avatar without a separate "icon" variant.
- **Blue as a field, not a wash**: a three-stop diagonal gradient plus a radial ice glow behind the
  head. The glow is what keeps the cream face from looking pasted on.
- **Four sparkles**: the only decoration, all outside the head silhouette so they never compete with
  the face at small sizes.

## Exports

`brand/export-avatar.py` renders and copies everything the site serves:

| Output | Size | Used by |
|---|---|---|
| `brand/exports/bigface-avatar-16.png` | 16 | store listings, press kit |
| `brand/exports/bigface-avatar-32.png` | 32 | favicon fallback |
| `brand/exports/bigface-avatar-64.png` | 64 | press kit |
| `brand/exports/bigface-avatar-128.png` | 128 | press kit |
| `brand/exports/bigface-avatar-180.png` | 180 | `site/public/apple-touch-icon.png` |
| `brand/exports/bigface-avatar-192.png` | 192 | press kit |
| `brand/exports/bigface-avatar-256.png` | 256 | press kit |
| `brand/exports/bigface-avatar-512.png` | 512 | the OG card |
| `brand/exports/bigface-avatar-1024.png` | 1024 | press kit |
| `site/public/favicon.svg` | vector | `<link rel="icon" type="image/svg+xml">` |
| `site/public/favicon-32.png` | 32 | `<link rel="icon" sizes="32x32">` |
| `site/public/img/bigface-avatar.svg` | vector | header, footer, hero |
| `site/public/img/og.png` | 1200 × 630 | OpenGraph / Twitter card |

Run it from the repo root:

```bash
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib bun run brand
```

(`DYLD_FALLBACK_LIBRARY_PATH` is a macOS-only detail: Homebrew's `libcairo` is not on the default
dyld search path, so `cairosvg` cannot find it otherwise.)

## The social card

`brand/og-card.svg` is the 1200 × 630 OpenGraph card: the mark in a squircle, the wordmark, the
one-line pitch, the eight headline accents and the site URL. `export-avatar.py` inlines the 512 px
render into the SVG as a data URI before rendering, so the card never depends on relative paths.

## Quantitative validation

```bash
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib bun run brand:check
```

Writes `brand/avatar-validation.json` and `brand/avatar-contact-sheet.png`. Recorded run:

```text
Face / field contrast (WCAG)     6.62:1   (AA for large text is 3:1)
Face coverage, 512 px            0.3210 of the frame
Blue field coverage, 512 px      0.6355 of the frame
Distinct facial ink blobs, 32 px 5        (both eyes, nose, both mouth corners)
Distinct facial ink blobs, 16 px 2        (eyes merge into the muzzle; accepted)
```

Every export is checked for: exact declared size, opaque `RGB` mode, face coverage ≥ 0.18, blue field
coverage ≥ 0.12, and that the facial features survive at 32 px and 16 px.

## Known limits

- The 16 px export is a silhouette, not a portrait: the eyes and mouth merge. At that size the mark is
  recognisable as "a face on blue", which is all a browser tab can carry.
- This is a flat, hand-authored vector. It is not a reconstruction of, or a pixel match to, any
  raster source, so there is no fidelity metric to disclose — only the checks above.
- Do not recolour the field to Bigface's own `#252925`: the mark's job is to sit beside the theme, not
  inside it. A monochrome variant would need its own contrast pass.
