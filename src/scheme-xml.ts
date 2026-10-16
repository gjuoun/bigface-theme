/** Minimal reader for the original JetBrains scheme (no XML dependency needed). */

/** JetBrains drops leading zeros in hex (`b0ff` = `00b0ff`); restore them. */
export const normalizeHex = (raw: string): string => `#${raw.toLowerCase().padStart(6, "0")}`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Look up a `jetbrains:...` source string in the scheme XML. Returns undefined if absent. */
export function lookupSource(xml: string, source: string): string | undefined {
  const ref = source.replace(/^jetbrains:/, "");
  const [option, field] = ref.split("#") as [string, string];
  if (option === "colors") {
    const block = xml.match(/<colors>([\s\S]*?)<\/colors>/)?.[1] ?? "";
    const m = block.match(new RegExp(`<option name="${escapeRe(field)}" value="([0-9a-fA-F]*)"`));
    return m?.[1] ? normalizeHex(m[1]) : undefined;
  }
  const attrs = xml.match(/<attributes>([\s\S]*?)<\/attributes>/)?.[1] ?? "";
  const opt = attrs.match(
    new RegExp(`<option name="${escapeRe(option)}">\\s*<value>([\\s\\S]*?)</value>`),
  )?.[1];
  const m = opt?.match(new RegExp(`<option name="${escapeRe(field)}" value="([0-9a-fA-F]*)"`));
  return m?.[1] ? normalizeHex(m[1]) : undefined;
}

/** Every `#RRGGBB` colour value that appears in the scheme (for the JetBrains generator test). */
export function allColorValues(xml: string): string[] {
  return [...xml.matchAll(/<option name="[A-Z_a-z0-9. ]+" value="([0-9a-fA-F]{1,6})"/g)].map((m) =>
    normalizeHex(m[1] as string),
  );
}
