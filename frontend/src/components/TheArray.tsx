import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useGameConfig } from '../hooks/useGameConfig'
import type { FactionConfigOut, GameConfigOut, LevelProfile } from '../api/gameConfig'
import { isFactionHiddenFromChoosers } from '../utils/factions'

/**
 * Singularity's Era 1 perk: **hacking** (#1869).
 *
 * The array reads the game's configuration in the browser console, on surfaces
 * that render it only as prose. `/game-config` already ships to every client
 * and the UI states all of it in words — the invitation letters' perk lines,
 * the level-up popup's rank copy — so the numbers behind those sentences are in
 * the browser already and nothing shows them. This prints them.
 *
 * It grants information and alters no score, no modifier and no gate, which is
 * why it could ship mid-era at all (#1869 ruling 1). It is desktop-only by
 * ruling 3 — there is no F12 on a phone, and no in-app mirror is owed.
 *
 * There is deliberately **no server-side enforcement door** to pair with this.
 * Nothing is being withheld: every client already holds the payload, and the
 * flag that grants the perk rides in the very payload the perk prints.
 *
 * ---
 *
 * # THE TWO STANDING RULES
 *
 * **1. The array may only print from responses the client has already
 * received. Never a new endpoint, never a new field, never a new query.**
 *
 * **2. The array prints a CURATED ALLOWLIST of named values. Never a raw
 * payload dump.**
 *
 * Rule 1 makes *"can this leak personal information?"* answerable by
 * inspection: if a value is not already on the wire, the console cannot print
 * it. Everything below comes from the one `GET /game-config` the app already
 * makes; `buildArrayReadout` takes that payload and nothing else, so a reviewer
 * checking rule 1 only has to read its signature.
 *
 * **Rule 2 exists because rule 1 alone is not sufficient, and the failure is
 * subtle.** `GET /auth/me` carries `can_start_as_albescent` and
 * `second_character_level_required` as FIELD NAMES. A single `console.log(user)`
 * therefore leaks the word *"Albescent"* to a player who has never been
 * revealed to it — **the secret escapes through the KEY, not the value** — and
 * rule 1 permits it, because the payload was already received. That would blow
 * ADR-0027 in one line no reviewer would flag.
 *
 * So `buildArrayReadout` enumerates the exact values it prints, by name, at its
 * own call site. A field added to `GameConfigOut` or `FactionConfigOut`
 * tomorrow does not reach the console until someone deliberately writes its
 * name here. `theArray.test.ts` is what stops that literal being replaced by a
 * spread.
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
 * The allowlist, and the whole of it (standing rule 2).
 *
 * Every key below is written out by hand on purpose. `{ ...faction }` would be
 * shorter and is exactly the bug rule 2 exists to prevent: it would print
 * whatever the payload happens to carry next release, which is how a field name
 * nobody thought about reaches a player's console.
 *
 * **What is deliberately NOT here, and why (#1869):**
 *
 * - **Albescent's existence.** A real server-side secret (ADR-0027): the
 *   faction-listing routes omit it until `account.albescent_revealed`. But
 *   `/game-config` is not one of those routes — it serialises
 *   `CURRENT_ERA.factions` whole, so the slug IS in this payload for every
 *   caller, revealed or not. Rule 1 would therefore permit printing it, and
 *   printing it would erode ADR-0027's sticky, earned reveal into something
 *   obtainable by picking a faction. Hence the filter: this readout drops the
 *   row, the same call the choosers make. Dropping rather than masking, because
 *   `factionName()`'s mask renders "Unaffiliated" and there is already a real
 *   `na` row here for it to collide with.
 * - **Vote values.** `VoterDetail.value` is already rendered on every task
 *   detail page, so logging it would give Singularity nothing.
 * - **Faction join criteria.** The seven ordinary factions gate on holding an
 *   invitation, which `FactionStatusOut.status` already tells the player. The
 *   Albescent bar is not in `GameConfigOut` and must not be put there — see
 *   above; printing the bar is worse than printing that the faction exists.
 * - **Anything at all from `/auth/me`.** Rule 2's worked example. This function
 *   is given the game config and is given nothing else, which is the cheapest
 *   possible proof.
 *
 * **The joke, which must not be smoothed away:** the array prints every
 * faction's modifiers and Singularity's own row is the era baseline on every
 * axis. Its perk is being the faction that can see its slot is blank.
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

/**
 * Does this character's faction read the array?
 *
 * A FACTION branch, not a level comparison, so `api/auth.ts`'s "drive UI off
 * capability flags instead of comparing `character.level`" does not apply —
 * and this is not a capability flag either, because there is no capability to
 * grant. The config row IS the answer, read out of the same payload the perk
 * prints.
 */
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
 * Write the readout to the devtools console.
 *
 * `console.table` for the faction rows specifically: a table is where a row
 * that matches the baseline on every column reads as blank, which is the joke.
 *
 * **This output surviving the production build is load-bearing and invisible.**
 * There is no `no-console` ESLint rule and `vite.config.ts` sets no
 * `minify` / `drop` / `terser` configuration, so esbuild's default keeps these
 * calls. A future `esbuild: { drop: ['console'] }` — a normal, sensible
 * optimisation — would delete a faction's entire perk with nothing failing.
 * `theArray.test.ts` fails if that is ever configured; see the note in
 * `vite.config.ts`.
 */
export function printTheArray(readout: ArrayReadout): void {
  console.log('the array // era configuration', readout)
  console.table(readout.factions)
}

/**
 * Mounted once in `Layout`, beside `LevelUpWatcher` and `InvitationWatcher`,
 * and renders nothing — the array speaks in the console, never on the page.
 *
 * ponytail: imported eagerly, so this module's ~0.4 KB gzipped rides in the
 * initial chunk for every visitor to serve one faction. Measured against
 * `origin/main`: JS 126.9 → 127.3 KB, still `ok` and 3.6 KB under the warn
 * line, so the byte is not worth a code-split today. The ceiling is the initial
 * JS budget in `scripts/bundle-budget.mjs`; if it tightens, the upgrade is a
 * `void import('./TheArray')` inside the effect, guarded by `readsTheArray` —
 * which would have to move out of this module first, since the gate must be
 * answerable before the chunk is fetched.
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
