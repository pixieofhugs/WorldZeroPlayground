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

/**
 * DELIBERATELY EMPTY — this spec does not go green until #651's open question
 * is answered. See the escalation comment on the issue.
 *
 * The sweep run produced two populations, and only one of them fits the entry
 * shape above:
 *
 *   - **149 distinct measured failures.** Real, keyed on their color pair,
 *     each carrying a ratio. These are the audit list, and they slot straight
 *     in. (They reproduce all four of #651's hand-measured failures exactly.)
 *
 *   - **134 "unresolved backdrop" findings**, overwhelmingly text sitting on a
 *     surface that paints a *translucent texture* over its own solid fill —
 *     the paper grain `radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)`
 *     on `div.page` and on the faction cards. #651 calls failing loudly here
 *     non-negotiable, on the stated premise that "the gradient is only behind
 *     them". The sweep disproves that premise: the grain is painted ON the
 *     text-bearing surfaces. These findings have NO ratio (so they cannot
 *     carry one, as the entry shape requires) and no stable identity except a
 *     DOM path that rots on the next copy edit.
 *
 * Populating this list with 134 DOM-path keys would bury the 149 real findings
 * and rot immediately, so it is left empty rather than guessed at.
 */
export const RENDERED_BASELINE: Record<string, BaselineEntry> = {};

export function baselineKey(theme: string, text: string, background: string): string {
  return `${theme} | ${text} on ${background}`;
}
