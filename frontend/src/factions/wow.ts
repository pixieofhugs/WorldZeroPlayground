/**
 * wow — Warriors of Whimsy's FIRST bespoke surfaces (#821).
 *
 * #784 stripped WOW's old lo-fi pink `.exe` identity (it moved to Cozy Coven),
 * and #812 gave back only a yellow THEME — no skin. This manifest is the first
 * slice of WOW's own kit: the praxis card (a yellow CHRONICLE, the same frame
 * Coven wears in gold/plum, recoloured — never gold/plum here) plus its mobile
 * twin and the googly-balloon vote widget.
 *
 * Override-only, like every manifest: WOW still falls through to the `Default*`
 * archetype on every OTHER surface — it is themed-and-partly-skinned now, not
 * fully dressed. `wowRendersDefault.test.tsx` pins exactly which three surfaces
 * are claimed and asserts the rest still fall back.
 *
 * Entries are thunks (`() => Component`) so they are read at render time, never
 * during module evaluation — see the cycle note in `./manifest.ts`.
 */
import type { FactionManifest } from './manifest'

import WowVote from '../components/vote/WowVote'
import WowMobilePraxisCard from '../components/praxisCard/mobile/WowMobilePraxisCard'
import WowPraxisCard from '../components/praxisCard/desktop/WowPraxisCard'

export const WOW_MANIFEST: FactionManifest = {
  slug: 'wow',

  praxisCard: () => WowPraxisCard,
  mobilePraxisCard: () => WowMobilePraxisCard,
  vote: () => WowVote,
}
