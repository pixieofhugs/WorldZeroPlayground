/**
 * Task-browse level filter options, derived from the era's own level ladder
 * (#1046). Pure so it is testable without a DOM — the repo's harness is
 * `renderToStaticMarkup` only, so effects never run and the hook that consumes
 * this can't be driven from a test.
 *
 * The bound used to be the literal `[0, 1, 2, 3, 4, 5]`, which is a value that
 * lives in `EraConfig` and so may not be hardcoded here (CLAUDE.md, "Do NOT").
 * It was also simply wrong: `era_1.level_thresholds` has nine entries, tasks are
 * seeded up to `level_required=8`, and levels 6–8 were unfilterable.
 *
 * `level_thresholds` is one entry per level starting at index 0 (`thresholds[0]
 * = 0` — everyone starts at level 0), so the browsable levels are exactly its
 * indices. Level 0 is a real, filterable level, not an off-by-one: `na` seeds a
 * level-0 self-portrait task each era.
 */

/**
 * The level values the browse filter should offer, given `/game-config`'s
 * `level_thresholds`.
 *
 * Returns `[]` before the config lands (or if a stale payload omits it) — the
 * filter is then hidden rather than rendered as an empty or wrongly-bounded row,
 * per "hide controls a user can't use".
 */
export function levelFiltersFromThresholds(thresholds: number[] | undefined | null): number[] {
  if (!thresholds || thresholds.length === 0) return []
  return thresholds.map((_threshold, level) => level)
}
