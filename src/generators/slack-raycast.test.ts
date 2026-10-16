import { describe, expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { RAYCAST_SLOTS, raycast } from "./raycast.ts";
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
    expect(parts[0]).toBe("#1f231f");
    expect(parts[5]).toBe("#d9d9d4");
  });
});

describe("Raycast", () => {
  const raw = ((raycast.files(p) as Record<string, string>)["theme.url"] as string).trim();
  test("is a raycast://theme URL with version, name, appearance and 12 colours", () => {
    const u = new URL(raw);
    expect(u.protocol).toBe("raycast:");
    expect(u.hostname).toBe("theme");
    expect(u.searchParams.get("version")).toBe("1");
    expect(u.searchParams.get("name")).toBe("Bigface");
    expect(u.searchParams.get("appearance")).toBe("dark");
    const colors = (u.searchParams.get("colors") as string).split(",");
    expect(colors.length).toBe(RAYCAST_SLOTS.length);
    for (const v of colors) expect(v).toMatch(/^#[0-9A-F]{8}$/);
    expect(colors[0]).toBe("#252925FF");
  });
  test("# is percent-encoded like published links", () => {
    expect(raw).toContain("colors=%23252925FF,");
  });
});
