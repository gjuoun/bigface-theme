import { z } from "zod";

const Hex = z.string().regex(/^#[0-9a-f]{6}$/, "6-digit lowercase hex like #00b0ff");

/**
 * Where a colour comes from.
 * - `jetbrains:<OPTION>#<FIELD>` — an attribute in the original scheme (e.g. `DEFAULT_KEYWORD#FOREGROUND`)
 * - `jetbrains:colors#<KEY>`     — a `<colors>` option in the original scheme (e.g. `CARET_ROW_COLOR`)
 * - `alias:<colour>`            — a standard slot (ANSI) borrowing one of the scheme's colours
 * - `dark:<colour>`             — Bigface Light borrowing the same-named colour of the dark palette
 * - `derived:<colour>`          — Bigface Light computing the value from that dark colour
 *
 * There is deliberately no "invented" option: every colour the themes use has to exist in the
 * original scheme (or, for the light palette, be derived from a colour that does), so a tool that
 * wants a surface the scheme lacks is given one of the scheme's existing surfaces instead of a new
 * blend.
 */
const Source = z
  .string()
  .regex(
    /^(jetbrains:(colors#[A-Z_]+|[A-Za-z0-9_.]+#[A-Z_]+)|alias:[A-Za-z]+|(dark|derived):[A-Za-z]+)$/,
  );

const Color = z.object({ hex: Hex, source: Source });

export const REQUIRED_COLORS = [
  "bg",
  "paper",
  "fg",
  "fgDim",
  "border",
  "highlight",
  "blue",
  "lightBlue",
  "paleBlue",
  "cyan",
  "green",
  "lime",
  "yellow",
  "brightYellow",
  "burntOrange",
  "purple",
] as const;

export const ANSI_NAMES = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
] as const;

export const SYNTAX_ROLES = [
  "comment",
  "keyword",
  "function",
  "variable",
  "string",
  "number",
  "type",
  "operator",
  "punctuation",
  "constant",
  "tag",
  "parameter",
] as const;

const colorsShape = Object.fromEntries(REQUIRED_COLORS.map((k) => [k, Color])) as Record<
  (typeof REQUIRED_COLORS)[number],
  typeof Color
>;
const ansiShape = Object.fromEntries(ANSI_NAMES.map((k) => [k, Color])) as Record<
  (typeof ANSI_NAMES)[number],
  typeof Color
>;
const syntaxShape = Object.fromEntries(SYNTAX_ROLES.map((k) => [k, z.string()])) as Record<
  (typeof SYNTAX_ROLES)[number],
  z.ZodString
>;

export const PaletteSchema = z
  .object({
    name: z.enum(["Bigface", "Bigface Light"]),
    appearance: z.enum(["dark", "light"]),
    colors: z.object(colorsShape).strict(),
    ansi: z.object(ansiShape).strict(),
    /** Syntax role → name of an entry in `colors`. */
    syntax: z.object(syntaxShape).strict(),
  })
  .superRefine((p, ctx) => {
    for (const [role, ref] of Object.entries(p.syntax)) {
      if (!(ref in p.colors)) {
        ctx.addIssue({ code: "custom", message: `syntax.${role} → unknown colour "${ref}"` });
      }
    }
  });

export type Palette = z.infer<typeof PaletteSchema>;
export type ColorName = keyof Palette["colors"];
export type AnsiName = keyof Palette["ansi"];
export type SyntaxRole = keyof Palette["syntax"];

export function parsePalette(json: unknown): Palette {
  const palette = PaletteSchema.parse(json);
  // An ANSI slot borrows a colour; it may never drift from it.
  for (const [slot, color] of Object.entries(palette.ansi)) {
    if (!color.source.startsWith("alias:")) continue;
    const target = color.source.slice("alias:".length);
    const borrowed = palette.colors[target as keyof typeof palette.colors];
    if (!borrowed) throw new Error(`ansi.${slot} aliases unknown colour ${target}`);
    if (borrowed.hex !== color.hex) {
      throw new Error(`ansi.${slot} says ${color.hex} but ${target} is ${borrowed.hex}`);
    }
  }
  return palette;
}

export async function loadPalette(path = new URL("../palette/bigface.json", import.meta.url)) {
  return parsePalette(await Bun.file(path).json());
}

/**
 * Bigface Light. It is a palette of its own (§ name/appearance), but every colour must come from the
 * dark one: `dark:<name>` has to equal that dark colour exactly, `derived:<name>` has to name a dark
 * colour that exists. Generators read the light palette exactly like the dark one.
 */
export function parseLightPalette(json: unknown, dark: Palette): Palette {
  const light = parsePalette(json);
  if (light.appearance !== "light" || light.name !== "Bigface Light") {
    throw new Error("a light palette must be named 'Bigface Light' with appearance 'light'");
  }
  for (const entries of [light.colors, light.ansi] as Record<
    string,
    { hex: string; source: string }
  >[]) {
    for (const [name, c] of Object.entries(entries)) {
      const m = /^(dark|derived):(.+)$/.exec(c.source);
      if (!m) continue;
      const kind = m[1] as "dark" | "derived";
      const ref = m[2] as string;
      const target =
        (dark.colors as Record<string, { hex: string }>)[ref] ??
        (dark.ansi as Record<string, { hex: string }>)[ref];
      if (!target)
        throw new Error(`${kind}:${ref} names no colour of the dark palette (at ${name})`);
      if (kind === "dark" && target.hex !== c.hex) {
        throw new Error(`${name} says ${c.hex} but dark:${ref} is ${target.hex}`);
      }
    }
  }
  return light;
}

export const color = (p: Palette, name: ColorName): string => p.colors[name].hex;
export const ansi = (p: Palette, name: AnsiName): string => p.ansi[name].hex;
export const syntax = (p: Palette, role: SyntaxRole): string =>
  p.colors[p.syntax[role] as ColorName].hex;
export const ansiList = (p: Palette): string[] => ANSI_NAMES.map((n) => ansi(p, n));
