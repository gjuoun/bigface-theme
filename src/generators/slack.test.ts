import { describe, expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { SLACK_ORDER, slack } from "./slack.ts";

const p = await loadPalette();

describe("Slack", () => {
  const str = ((slack.files(p) as Record<string, string>)["theme.txt"] as string).trim();
  const parts = str.split(",");
  test("exactly 8 #rrggbb values, comma-joined with no spaces", () => {
    expect(SLACK_ORDER.length).toBe(8);
    expect(parts.length).toBe(8);
    for (const v of parts) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    expect(str).not.toContain(" ");
  });
  test("column background is the palette's sidebar colour, text is fg", () => {
    expect(parts[0]).toBe(p.colors.border.hex);
    expect(parts[5]).toBe(p.colors.fg.hex);
  });
});
