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
      ["error", `"bold ${c("pink")},${bg}"`],
      ["todo", `"bold ${c("burntOrange")},${bg}"`],
      ["hlsearch", fgbg(c("searchFg"), c("searchBg"))],
      ["selection", fgbg(c("fg"), c("selection"))],
      ["statusline", fgbg(c("comment"), c("borderMuted"))],
      ["statusline.inactive", fgbg(c("fgDim"), c("borderMuted"))],
      ["tabbar", fgbg(c("fgDim"), c("borderMuted"))],
      ["tabbar.active", fgbg(c("fg"), c("bg"))],
      ["indent-char", fgbg(c("border"))],
      ["line-number", fgbg(c("fgDim"), c("bg"))],
      ["current-line-number", fgbg(c("fg"), c("cursorLine"))],
      ["gutter-info", fgbg(c("lightBlue"), c("bg"))],
      ["gutter-error", fgbg(c("pink"), c("bg"))],
      ["gutter-warning", fgbg(c("orange"), c("bg"))],
      ["diff-added", `"${c("limeGreen")}"`],
      ["diff-modified", `"${c("lightBlue")}"`],
      ["diff-deleted", `"${c("pink")}"`],
      ["cursor-line", `"${c("cursorLine")}"`],
      ["color-column", `"${c("borderMuted")}"`],
      ["match-brace", fgbg(c("fg"), c("braceMatch"))],
      ["message", fgbg(c("fg"), c("cursorLine"))],
      ["error-message", fgbg(c("pink"), c("cursorLine"))],
      ["divider", fgbg(c("borderMuted"), c("bg"))],
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
