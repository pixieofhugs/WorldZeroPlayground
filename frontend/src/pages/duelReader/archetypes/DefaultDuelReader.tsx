/**
 * na's side-by-side duel reader (#1084) — and, until a faction's own design
 * lands, everybody's.
 *
 * It passes NOTHING. That is not an unfinished file: the chassis spreads
 * `factionRoleVars(groundSlug, 'duel-reader')` on the sheet it draws, and since
 * ADR-0089 that map answers for every slug — na, Albescent, and one the server
 * invents tomorrow — so an archetype that overrides nothing already wears the
 * ground of whichever faction owns the task. What a skin adds here is dress on
 * top of a page that is already the right colour, not the colour itself.
 *
 * The ground is the TASK's faction rather than either duellist's, which is what
 * the one-ground ruling (2026-08-27) means on this surface — see the chassis
 * header. Each duellist's own faction rides on their sigil.
 *
 * This is `default.ts`'s row, so it is the one archetype that may never be
 * absent: nothing is behind it (#2530).
 */
import { DuelReaderFrame } from '../shared'
import type { DuelReaderState } from '../useDuelReader'

export default function DefaultDuelReader({ state }: { state: DuelReaderState }) {
  return (
    <DuelReaderFrame
      state={state}
      groundSlug={state.praxes?.challenger.task_faction_slug ?? null}
    />
  )
}
