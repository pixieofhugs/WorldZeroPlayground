/**
 * Part C of the contrast foundation (#651) — the baseline allowlist for the
 * RENDERED sweep. (The token-value sweep has its own list, in
 * `src/utils/__tests__/factionContrast.test.ts`.)
 *
 * `contrast.spec.ts` was red on landing: this bug family is real, pre-dates
 * the guard, and has already leaked past three hand audits. Blocking the guard
 * on the fixes would have kept the leak open, so the known failures are
 * enumerated here and the fixes land as children. Mirrors the repo's existing
 * `no-raw-style-values` ratchet doctrine — new violations blocked, known debt
 * tracked and visible.
 *
 * THE KEY IS THE COLOR PAIR, NOT THE DOM NODE. A rendered failure IS a
 * (text, backdrop) pairing; which component happens to produce it is
 * incidental, changes with every copy edit, and would make this list rot. So
 * `theme | rgb(text) on rgb(backdrop)` is the identity, and `where` is only a
 * breadcrumb for whoever picks up the fix.
 *
 * **This list only ever shrinks.** Fixing a pair means DELETING its entry, not
 * editing the ratio — an allowlisted pair that starts passing fails the spec
 * on purpose (see `contrast.spec.ts`). Never add an entry for new work.
 */

export type BaselineEntry = {
  /** Measured ratio when this entry landed. */
  ratio: number;
  /** The issue that owns the fix. 651 = found by the sweep, awaiting a child. */
  issue: number;
  /** Where it was seen — a breadcrumb, not part of the identity. */
  where: string;
};

export const RENDERED_BASELINE: Record<string, BaselineEntry> = {};

export function baselineKey(theme: string, text: string, background: string): string {
  return `${theme} | ${text} on ${background}`;
}
