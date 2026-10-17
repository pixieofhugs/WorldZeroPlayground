// The faction-page STATE fixture for the faction copy sheet.
//
// The one copy: `.design-sync/previews/_state.tsx` re-exports it (that dir is not
// in the frontend Docker build context, so the app cannot import the other way).
// Its handlers are no-ops — the sheet must never fire a real write.

import type { FactionDetailState } from '../../../pages/factionDetail/useFactionDetail'
import { characterFor, taskFor, praxisCardsFor, noop } from './sheetFixtures'

/** async no-op for the `() => Promise<void>` handler fields. */
const anoop = async (): Promise<void> => {}

// ── factionDetail (faction page) ──────────────────────────────────────────────
/** A faction page: members, tasks, recent praxis, viewer not yet a member. */
export function factionDetailState(slug: string): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [characterFor(slug), characterFor(slug, { id: 8, display_name: 'Kestrel Ng', level: 6 })],
    tasks: [taskFor(slug), taskFor(slug, { id: 116, title: 'A second charge', level_required: 5 })],
    recentPraxis: praxisCardsFor(slug),
    // A signed-in viewer, so the task cards on a faction page offer their tasks
    // (#2188). `noop` is enough — a preview never presses anything.
    onSignup: noop,
    signupMsg: null,
    membership: {
      state: 'eligible',
      currentFactionSlug: null,
      join: anoop,
      joining: false,
      joinError: null,
    },
  }
}
