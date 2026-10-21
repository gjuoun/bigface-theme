// Finds colour literals in shipped HTML/CSS that are not palette values.
//
// Every colour on the site comes from palette/bigface.json. This scanner knows every way CSS can
// spell a colour (3/4/6/8-digit hex, rgb(), hsl()/hwb()/lab()/lch()/oklab()/oklch(), named colours),
// because Tailwind + shadcn ship oklch() greys and minified short hex that a #rrggbb regex misses.
//
// The only literals allowed besides palette values:
// - alpha-0 hex (#0000, #00000000) — Tailwind's minified `transparent`
// - `transparent`, `currentcolor`, `inherit` and friends
// - anything inside an `@supports (…)` condition (feature queries such as `color-mix(in lab, red, red)`)
// - colours inside `mask` / `mask-image` values: a mask only reads alpha, nothing is painted
// - `#fff` as Tailwind's `--tw-ring-offset-color` initial/fallback (never painted while no
//   `ring-offset-*` utility exists; site.test.ts asserts that)

const NAMED = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown " +
    "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
    "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid " +
    "darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
    "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro " +
    "ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow " +
    "lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine " +
    "mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen " +
    "mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace " +
    "olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred " +
    "papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue " +
    "saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey " +
    "snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow " +
    "yellowgreen canvas canvastext linktext visitedtext activetext buttonface buttontext field fieldtext " +
    "highlight highlighttext graytext"
  ).split(" "),
);

export interface PaletteLike {
  colors: Record<string, { hex: string }>;
  ansi: Record<string, { hex: string }>;
}

export const paletteHexes = (p: PaletteLike): Set<string> =>
  new Set([...Object.values(p.colors), ...Object.values(p.ansi)].map((c) => c.hex.toLowerCase()));

const expand = (h: string): string =>
  h.length === 3 || h.length === 4
    ? h
        .split("")
        .map((c) => c + c)
        .join("")
    : h;

/** Strip the parts of a stylesheet that are allowed to name non-palette colours. */
const stripAllowed = (css: string): string =>
  css
    // @supports conditions are feature tests, never paint
    .replace(/@supports[^{]*\{/g, "@supports{")
    // mask layers only read alpha (`linear-gradient(#000 0 0)` is the usual idiom)
    .replace(/((?:-webkit-)?mask(?:-image)?\s*:)[^;{}]*/g, "$1")
    // Tailwind's ring-offset default: the @property rule and the fallback declaration
    .replace(/@property\s+--tw-ring-offset-color\s*\{[^}]*\}/g, "")
    .replace(/(--tw-ring-offset-color\s*:\s*)#fff(?:fff)?\b/gi, "$1");

/** Colour literals in a CSS text (stylesheet, <style> block or style="" value). */
export function findForeignInCss(css: string, known: Set<string>): string[] {
  const text = stripAllowed(css);
  const bad: string[] = [];
  const triplets = new Set(
    [...known].map((h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)).join(",")),
  );

  // hex: 3/4-digit only where a value can start, 6/8-digit anywhere
  for (const m of text.matchAll(
    /(^|[\s:(,])#([0-9a-fA-F]{3,4})\b|#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  )) {
    const raw = (m[2] ?? m[3]) as string;
    const full = expand(raw.toLowerCase());
    const alpha = full.length === 8 ? full.slice(6) : "ff";
    if (alpha === "00") continue; // fully transparent
    if (!known.has(`#${full.slice(0, 6)}`)) bad.push(`#${raw}`);
  }

  for (const m of text.matchAll(/rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/g)) {
    if (!triplets.has(`${m[1]},${m[2]},${m[3]}`)) bad.push(`rgb(${m[1]},${m[2]},${m[3]})`);
  }
  for (const m of text.matchAll(/rgba?\(\s*from\s+([a-z]+)/gi)) {
    if (NAMED.has((m[1] as string).toLowerCase())) bad.push(m[0]);
  }

  for (const m of text.matchAll(/\b(hsla?|hwb|lab|lch|oklab|oklch)\(\s*([^)]*)\)/gi)) {
    const args = (m[2] as string).trim();
    // relative colour syntax built on our own variables is fine: oklch(from var(--bf-blue) …)
    if (/^from\s+var\(/.test(args)) continue;
    bad.push(m[0]);
  }

  // named colours, only inside declaration values
  for (const m of text.matchAll(/(?:^|[{;\s])([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const prop = m[1] as string;
    if (prop.startsWith("--") === false && /^(content|font-family|grid-template-areas)$/.test(prop))
      continue;
    const value = (m[2] as string)
      .replace(/"[^"]*"|'[^']*'/g, " ")
      .replace(/url\([^)]*\)/g, " ")
      .replace(/var\(\s*--[\w-]+/g, " ")
      .replace(/--[\w-]+/g, " ");
    for (const w of value.matchAll(/(?<![\w-])([a-z]+)(?![\w-])/gi)) {
      if (NAMED.has((w[1] as string).toLowerCase())) bad.push(`${prop}: ${w[1]}`);
    }
  }
  return bad;
}

/** Colour literals in an HTML document: <style> blocks, style="" attributes, and any 6/8-digit hex. */
export function findForeignInHtml(html: string, known: Set<string>): string[] {
  const bad: string[] = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
    bad.push(...findForeignInCss(m[1] as string, known));
  for (const m of html.matchAll(/\sstyle="([^"]*)"/g))
    bad.push(...findForeignInCss((m[1] as string).replace(/&quot;/g, '"'), known));
  const rest = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(/\sstyle="[^"]*"/g, "");
  for (const m of rest.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)) {
    const full = (m[1] as string).toLowerCase();
    if (full.length === 8 && full.endsWith("00")) continue;
    if (!known.has(`#${full.slice(0, 6)}`)) bad.push(`#${m[1]}`);
  }
  return bad;
}
