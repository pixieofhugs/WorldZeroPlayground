import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { compositeOver, contrastRatio, formatRatio, parseColor } from "../../../utils/contrast";
import { readThemes, resolveVar, type Theme } from "../../../utils/__tests__/cssVars";

const CSS_PATH = fileURLToPath(new URL("../../../index.css", import.meta.url));
const THEMES = readThemes(readFileSync(CSS_PATH, "utf8"));

function solid(name: string, theme: Theme, over?: string) {
  const raw = resolveVar(name, theme, THEMES);
  if (raw === null) return { raw: `UNRESOLVED(${name})`, rgba: null };
  const parsed = parseColor(raw);
  if (!parsed) return { raw, rgba: null };
  if (parsed.a !== 1 && over) {
    const back = solid(over, theme);
    if (back.rgba) return { raw: `${raw} over ${over}`, rgba: compositeOver(parsed, back.rgba) };
  }
  return { raw, rgba: parsed };
}

const PAIRS: Array<[string, string, string, string?]> = [
  // Singularity — the lit well travels with its own ground
  ["SG figure on well", "--faction-singularity-term-blue-bright", "--faction-singularity-term-readout"],
  ["SG unit on well", "--faction-singularity-term-blue", "--faction-singularity-term-readout"],
  ["SG well vs stamp plate", "--faction-singularity-term-readout", "--faction-singularity-stamp-bg"],
  ["SG well vs card chassis", "--faction-singularity-term-readout", "--faction-singularity-term-bg"],
  ["SG old total ink on stamp plate", "--faction-singularity-bracket", "--faction-singularity-stamp-bg"],
  ["SG stencil TOTAL on stamp plate", "--faction-singularity-vote-off", "--faction-singularity-stamp-bg"],
  // SNIDE — stamp plate is translucent black over the praxis card sheet
  ["SN acid on stamp plate", "--faction-snide-acid", "--faction-snide-stamp-bg", "--faction-snide-card-bg"],
  ["SN caption on stamp plate", "--faction-snide-card-muted", "--faction-snide-stamp-bg", "--faction-snide-card-bg"],
  ["SN pink loop on stamp plate", "--faction-snide-pink", "--faction-snide-stamp-bg", "--faction-snide-card-bg"],
  ["SN CARD ink on stamp plate (the trap)", "--faction-snide-note-ink", "--faction-snide-stamp-bg", "--faction-snide-card-bg"],
  ["SN CARD pink-ink on stamp plate (the trap)", "--faction-snide-note-pink-ink", "--faction-snide-stamp-bg", "--faction-snide-card-bg"],
  // WOW — the plaque fill IS the stamp plate
  ["WOW plaque panel vs stamp plate", "--faction-wow-chronicle-panel", "--faction-wow-stamp-bg"],
  ["WOW gilt figure on stamp plate", "--faction-wow-stamp-total", "--faction-wow-stamp-bg"],
  ["WOW plaque caption plum on panel", "--faction-wow-card-accent", "--faction-wow-chronicle-panel"],
  ["WOW gold frame on stamp plate", "--faction-wow-chronicle-gold", "--faction-wow-stamp-bg"],
  // Default / na — the conic ring lands on the score plate
  ["NA figure on stamp plate", "--faction-default-card-text", "--faction-default-stamp-bg"],
  ["NA caption on stamp plate", "--faction-default-card-muted", "--faction-default-stamp-bg"],
  ["NA old gold caption on stamp plate", "--faction-default-gold", "--faction-default-stamp-bg"],
  ["NA card-bg disc vs stamp plate", "--faction-default-card-bg", "--faction-default-stamp-bg"],
  ["NA figure on card sheet", "--faction-default-card-text", "--faction-default-card-bg"],
  ["NA caption on card sheet", "--faction-default-card-muted", "--faction-default-card-bg"],
];

describe("probe", () => {
  it("prints", () => {
    for (const [label, ink, ground, groundOver] of PAIRS) {
      const row: string[] = [];
      for (const theme of ["light", "dark"] as Theme[]) {
        const t = solid(ink, theme, groundOver);
        const g = solid(ground, theme, groundOver);
        if (!t.rgba || !g.rgba) {
          row.push(`${theme}: ? (${t.raw} / ${g.raw})`);
          continue;
        }
        row.push(`${theme}: ${formatRatio(contrastRatio(t.rgba, g.rgba))} (${t.raw} on ${g.raw})`);
      }
      console.log(`${label.padEnd(42)} ${row.join("  |  ")}`);
    }
  });
});
