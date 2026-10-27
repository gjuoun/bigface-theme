import { type ColorName, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

type Emph = [string, string, string, string];

export function zellijTheme(p: Palette): string {
  const c = (n: ColorName) => color(p, n);
  const q = (hex: string) => `"${hex}"`;
  const comp = (name: string, base: string, background: string, e: Emph) =>
    [
      `        ${name} {`,
      `            base ${q(base)}`,
      `            background ${q(background)}`,
      ...e.map((hex, i) => `            emphasis_${i} ${q(hex)}`),
      "        }",
    ].join("\n");
  const accents: Emph = [c("burntOrange"), c("blue"), c("green"), c("lime")];
  const mixed: Emph = [c("burntOrange"), c("burntOrange"), c("lime"), c("green")];
  const players = [
    c("lime"),
    c("blue"),
    c("purple"),
    c("burntOrange"),
    c("green"),
    c("cyan"),
    c("burntOrange"),
    c("yellow"),
    c("lightBlue"),
    c("brightYellow"),
  ];
  return [
    "// Bigface — https://github.com/gjuoun/bigface-theme",
    '// Put this block in ~/.config/zellij/config.kdl and set: theme "bigface"',
    "themes {",
    "    bigface {",
    comp("text_unselected", c("fg"), c("bg"), accents),
    comp("text_selected", c("fg"), c("highlight"), accents),
    comp("ribbon_selected", c("bg"), c("blue"), mixed),
    comp("ribbon_unselected", c("fg"), c("border"), [
      c("burntOrange"),
      c("fg"),
      c("blue"),
      c("lime"),
    ]),
    comp("table_title", c("blue"), c("bg"), accents),
    comp("table_cell_selected", c("fg"), c("highlight"), accents),
    comp("table_cell_unselected", c("fg"), c("bg"), accents),
    comp("list_selected", c("fg"), c("highlight"), accents),
    comp("list_unselected", c("fg"), c("bg"), accents),
    comp("frame_selected", c("blue"), c("bg"), accents),
    comp("frame_highlight", c("burntOrange"), c("bg"), [
      c("burntOrange"),
      c("burntOrange"),
      c("burntOrange"),
      c("burntOrange"),
    ]),
    comp("exit_code_success", c("green"), c("bg"), [c("blue"), c("bg"), c("lime"), c("blue")]),
    comp("exit_code_error", c("burntOrange"), c("bg"), [
      c("burntOrange"),
      c("bg"),
      c("bg"),
      c("bg"),
    ]),
    "        multiplayer_user_colors {",
    ...players.map((hex, i) => `            player_${i + 1} ${q(hex)}`),
    "        }",
    "    }",
    "}",
    "",
  ].join("\n");
}

export const zellij: Target = {
  id: "zellij",
  name: "zellij",
  files(p: Palette) {
    return { "bigface.kdl": zellijTheme(p) };
  },
};
