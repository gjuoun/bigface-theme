import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bgCatalog, propsOf, textScale, variantKeys } from "./ui-catalog.ts";

const ui = join(import.meta.dir, "../components/ui");
const bg = join(import.meta.dir, "../components/bg");
const read = (dir: string, f: string) => readFileSync(join(dir, f), "utf8");

test("variant keys are read from the shadcn sources", () => {
  const button = read(ui, "button.tsx");
  expect(variantKeys(button, "variant")).toEqual([
    "default",
    "outline",
    "secondary",
    "ghost",
    "destructive",
    "link",
  ]);
  expect(variantKeys(button, "size")).toEqual([
    "default",
    "xs",
    "sm",
    "lg",
    "icon",
    "icon-xs",
    "icon-sm",
    "icon-lg",
  ]);
  expect(variantKeys(read(ui, "badge.tsx"), "variant")).toHaveLength(6);
  expect(variantKeys(read(ui, "tabs.tsx"), "variant")).toEqual(["default", "line"]);
  expect(variantKeys(button, "nope")).toEqual([]);
});

test("the catalog lists every file in components/bg, and nothing else", () => {
  const files = readdirSync(bg)
    .filter((f) => !f.includes(".test."))
    .sort();
  expect(bgCatalog.map((e) => e.file).sort()).toEqual(files);
});

test("every BG export of a .tsx file is in the catalog", () => {
  const names = new Set(bgCatalog.map((e) => e.name));
  for (const f of readdirSync(bg).filter((f) => f.endsWith(".tsx") && !f.includes(".test.")))
    for (const m of read(bg, f).matchAll(/export function (BG\w+)/g))
      expect(names.has(m[1] as string), `${f}: ${m[1]}`).toBe(true);
});

test("props come from the source: every component that takes props shows them", () => {
  for (const e of bgCatalog.filter((e) => e.kind !== "helper")) {
    const props = propsOf(e.file, read(bg, e.file));
    if (["toast.astro", "divider.astro", "contrast-table.astro"].includes(e.file))
      expect(props).toBe("(no props)");
    else expect(props, e.file).not.toBe("(no props)");
  }
  const tabs = propsOf("install-tabs.tsx", read(bg, "install-tabs.tsx"));
  expect(tabs).toContain("command: string");
  expect(tabs).toContain("items: BGInstallTab[]");
});

test("a component whose props are not final says why", () => {
  for (const e of bgCatalog.filter((e) => !e.finalised)) expect(e.why, e.name).toBeTruthy();
});

test("the text scale is the font-size classes in use, smallest first, colours excluded", () => {
  const scale = textScale([
    'class="text-[0.72rem] text-sm text-bf-blue text-[1rem]/[1.5]"',
    "text-xs",
  ]);
  expect(scale).toEqual(["text-[0.72rem]", "text-xs", "text-sm"]);
});
