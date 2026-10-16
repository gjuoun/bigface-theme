import { expect, test } from "bun:test";
import Ajv from "ajv";
import schema from "../fixtures/zed-theme-v0.2.0.json";
import { loadPalette } from "../palette.ts";
import { zed } from "./zed.ts";

const family = async () =>
  JSON.parse(
    (zed.files(await loadPalette()) as Record<string, string>)["themes/bigface.json"] as string,
  );

test("validates against Zed's published theme schema v0.2.0", async () => {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(schema);
  const ok = validate(await family());
  expect(validate.errors ?? []).toEqual([]);
  expect(ok).toBe(true);
});

test("control: schema rejects a wrong-typed field", async () => {
  const ajv = new Ajv({ strict: false });
  const f = await family();
  f.themes[0].appearance = "midnight";
  expect(ajv.compile(schema)(f)).toBe(false);
});

test("the schema doesn't forbid unknown keys, so check every style key is a known property", async () => {
  const known = Object.keys(
    (schema.definitions.ThemeStyleContent as { properties: object }).properties,
  );
  const f = await family();
  const unknown = Object.keys(f.themes[0].style).filter((k) => !known.includes(k));
  expect(unknown).toEqual([]);
  const knownSyntax = Object.keys(f.themes[0].style.syntax);
  expect(knownSyntax.length).toBeGreaterThan(20);
});

test("uses palette colours", async () => {
  const f = await family();
  expect(f.themes[0].style["editor.background"]).toBe("#252925");
  expect(f.themes[0].style.syntax.keyword.color).toBe("#00b0ff");
});
