import { type ColorName, color, type Palette, syntax } from "../palette.ts";
import type { Target } from "./types.ts";

export const micro: Target = {
  id: "micro",
  name: "micro",
  files(p: Palette) {
    const c = (n: ColorName) => color(p, n);
    const s = (r: Parameters<typeof syntax>[1]) => syntax(p, r);
    const bg = c("bg");
    const fgbg = (fg: string, back = bg) => `"${fg},${back}"`;
    const rows: [string, string][] = [
      ["default", fgbg(c("fg"))],
      ["comment", fgbg(s("comment"))],
      ["identifier", fgbg(s("variable"))],
      ["identifier.class", fgbg(s("function"))],
      ["identifier.macro", fgbg(s("number"))],
      ["identifier.var", fgbg(s("variable"))],
      ["constant", fgbg(s("constant"))],
      ["constant.string", fgbg(s("string"))],
      ["constant.string.url", `"underline ${c("blue")},${bg}"`],
      ["constant.number", fgbg(s("number"))],
      ["constant.bool", fgbg(s("constant"))],
      ["constant.specialChar", fgbg(c("burntOrange"))],
      ["statement", fgbg(s("keyword"))],
      ["symbol", fgbg(s("punctuation"))],
      ["symbol.operator", fgbg(s("operator"))],
      ["symbol.brackets", fgbg(s("punctuation"))],
      ["symbol.tag", fgbg(s("tag"))],
      ["preproc", fgbg(s("keyword"))],
      ["type", fgbg(s("type"))],
      ["type.keyword", fgbg(s("keyword"))],
      ["special", fgbg(c("lime"))],
      ["underlined", `"underline ${c("blue")},${bg}"`],
      ["error", `"bold ${c("burntOrange")},${bg}"`],
      ["todo", `"bold ${c("burntOrange")},${bg}"`],
      ["hlsearch", fgbg(c("fg"), c("highlight"))],
      ["selection", fgbg(c("fg"), c("highlight"))],
      ["statusline", fgbg(c("fgDim"), c("border"))],
      ["statusline.inactive", fgbg(c("fgDim"), c("border"))],
      ["tabbar", fgbg(c("fgDim"), c("border"))],
      ["tabbar.active", fgbg(c("fg"), c("bg"))],
      ["indent-char", fgbg(c("border"))],
      ["line-number", fgbg(c("fgDim"), c("bg"))],
      ["current-line-number", fgbg(c("fg"), c("highlight"))],
      ["gutter-info", fgbg(c("lightBlue"), c("bg"))],
      ["gutter-error", fgbg(c("burntOrange"), c("bg"))],
      ["gutter-warning", fgbg(c("yellow"), c("bg"))],
      ["diff-added", `"${c("green")}"`],
      ["diff-modified", `"${c("lightBlue")}"`],
      ["diff-deleted", `"${c("burntOrange")}"`],
      ["cursor-line", `"${c("highlight")}"`],
      ["color-column", `"${c("border")}"`],
      ["match-brace", fgbg(c("fg"), c("highlight"))],
      ["message", fgbg(c("fg"), c("highlight"))],
      ["error-message", fgbg(c("burntOrange"), c("highlight"))],
      ["divider", fgbg(c("border"), c("bg"))],
      ["scrollbar", fgbg(c("fgDim"), c("bg"))],
    ];
    const lines = [
      "# Bigface — https://github.com/gjuoun/bigface-theme",
      "# Install: copy to ~/.config/micro/colorschemes/bigface.micro, then in micro: set colorscheme bigface",
      "# Needs a truecolor terminal (COLORTERM=truecolor).",
      ...rows.map(([g, v]) => `color-link ${g} ${v}`),
    ];
    return { "bigface.micro": `${lines.join("\n")}\n` };
  },
};
