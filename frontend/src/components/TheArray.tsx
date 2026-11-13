import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useGameConfig } from '../hooks/useGameConfig'
import type { FactionConfigOut, GameConfigOut, LevelProfile } from '../api/gameConfig'
import { isFactionHiddenFromChoosers } from '../utils/factions'

/**
 * Singularity's Era 1 perk: **hacking** (#1869) — prints `/game-config`'s
 * numbers to the console. Information only; desktop-only by ruling.
 *
 * STANDING RULES:
 * 1. Print only from responses already received. No new endpoint/field/query.
 * 2. Print a CURATED ALLOWLIST by name, never a raw dump: `/auth/me`'s field
 *    NAMES alone leak "Albescent" (ADR-0027). `theArray.test.ts` forbids a spread.
 */

/** One faction's row in the readout — the six modifiers, plus the flag. */
interface ArrayFactionRow {
  slug: string
  own_task_modifier: number
  other_task_modifier: number
  collab_own_modifier: number
  collab_other_modifier: number
  duel_win_modifier: number
  duel_loss_modifier: number
  reads_the_array: boolean
}

/** The era rules stated as prose everywhere else, stated as numbers here. */
interface ArrayRules {
  level_thresholds: number[]
  duel_level_required: number
  max_task_signups: number
  collab_auto_submit_days: number
  pending_task_admin_review_hours: number
}

interface ArrayReadout {
  rules: ArrayRules
  factions: ArrayFactionRow[]
  level_profiles: LevelProfile[]
}

/**
 * The allowlist (rule 2): every key by hand; `{ ...faction }` is the bug.
 * Albescent's row is DROPPED (not masked: the mask would collide with `na`) —
 * `/game-config` carries it for everyone (ADR-0027). Nothing from `/auth/me`.
 * The joke: Singularity's own row is the baseline on every axis — keep it.
 */
export function buildArrayReadout(config: GameConfigOut): ArrayReadout {
  return {
    rules: {
      level_thresholds: config.level_thresholds,
      duel_level_required: config.duel_level_required,
      max_task_signups: config.max_task_signups,
      collab_auto_submit_days: config.collab_auto_submit_days,
      pending_task_admin_review_hours: config.pending_task_admin_review_hours,
    },
    factions: config.factions
      .filter((faction) => !isFactionHiddenFromChoosers(faction.slug))
      .map((faction: FactionConfigOut) => ({
        slug: faction.slug,
        own_task_modifier: faction.own_task_modifier,
        other_task_modifier: faction.other_task_modifier,
        collab_own_modifier: faction.collab_own_modifier,
        collab_other_modifier: faction.collab_other_modifier,
        duel_win_modifier: faction.duel_win_modifier,
        duel_loss_modifier: faction.duel_loss_modifier,
        reads_the_array: faction.reads_the_array,
      })),
    level_profiles: config.level_profiles.map((profile) => ({
      rank_key: profile.rank_key,
      unlocks: profile.unlocks.map((unlock) => ({
        kind: unlock.kind,
        key: unlock.key,
      })),
    })),
  }
}

/** Does this character's faction read the array? The config row is the answer. */
export function readsTheArray(
  factionSlug: string | null | undefined,
  config: GameConfigOut | null,
): boolean {
  if (!factionSlug || !config) return false
  return config.factions.some(
    (faction) => faction.slug === factionSlug && faction.reads_the_array,
  )
}

/**
 * `console.table` so the baseline row reads as blank (the joke).
 * Load-bearing: any console stripping in the build kills the perk;
 * `theArray.test.ts` trips on it (see `vite.config.ts`).
 */
export function printTheArray(readout: ArrayReadout): void {
  console.log('the array // era configuration', readout)
  console.table(readout.factions)
}

/**
 * Mounted once in `Layout`; renders nothing.
 * ponytail: eager (~0.4 KB gz in the initial chunk); ceiling is
 * `scripts/bundle-budget.mjs`. Upgrade: move `readsTheArray` out, then lazy-import gated on it.
 */
export default function TheArray() {
  const { user } = useAuth()
  const config = useGameConfig()
  const factionSlug = user?.character?.faction_slug ?? null

  useEffect(() => {
    if (!config || !readsTheArray(factionSlug, config)) return
    printTheArray(buildArrayReadout(config))
  }, [factionSlug, config])

  return null
}
