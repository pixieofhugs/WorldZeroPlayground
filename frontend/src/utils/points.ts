import type { FactionConfigOut } from '../api/gameConfig'

/** Sentinel slug for tasks with no specific faction affiliation (see backend `UNAFFILIATED_FACTION_SLUG`). */
const UNAFFILIATED_FACTION_SLUG = 'na'

/**
 * The identity multiplier. `era_1` neutralizes every faction's own/other task
 * modifier to this, which is why no card shows a modifier badge today — the
 * mechanism is live infrastructure, merely turned off (ADR-0055).
 */
const NEUTRAL_MULTIPLIER = 1

/** Float slop tolerance — `0.1 + 0.2` arithmetic must not light up a badge. */
const MULTIPLIER_EPSILON = 1e-9

/**
 * Resolve the per-faction task multiplier the viewer earns on a task.
 *
 * Mirrors `compute_faction_multiplier` in backend/services/scoring.py:
 * - If the player has no faction / unknown faction, there is no modifier (1.0).
 * - Tasks with no faction or the `na` sentinel are treated as own-faction
 *   (no penalty) — matches backend behavior.
 * - If the task faction matches the player's faction, use own_task_modifier.
 * - Otherwise use other_task_modifier.
 *
 * This is the RAW factor. Task cards render it beside base points rather than
 * pre-multiplying (ADR-0055), and must never reconstruct it as
 * `effective / base` — that reconstruction is the dead-arithmetic trap
 * ADR-0053 named.
 */
export function computeFactionMultiplier(
  playerFactionSlug: string | null | undefined,
  taskFactionSlug: string | null | undefined,
  factionConfigs: FactionConfigOut[],
): number {
  if (!playerFactionSlug) return NEUTRAL_MULTIPLIER

  const playerFaction = factionConfigs.find((f) => f.slug === playerFactionSlug)
  if (!playerFaction) return NEUTRAL_MULTIPLIER

  const isOwnFaction =
    !taskFactionSlug
    || taskFactionSlug === playerFactionSlug
    || taskFactionSlug === UNAFFILIATED_FACTION_SLUG

  return isOwnFaction
    ? playerFaction.own_task_modifier
    : playerFaction.other_task_modifier
}

/**
 * True when a multiplier is the identity and so carries no information — the
 * gate every card's `×n` badge hides behind (ADR-0055). Shared so nine skins
 * cannot drift into nine different float comparisons.
 */
export function isNeutralMultiplier(multiplier: number): boolean {
  return Math.abs(multiplier - NEUTRAL_MULTIPLIER) < MULTIPLIER_EPSILON
}

/**
 * A points figure for a one-line stamp: whole numbers stay whole, anything else
 * takes one decimal — never a raw float with fifteen digits of arithmetic noise
 * on it. A praxis score is a weighted sum, so that noise is the normal case.
 *
 * Lives here rather than beside any one surface because the duel stakes tiles,
 * the desktop FieldDesk's "continue" rows and all eight mobile field desks print
 * the same kind of figure, and three private copies of one `toFixed` is how the
 * rounding rule drifts (#1834).
 */
export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Compute the display point value for a task given the viewing player's
 * faction — base points with {@link computeFactionMultiplier} already applied,
 * rounded to an integer.
 *
 * Task cards no longer consume this (they take base + multiplier separately,
 * ADR-0055); it remains for surfaces that want a single combined number.
 */
export function computeDisplayPoints(
  basePoints: number,
  playerFactionSlug: string | null | undefined,
  taskFactionSlug: string | null | undefined,
  factionConfigs: FactionConfigOut[],
): number {
  return Math.round(
    basePoints
      * computeFactionMultiplier(playerFactionSlug, taskFactionSlug, factionConfigs),
  )
}
