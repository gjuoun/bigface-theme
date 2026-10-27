// The value the palettes take from the scheme but do not name as a role: the scheme's caret colour (2018 CARET_COLOR,
// #f8f8f0). It is the light canvas (the light bg) and the anchor the dark neutrals derive from. It is read from the
// original scheme, so it cannot drift, and no palette file carries it under a role name (Jun, 2026-10-26: paper is retired).
import { readFileSync } from "node:fs";
import { lookupSource } from "./scheme-xml.ts";

export const CARET_SOURCE = "jetbrains:colors#CARET_COLOR";

const original = readFileSync(new URL("./fixtures/Bigface.original.xml", import.meta.url), "utf8");
const caret = lookupSource(original, CARET_SOURCE);
if (!caret) throw new Error(CARET_SOURCE + " is missing from the original scheme");

/** The scheme's caret colour, #f8f8f0. */
export const SCHEME_CARET: string = caret;
