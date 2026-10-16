import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPiTheme } from "../../scripts/pi-load.ts";
import { loadPalette } from "../palette.ts";
import { PI_ROLES, pi } from "./pi.ts";

const generate = async () =>
  JSON.parse((pi.files(await loadPalette()) as Record<string, string>)["bigface.json"] as string);

test("defines all 55 roles and nothing else", async () => {
  const t = await generate();
  expect(PI_ROLES.length).toBe(55);
  expect(Object.keys(t.colors).sort()).toEqual([...PI_ROLES].sort());
});

test("no 8-digit or 3-digit hex anywhere (pi rejects alpha)", async () => {
  const raw = (pi.files(await loadPalette()) as Record<string, string>)["bigface.json"] as string;
  expect(raw.match(/#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])|#[0-9a-fA-F]{8}\b/g)).toBeNull();
});

test("every role resolves to a variable and pi's own loader accepts the file", async () => {
  const t = await generate();
  for (const ref of Object.values(t.colors) as string[]) expect(t.vars[ref]).toBeDefined();
  const dir = await mkdtemp(join(tmpdir(), "bf-pi-"));
  const file = join(dir, "bigface.json");
  await writeFile(file, JSON.stringify(t));
  expect(await loadPiTheme(file)).toBe("bigface");
});

test("control: pi's loader rejects an 8-digit hex", async () => {
  const t = await generate();
  t.vars.blue = "#00b0ff44";
  const dir = await mkdtemp(join(tmpdir(), "bf-pi-bad-"));
  const file = join(dir, "bad.json");
  await writeFile(file, JSON.stringify(t));
  await expect(loadPiTheme(file)).rejects.toThrow(/Invalid (hex )?color/);
});
