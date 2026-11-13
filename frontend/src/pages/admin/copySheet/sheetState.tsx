// Faction-page STATE fixture for the faction copy sheet, re-exported by
// `.design-sync/previews/_state.tsx` (outside Docker context). Handlers are no-ops.

import type { FactionDetailState } from '../../../pages/factionDetail/useFactionDetail'
import { characterFor, taskFor, praxisCardsFor, noop } from './sheetFixtures'

/** async no-op for the `() => Promise<void>` handler fields. */
const anoop = async (): Promise<void> => {}

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
    // Signed-in viewer, so task cards offer signup (#2188).
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
