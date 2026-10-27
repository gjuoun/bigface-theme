import { expect, test } from "bun:test";
import { contrastRatio, contrastReport } from "./contrast.ts";
import { loadPalette } from "./palette.ts";

test("ratio maths: black on white is 21:1, same colour is 1:1", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrastRatio("#252925", "#252925")).toBeCloseTo(1, 5);
});

test("report has a row for every text, accent and ANSI token and never edits the palette", async () => {
  const p = await loadPalette();
  const before = JSON.stringify(p);
  const rows = contrastReport(p);
  // text: fg and fgDim (comment is gone, paper is not text), accents: 10, ANSI: 16
  expect(rows.length).toBe(2 + 10 + 16);
  expect(rows.find((r) => r.name === "fg")?.ratio).toBeGreaterThan(9);
  expect(JSON.stringify(p)).toBe(before);
});
