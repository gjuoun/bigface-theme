import { readFileSync } from "node:fs";
import type { Palette } from "../palette.ts";
import { replaceSource } from "../scheme-xml.ts";
import type { Target } from "./types.ts";

export const ORIGINAL_XML = readFileSync(
  new URL("../fixtures/Bigface.original.xml", import.meta.url),
  "utf8",
);

/**
 * TRANSITION SHIM. Plan 2026-10-25, Step 9; Jun's answer to the JetBrains question, option (b).
 *
 * Before the neutral collapse each neutral had its own address in the scheme. The derived roles (fg, fgDim, border,
 * highlight) and the removed roles (comment, borderMuted, selection, cursorLine, braceMatch) have no address of their
 * own in the palette, so each address they used to occupy is written from the role it now maps to. Three IDE highlight
 * options (selection, cursorLine, braceMatch) now share the one highlight colour. This table keeps the scheme on the
 * palette until the JetBrains-side realignment, which is deferred to a later round. Delete the table when that lands.
 */
export const LEGACY_ADDRESSES: [
  source: string,
  role: "fg" | "fgDim" | "border" | "highlight" | "yellow",
][] = [
  ["jetbrains:TEXT#FOREGROUND", "fg"],
  ["jetbrains:colors#LINE_NUMBERS_COLOR", "fgDim"],
  ["jetbrains:OC.LINE_COMMENT#FOREGROUND", "fgDim"],
  ["jetbrains:colors#INDENT_GUIDE", "border"],
  ["jetbrains:colors#RIGHT_MARGIN_COLOR", "border"],
  ["jetbrains:colors#SELECTION_BACKGROUND", "highlight"],
  ["jetbrains:colors#CARET_COLOR", "fg"],
  ["jetbrains:colors#CARET_ROW_COLOR", "highlight"],
  ["jetbrains:MATCHED_BRACE_ATTRIBUTES#BACKGROUND", "highlight"],
  // The scheme's string colour was the old accent yellow (#e5e500), deleted on 2026-10-27. Strings now take the one
  // yellow, like every other editor. The 2018 fixture still says e5e500 here; this row is what overwrites it.
  // The yellow family (2026-10-27, one-yellow rule). Every fixture address whose colour is yellow-hued (hue 40-70,
  // chroma >= 100) and off-palette now takes the single yellow; the fixture is untouched. CONSOLE_YELLOW_BRIGHT_OUTPUT is
  // ccff90 (hue 88) and is included because the scheme names it yellow. Lime (c6ff00) and the greens are not yellow and
  // are not in this list. The punctuation and instance-method rows (COMMA, DOT, INSTANCE_METHOD) differ from the palette's
  // syntax map (punctuation fg, function lime); they follow the rule and can be reverted row by row.
  ["jetbrains:DEFAULT_STRING#FOREGROUND", "yellow"],
  ["jetbrains:PY.STRING.U#FOREGROUND", "yellow"],
  ["jetbrains:CONSOLE_YELLOW_BRIGHT_OUTPUT#FOREGROUND", "yellow"],
  ["jetbrains:CONSOLE_SYSTEM_OUTPUT#FOREGROUND", "yellow"],
  ["jetbrains:OC.STRING#FOREGROUND", "yellow"],
  ["jetbrains:SQL_STRING#FOREGROUND", "yellow"],
  ["jetbrains:JSP_DIRECTIVE_BACKGROUND#FOREGROUND", "yellow"],
  ["jetbrains:TEXT_SEARCH_RESULT_ATTRIBUTES#BACKGROUND", "yellow"],
  ["jetbrains:WARNING_ATTRIBUTES#ERROR_STRIPE_COLOR", "yellow"],
  ["jetbrains:DEFAULT_COMMA#FOREGROUND", "yellow"],
  ["jetbrains:DEFAULT_DOT#FOREGROUND", "yellow"],
  ["jetbrains:DEFAULT_INSTANCE_METHOD#FOREGROUND", "yellow"],
  ["jetbrains:KOTLIN_ANNOTATION#FOREGROUND", "yellow"],
];

/**
 * Start from the original scheme and write each palette colour back to the place it came from.
 * ANSI slots are aliases (a standard slot borrowing a scheme colour), so they have no home in the scheme and are
 * skipped; derived neutrals have no source of their own and are written through LEGACY_ADDRESSES.
 */
export function renderJetBrains(p: Palette, base = ORIGINAL_XML): string {
  let xml = base;
  const seen = new Map<string, string>();
  const write = (source: string, hex: string, name: string) => {
    const prev = seen.get(source);
    if (prev && prev !== hex) {
      throw new Error(
        name + " disagrees with another token about " + source + ": " + prev + " vs " + hex,
      );
    }
    seen.set(source, hex);
    xml = replaceSource(xml, source, hex);
  };
  for (const [name, c] of [...Object.entries(p.colors), ...Object.entries(p.ansi)]) {
    if (!c.source.startsWith("jetbrains:")) continue;
    write(c.source, c.hex, name);
  }
  for (const [source, role] of LEGACY_ADDRESSES) write(source, p.colors[role].hex, role);
  return xml;
}

export const jetbrains: Target = {
  id: "jetbrains",
  name: "JetBrains IDEs",
  files(p: Palette) {
    return { "Bigface.xml": renderJetBrains(p) };
  },
};
