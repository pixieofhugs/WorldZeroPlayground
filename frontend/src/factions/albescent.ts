/**
 * albescent — the faction that overrides nothing (#783).
 *
 * Every other manifest in this directory lists the surfaces its faction dresses
 * up. Albescent's is empty, and that is the whole design: it is a secret society
 * hiding in plain sight, so it must be indistinguishable from an unaffiliated
 * player on every surface. The manifest is override-only, so declaring nothing
 * hands Albescent the `Default*` archetype everywhere — including on surfaces
 * that do not exist yet, which is the property a hand-maintained list of
 * "Albescent renders Default here" wrappers could never keep.
 *
 * It had 22 bespoke components (#232) and a 35-declaration token block. Both are
 * gone. The wrappers went too rather than being thinned to pass-throughs: an
 * undeclared surface already falls through, so a file that adds nothing is worse
 * than no file — it is a place for divergence to creep back in.
 *
 * WHY THE MODULE SURVIVES AT ALL. Albescent stays registered: it is a real
 * faction with members, a roster, an invitation flow and a level-8 unlock. This
 * is the seam where its flourishes land — the animations that reveal the society
 * to someone already looking, which unaffiliated does not have. That work is
 * deliberately not in this issue. Until it exists, the empty manifest is the
 * correct and complete statement of Albescent's appearance.
 *
 * Anything added here must be a flourish LAYERED OVER Default's structure
 * reading `--faction-default-*`. A surface that repaints Albescent in its own
 * colours puts it back in the spectrum and un-hides it.
 */
import type { FactionManifest } from './manifest'

import { AlbescentSelectCard } from '../components/cards/FactionSelectCard'
import { AlbescentPraxisCard } from '../components/PraxisCard'
import AlbescentMobilePraxisCard from '../components/praxisCard/mobile/AlbescentMobilePraxisCard'

export const ALBESCENT_MANIFEST: FactionManifest = {
  slug: 'albescent',

  /**
   * The single surviving override, and it is a REVEAL surface, not a skin: the
   * `/factions` tile is only ever shown to an account already revealed to the
   * society (ADR-0027, #390). See the component for why removing it would make
   * Albescent MORE conspicuous rather than less — the dispatcher's fallback is
   * UA's costume, not a neutral card (#796).
   */
  factionSelectCard: () => AlbescentSelectCard,

  /**
   * The praxis-card tell (#821, ADR-0048). These are NOT bespoke skins: each
   * renders the exact spectrum `Default` card an unaffiliated player sees, with
   * a slow rainbow DRIFT washed over it — the flourish that reveals the society
   * to someone already looking. A repaint in Albescent's own colours would put
   * it back in the spectrum and un-hide it, so this stays "NA + drift". Every
   * other surface still falls through to Default (#783).
   */
  praxisCard: () => AlbescentPraxisCard,
  mobilePraxisCard: () => AlbescentMobilePraxisCard,
}
