/** The tile sat on theme-INVARIANT `card-*` tokens while the card flips with `term-*` (#2326); both pass contrast. */
import { describe, it, expect } from "vitest";

import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("singularity");

/** The frame's `--sg-select-*` role plumbing may name the flipping `card-*` family; nothing else may name a frozen one. */
const withoutRoleMap = (html: string): string => html.replace(/--sg-select-[\w-]+:var\([^)]*\);?/g, "");

describe("the Singularity tile wears the terminal's register (#2326)", () => {
  it("leaves no theme-INVARIANT Singularity family on the tile", () => {
    for (const frozen of [
      "--faction-singularity-card-bg",
      "--faction-singularity-card-text",
      "--faction-singularity-card-muted",
      "--faction-singularity-border-hard",
      "--faction-singularity-phosphor-dim",
    ]) {
      for (const html of markup()) {
        expect(withoutRoleMap(html), `${frozen} does not flip; the chassis under it does`).not.toContain(frozen);
      }
    }
  });

  it("spells the face as the faction's ROLE token, not the global family", () => {
    for (const html of markup()) {
      expect(html, "--font-faction-terminal is the raw family").not.toContain("--font-faction-terminal");
      expect(html).toContain("--faction-singularity-card-font");
    }
  });
});
