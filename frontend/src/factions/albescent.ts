/**
 * albescent — the faction that overrides nothing (#783).
 *
 * Every other manifest in this directory lists the surfaces its faction dresses
 * up. Albescent's started empty, and that was the whole design: it is a secret
 * society hiding in plain sight, so it must be indistinguishable from an
 * unaffiliated player on every surface. The manifest is override-only, so
 * declaring nothing hands Albescent the `Default*` archetype everywhere —
 * including on surfaces that do not exist yet, which is the property a
 * hand-maintained list of "Albescent renders Default here" wrappers could never
 * keep. ADR-0048 then made "frozen" mean "frozen UNTIL DESIGNED": the few rows
 * below are surfaces whose design has landed, and each is `Default` PLUS a
 * flourish rather than a skin of its own. Everything unlisted still falls
 * through, and that remains the default state, not the exception.
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
import AlbescentTaskCard from '../components/cards/AlbescentTaskCard'
import AlbescentVote from '../components/vote/AlbescentVote'
import AlbescentPraxisCard from '../components/praxisCard/desktop/AlbescentPraxisCard'
import AlbescentMobilePraxisCard from '../components/praxisCard/mobile/AlbescentMobilePraxisCard'
import AlbescentSeal from '../components/metaTaskSeal/skins/AlbescentSeal'

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

  /**
   * The task-card tell (#1023, ADR-0048) — the second surface to unfreeze, and
   * the same "NA + drift" shape as the praxis cards above. It renders
   * `DefaultTaskCard` and washes two flourishes over it (a drifting spectrum
   * edge, a breathing aurora), so the design's whole delta from unaffiliated is
   * MOTION. Note there is no `mobileTaskCard` sibling: the v2 task card is one
   * responsive component (ADR-0056), so this single row covers both form
   * factors.
   */
  taskCard: () => AlbescentTaskCard,

  /**
   * The ferrofluid vote widget (#843, the eighth of #821's eight). Same rule as
   * the cards above: it is the neutral spectrum row an unaffiliated player sees,
   * with the blobs slowly morphing between polygon lobe counts — a flourish over
   * Default's structure, not a repaint in Albescent's colours. Without this
   * registration Albescent fell through to `UnaffiliatedVote`, which looked
   * plausible enough that the gap went unnoticed. Its tier WORDS stay gone
   * (#783): the widget prints plain numerals via `reframeLabel`.
   */
  vote: () => AlbescentVote,

  /**
   * The seal skin (#930). A seal is a FOREIGN sticker that keeps its ISSUER's
   * voice on someone else's praxis — so an Albescent-issued metatask is a reveal
   * moment, not a host surface Albescent has to hide on. It reads the always-
   * light `--albescent-reveal-*` tokens (the same reveal register as the
   * invitation letter and sigil), never a `--faction-albescent-*` theme, so the
   * society shows its pale face only where it is doing the sealing.
   */
  metaTaskSeal: () => AlbescentSeal,
}
