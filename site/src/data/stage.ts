// The site's own chrome ("the stage"), derived from palette/bigface.json instead of hand-picked.
//
// Bigface has no blue surface: its surfaces are a green-grey ladder (bgDeep #1f231f, bg #252925,
// bgPanel #2e332e) and its only blues are accents (#00b0ff, #81d4fa, #40c4ff, #b3e5fc). The site
// needs a darker stage so the palette reads as an object, so every stage colour is computed as:
//
//   hue     = OKLCH hue of the palette's "blue" (#00b0ff)
//   lightness = the palette's bgDeep, shifted by a stated offset per step
//   chroma  = stated per step, clamped to the sRGB gamut at that lightness
//
// The only authored inputs are the offsets and chroma below; everything chromatic comes from the
// palette. Swap the accent in palette/bigface.json and the whole site re-hues itself.

import { hex } from "./palette.ts";

type Oklch = { l: number; c: number; h: number };

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const encode = (c: number) =>
  Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
const clamp = (c: number) => Math.min(1, Math.max(0, c));

export function toOklch(color: string): Oklch {
  const [r, g, b] = [1, 3, 5].map((i) => channel(Number.parseInt(color.slice(i, i + 2), 16) / 255));
  const l = 0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!;
  const m = 0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!;
  const s = 0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!;
  const [l_, m_, s_] = [l, m, s].map((v) => Math.cbrt(v));
  const L = 0.2104542553 * l_! + 0.793617785 * m_! - 0.0040720468 * s_!;
  const a = 1.9779984951 * l_! - 2.428592205 * m_! + 0.4505937099 * s_!;
  const bb = 0.0259040371 * l_! + 0.7827717662 * m_! - 0.808675766 * s_!;
  const h = (Math.atan2(bb, a) * 180) / Math.PI;
  return { l: L, c: Math.hypot(a, bb), h: (h + 360) % 360 };
}

function rgbOf({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function inGamut(color: Oklch): boolean {
  return rgbOf(color).every((v) => v >= -0.001 && v <= 1.001);
}

function hexOf(color: Oklch): string {
  let c = color.c;
  while (c > 0 && !inGamut({ ...color, c })) c -= 0.002;
  return `#${rgbOf({ ...color, c })
    .map((v) =>
      Math.min(255, Math.max(0, encode(clamp(v))))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Hue of the palette's keyword/link blue — the one chromatic input to the stage. */
export const stageHue = (): number => toOklch(hex("blue")).h;

/** Surface steps: lightness offsets from the palette's bgDeep, plus their chroma. */
const SURFACE = {
  bg: { dl: -0.093, c: 0.033 },
  bg2: { dl: -0.06, c: 0.041 },
  panel: { dl: -0.039, c: 0.051 },
  panel2: { dl: -0.001, c: 0.061 },
} as const;

/** Ink steps: lightness offsets from the palette's foreground, plus their chroma. */
const INK = {
  fg: { dl: 0.074, c: 0.016 },
  muted: { dl: -0.097, c: 0.047 },
  dim: { dl: -0.177, c: 0.052 },
} as const;

export function stage(): Record<string, string> {
  const h = stageHue();
  const surfaceBase = toOklch(hex("bgDeep")).l;
  const inkBase = toOklch(hex("fg")).l;
  const out: Record<string, string> = {};
  for (const [name, step] of Object.entries(SURFACE)) {
    out[name] = hexOf({ l: surfaceBase + step.dl, c: step.c, h });
  }
  for (const [name, step] of Object.entries(INK)) {
    out[name] = hexOf({ l: inkBase + step.dl, c: step.c, h });
  }
  return out;
}

/** Hairlines: same hue, a mid-lightness band, emitted as an "r,g,b" triplet for rgba(). */
export function stageLine(): string {
  const hexLine = hexOf({ l: 0.72, c: 0.075, h: stageHue() });
  return [1, 3, 5].map((i) => Number.parseInt(hexLine.slice(i, i + 2), 16)).join(", ");
}
