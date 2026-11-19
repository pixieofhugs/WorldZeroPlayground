import { it, vi } from "vitest";
import { appendFileSync } from "node:fs";
import { renderComposer } from "./renderComposer";
vi.mock("../../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));
const NAMES = ["Default", "Ua", "Wow", "Coven", "Snide", "Ephemerists", "Singularity", "Everymen"];
const CANDS = [
  "sg-composer-off", "data-composer-body",
  "var(--faction-default-composer-field)", "var(--faction-ua-panel)", "var(--faction-wow-chronicle-panel)",
  "var(--faction-coven-ward-page)", "var(--faction-snide-composer-field)", "var(--faction-ephemerists-plate-inner)",
  "var(--faction-singularity-term-panel)", "var(--faction-everymen-sheet-panel)",
  'opacity="var(--faction-coven-ward-haze)"', "var(--faction-coven-slip-lav)", "--label-ink",
  "var(--faction-ua-card-lotus)", "var(--faction-ua-card-lotus-opacity)", "var(--faction-ua-card-muted)",
  "em-burst", "var(--everymen-muted)", "sg-scan", "var(--faction-singularity-term-scan) 0 1px",
  "var(--faction-default-aurora)", "var(--faction-default-aurora-opacity)", "var(--faction-default-composer-faint)",
];
it("p", async () => {
  for (const n of NAMES) {
    const h = await renderComposer(n + "EditPraxis");
    appendFileSync("/tmp/claude-1001/-home-pixie-Projects-WorldZeroPlayground/579d116f-f16e-4a94-8af3-656c5bee696a/scratchpad/3359-probe.txt", [n, h.length, CANDS.filter((c) => h.includes(c)).join(" | ")].join(" ") + "\n");
  }
});
