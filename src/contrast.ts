import { contrastReport } from "./contrast-math.ts";
import { loadPalette } from "./palette.ts";

export { type ContrastRow, contrastRatio, contrastReport, luminance } from "./contrast-math.ts";

if (import.meta.main) {
  const rows = contrastReport(await loadPalette());
  console.log("name".padEnd(18), "hex".padEnd(9), "ratio on bg");
  for (const r of rows) console.log(r.name.padEnd(18), r.hex.padEnd(9), r.ratio.toFixed(1));
}
