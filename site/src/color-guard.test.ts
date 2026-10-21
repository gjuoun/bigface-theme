import { expect, test } from "bun:test";
import palette from "../../palette/bigface.json";
import { findForeignInCss, findForeignInHtml, paletteHexes } from "./color-guard.ts";

const known = paletteHexes(palette);

// Fixtures are taken from what Tailwind v4 + shadcn (radix-nova, neutral) actually shipped in the
// 2026-10-20 probe (plan: shadcn-tailwind-rewrite).

test("oklch greys from shadcn's neutral baseColor are rejected", () => {
  expect(findForeignInCss(":root{--background:oklch(.205 0 0)}", known)).toEqual([
    "oklch(.205 0 0)",
  ]);
  expect(findForeignInCss(".x{color:oklch(57.7% .245 27.325)}", known)).toHaveLength(1);
});

test("Tailwind's default shadow colour #0000001a is rejected", () => {
  expect(
    findForeignInCss(".s{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a)}", known),
  ).toEqual(["#0000001a"]);
});

test("short hex is expanded: #000 rejected, #333 (borderMuted) accepted", () => {
  expect(findForeignInCss(".a{color:#000}", known)).toEqual(["#000"]);
  expect(findForeignInCss(".a{color:#333}", known)).toEqual([]);
});

test("alpha-zero hex (Tailwind's transparent) is accepted", () => {
  expect(findForeignInCss(".a{background-color:#0000;box-shadow:0 0 #00000000}", known)).toEqual(
    [],
  );
});

test("feature queries inside @supports are accepted", () => {
  const css =
    "@supports (color:color-mix(in lab, red, red)){.b{color:var(--x)}}" +
    "@supports ((-webkit-hyphens:none) and (not (color:rgb(from red r g b)))){:root{--y:0}}";
  expect(findForeignInCss(css, known)).toEqual([]);
});

test("a named colour in a declaration is rejected, but not in property names or variables", () => {
  expect(findForeignInCss(".r{color: red}", known)).toEqual(["color: red"]);
  expect(findForeignInCss(".w{white-space:nowrap;color:var(--color-red)}", known)).toEqual([]);
  expect(findForeignInCss(".t{background:transparent;color:currentcolor}", known)).toEqual([]);
});

test("mask layers only read alpha, so their colours are accepted", () => {
  const css =
    ".m{mask-image:linear-gradient(90deg,#0000,#000 8% 92%,#0000);-webkit-mask-image:linear-gradient(#000 0 0)}";
  expect(findForeignInCss(css, known)).toEqual([]);
  expect(findForeignInCss(".m{mask-image:none;box-shadow:0 30px 60px -40px #000}", known)).toEqual([
    "#000",
  ]);
});

test("#fff is accepted only as Tailwind's ring-offset initial value", () => {
  const ok =
    '@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}' +
    "*{--tw-ring-offset-color:#fff}";
  expect(findForeignInCss(ok, known)).toEqual([]);
  expect(findForeignInCss(".b{background:#fff}", known)).toEqual(["#fff"]);
});

test("palette hex in any length/case and palette rgb triples are accepted", () => {
  expect(
    findForeignInCss(".a{color:#00B0FF;border-color:#00b0ff80;fill:rgba(0, 176, 255, .5)}", known),
  ).toEqual([]);
  expect(findForeignInCss(".a{color:rgba(5,13,27,.4)}", known)).toEqual(["rgb(5,13,27)"]);
});

test("HTML: style attributes and <style> blocks are scanned, URL fragments are not colours", () => {
  const html =
    '<a href="#add">x</a><html style="--bf-bg:#252925;--x:oklch(1 0 0)"><style>.q{color:#123456}</style>' +
    '<svg fill="#252925"></svg><i data-x="#abcdef"></i>';
  expect(findForeignInHtml(html, known)).toEqual(["#123456", "oklch(1 0 0)", "#abcdef"]);
});
