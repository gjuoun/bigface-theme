import { type ColorName, color, type Palette, syntax } from "../palette.ts";
import type { Target } from "./types.ts";

/** `#rrggbb` → Xcode's "r g b a" float string. */
export function xcodeColor(hex: string, alpha = 1): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (v: number) => String(Number((v / 255).toFixed(6)));
  return `${f((n >> 16) & 255)} ${f((n >> 8) & 255)} ${f(n & 255)} ${alpha}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const MONO = "SFMono-Medium - 12.0";
const MONO_BOLD = "SFMono-Bold - 12.0";

export function xcodeTheme(p: Palette): string {
  const c = (n: ColorName) => color(p, n);
  const s = (r: Parameters<typeof syntax>[1]) => syntax(p, r);
  const x = (hex: string, a = 1) => xcodeColor(hex, a);

  const top: [string, string | number][] = [
    ["DVTConsoleDebuggerInputTextColor", x(c("fg"))],
    ["DVTConsoleDebuggerInputTextFont", "SFMono-Regular - 12.0"],
    ["DVTConsoleDebuggerOutputTextColor", x(c("fg"))],
    ["DVTConsoleDebuggerOutputTextFont", "SFMono-Regular - 12.0"],
    ["DVTConsoleDebuggerPromptTextColor", x(c("green"))],
    ["DVTConsoleDebuggerPromptTextFont", "SFMono-Regular - 12.0"],
    ["DVTConsoleExectuableInputTextColor", x(c("fg"))],
    ["DVTConsoleExectuableInputTextFont", "SFMono-Regular - 12.0"],
    ["DVTConsoleExectuableOutputTextColor", x(c("fg"))],
    ["DVTConsoleExectuableOutputTextFont", "SFMono-Regular - 12.0"],
    ["DVTConsoleTextBackgroundColor", x(c("bg"))],
    ["DVTConsoleTextSelectionColor", x(c("selection"))],
    ["DVTFontAndColorVersion", 1],
    ["DVTLineSpacing", 1.1],
    ["DVTMarkupTextBackgroundColor", x(c("cursorLine"))],
    ["DVTMarkupTextBorderColor", x(c("border"))],
    ["DVTMarkupTextCodeFont", "SFMono-Regular - 10.0"],
    ["DVTMarkupTextEmphasisColor", x(c("fg"))],
    ["DVTMarkupTextEmphasisFont", ".AppleSystemUIFontItalic - 10.0"],
    ["DVTMarkupTextInlineCodeColor", x(c("yellow"))],
    ["DVTMarkupTextLinkColor", x(c("blue"))],
    ["DVTMarkupTextLinkFont", ".AppleSystemUIFont - 10.0"],
    ["DVTMarkupTextNormalColor", x(c("fg"))],
    ["DVTMarkupTextNormalFont", ".AppleSystemUIFont - 10.0"],
    ["DVTMarkupTextOtherHeadingColor", x(c("comment"))],
    ["DVTMarkupTextOtherHeadingFont", ".AppleSystemUIFont - 14.0"],
    ["DVTMarkupTextPrimaryHeadingColor", x(c("lime"))],
    ["DVTMarkupTextPrimaryHeadingFont", ".AppleSystemUIFont - 24.0"],
    ["DVTMarkupTextSecondaryHeadingColor", x(c("lime"))],
    ["DVTMarkupTextSecondaryHeadingFont", ".AppleSystemUIFont - 18.0"],
    ["DVTMarkupTextStrongColor", x(c("fg"))],
    ["DVTMarkupTextStrongFont", ".AppleSystemUIFontBold - 10.0"],
    ["DVTScrollbarMarkerAnalyzerColor", x(c("purple"))],
    ["DVTScrollbarMarkerBreakpointColor", x(c("blue"))],
    ["DVTScrollbarMarkerDiffColor", x(c("comment"))],
    ["DVTScrollbarMarkerDiffConflictColor", x(c("burntOrange"))],
    ["DVTScrollbarMarkerErrorColor", x(c("burntOrange"))],
    ["DVTScrollbarMarkerRuntimeIssueColor", x(c("purple"))],
    ["DVTScrollbarMarkerWarningColor", x(c("brightYellow"))],
    ["DVTSourceTextBackground", x(c("bg"))],
    ["DVTSourceTextBlockDimBackgroundColor", x(c("comment"))],
    ["DVTSourceTextCurrentLineHighlightColor", x(c("cursorLine"))],
    ["DVTSourceTextInsertionPointColor", x(c("caret"))],
    ["DVTSourceTextInvisiblesColor", x(c("border"))],
    ["DVTSourceTextSelectionColor", x(c("selection"))],
  ];

  const syn: [string, string, string][] = [
    ["xcode.syntax.attribute", s("tag"), MONO],
    ["xcode.syntax.character", s("string"), MONO],
    ["xcode.syntax.comment", s("comment"), MONO],
    ["xcode.syntax.comment.doc", s("comment"), "Helvetica - 12.0"],
    ["xcode.syntax.comment.doc.keyword", c("comment"), MONO_BOLD],
    ["xcode.syntax.declaration.other", s("function"), MONO],
    ["xcode.syntax.declaration.type", s("type"), MONO],
    ["xcode.syntax.identifier.class", s("type"), MONO],
    ["xcode.syntax.identifier.class.system", s("type"), MONO],
    ["xcode.syntax.identifier.constant", s("constant"), MONO],
    ["xcode.syntax.identifier.constant.system", s("constant"), MONO],
    ["xcode.syntax.identifier.function", s("function"), MONO],
    ["xcode.syntax.identifier.function.system", s("function"), MONO],
    ["xcode.syntax.identifier.macro", s("number"), MONO],
    ["xcode.syntax.identifier.macro.system", s("number"), MONO],
    ["xcode.syntax.identifier.type", s("type"), MONO],
    ["xcode.syntax.identifier.type.system", s("type"), MONO],
    ["xcode.syntax.identifier.variable", s("variable"), MONO],
    ["xcode.syntax.identifier.variable.system", s("variable"), MONO],
    ["xcode.syntax.keyword", s("keyword"), MONO_BOLD],
    ["xcode.syntax.mark", c("comment"), MONO_BOLD],
    ["xcode.syntax.markup.aside.kind", c("brightYellow"), MONO],
    ["xcode.syntax.markup.code", s("string"), MONO],
    ["xcode.syntax.number", s("number"), MONO],
    ["xcode.syntax.plain", s("punctuation"), MONO],
    ["xcode.syntax.preprocessor", s("number"), MONO],
    ["xcode.syntax.string", s("string"), MONO],
    ["xcode.syntax.url", c("blue"), MONO],
  ];

  const val = (v: string | number) =>
    typeof v === "number"
      ? Number.isInteger(v)
        ? `\t<integer>${v}</integer>`
        : `\t<real>${v}</real>`
      : `\t<string>${esc(v)}</string>`;
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
  ];
  const push = (k: string, v: string | number) => out.push(`\t<key>${k}</key>`, val(v));
  const dict = (k: string, rows: [string, string][]) => {
    out.push(`\t<key>${k}</key>`, "\t<dict>");
    for (const [kk, vv] of rows)
      out.push(`\t\t<key>${kk}</key>`, `\t\t<string>${esc(vv)}</string>`);
    out.push("\t</dict>");
  };
  const sorted = [...top].sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [k, v] of sorted.filter(([k]) => k < "DVTSourceTextSyntaxColors")) push(k, v);
  dict(
    "DVTSourceTextSyntaxColors",
    syn.map(([k, hex]) => [k, x(hex)]),
  );
  dict(
    "DVTSourceTextSyntaxFonts",
    syn.map(([k, , font]) => [k, font]),
  );
  for (const [k, v] of sorted.filter(([k]) => k > "DVTSourceTextSyntaxColors")) push(k, v);
  out.push("</dict>", "</plist>", "");
  return out.join("\n");
}

export const xcode: Target = {
  id: "xcode",
  name: "Xcode",
  files(p: Palette) {
    return { "Bigface.xccolortheme": xcodeTheme(p) };
  },
};
