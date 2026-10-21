import { z } from "zod";

const Hex = z.string().regex(/^#[0-9a-f]{6}$/, "6-digit lowercase hex like #00b0ff");

/**
 * Where a colour comes from.
 * - `jetbrains:<OPTION>#<FIELD>` — an attribute in the original scheme (e.g. `DEFAULT_KEYWORD#FOREGROUND`)
 * - `jetbrains:colors#<KEY>`     — a `<colors>` option in the original scheme (e.g. `CARET_ROW_COLOR`)
 *
 * There is deliberately no "invented" option: every colour the themes use has to exist in the
 * original scheme, so a tool that wants a surface the scheme lacks is given one of the scheme's
 * existing surfaces instead of a new blend.
 */
const Source = z.string().regex(/^jetbrains:(colors#[A-Z_]+|[A-Za-z0-9_.]+#[A-Z_]+)$/);

const Color = z.object({ hex: Hex, source: Source });

export const REQUIRED_COLORS = [
  "bg",
  "fg",
  "fgDim",
  "border",
  "borderMuted",
  "selection",
  "cursorLine",
  "braceMatch",
  "blue",
  "skyBlue",
  "lightBlue",
  "paleBlue",
  "cyan",
  "green",
  "limeGreen",
  "lime",
  "yellow",
  "brightYellow",
  "orange",
  "burntOrange",
  "pink",
  "purple",
  "comment",
  "searchBg",
  "searchFg",
  "caret",
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
    name: z.literal("Bigface"),
    appearance: z.literal("dark"),
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
  return PaletteSchema.parse(json);
}

export async function loadPalette(path = new URL("../palette/bigface.json", import.meta.url)) {
  return parsePalette(await Bun.file(path).json());
}

export const color = (p: Palette, name: ColorName): string => p.colors[name].hex;
export const ansi = (p: Palette, name: AnsiName): string => p.ansi[name].hex;
export const syntax = (p: Palette, role: SyntaxRole): string =>
  p.colors[p.syntax[role] as ColorName].hex;
export const ansiList = (p: Palette): string[] => ANSI_NAMES.map((n) => ansi(p, n));
