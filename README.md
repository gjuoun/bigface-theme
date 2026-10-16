# Bigface

A dark color theme with **one palette and 15 ports**. It started in 2018 as a
[JetBrains scheme](https://plugins.jetbrains.com/plugin/10988-bigface-color-scheme) and is now
generated for your terminal, editors, shell and notes from [`palette/bigface.json`](palette/bigface.json).

Site, previews and install steps: **https://gjuoun.github.io/bigface-theme/**

| | |
|---|---|
| Background | `#252925` |
| Text | `#d9d9d4` |
| Keywords, links | `#00b0ff` |
| Functions, headings | `#c6ff00` |
| Strings, inline code | `#e5e500` |
| Numbers | `#fc5d23` |

Dark only, no variants. Colours are never adjusted per tool or for contrast: every colour that came
from the 2018 scheme is checked against the original XML by a test. A few roles (`fgDim`, `comment`)
are low-contrast by design.

## Apps

| App | Files | Checked by |
|---|---|---|
| pi | `themes/pi/bigface.json` | pi's theme loader |
| Ghostty | `themes/ghostty/Bigface` | `ghostty +validate-config` |
| herdr | `themes/herdr/theme.toml` | `herdr config check` |
| VS Code / Cursor | `themes/vscode/` | `vsce package` + `code --install-extension` |
| Zed | `themes/zed/` | Zed's published JSON schema |
| JetBrains | `themes/jetbrains/Bigface.xml` | identical to the original scheme |
| zellij | `themes/zellij/bigface.kdl` | `zellij setup --check` |
| starship | `themes/starship/palette.toml` | `starship print-config` |
| tmux | `themes/tmux/bigface.conf` | tmux loads it |
| Vim / Neovim | `themes/vim/colors/bigface.vim` | vim loads it, `hi Normal` |
| Xcode | `themes/xcode/Bigface.xccolortheme` | `plutil -lint` + Xcode's own key set |
| micro | `themes/micro/bigface.micro` | format test only |
| Obsidian | `themes/obsidian/Bigface/` | format test only |
| Slack | `themes/slack/theme.txt` | format test only |
| Raycast | `themes/raycast/theme.url` | format test only |

The site's app pages say exactly how far each theme was checked. "Format test only" means the file
matches the tool's documented format; it was not opened in the app.

## Develop

```sh
bun install
bun run themes      # regenerate themes/ from the palette
bun run contrast    # print contrast ratios (informational)
bun run check       # typecheck + biome + all tests (tools that aren't installed are skipped)
bun run site:dev    # Astro site on http://localhost:4321/bigface-theme/
```

To add an app: write a generator in `src/generators/`, register it in `src/targets.ts`, add its page
data to `site/src/data/targets.ts`, and run `bun run themes`. `bun run check` fails if `themes/` is
out of date.

## License

MIT
