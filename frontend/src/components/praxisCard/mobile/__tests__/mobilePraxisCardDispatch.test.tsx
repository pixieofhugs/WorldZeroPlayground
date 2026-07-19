/**
 * Per-item MOBILE praxis-card dispatch (#573). The mobile praxis stream no
 * longer themes the whole page to one faction — each card picks its own bespoke
 * skin from its item's `task_faction_slug`, mirroring the desktop PraxisCard
 * per-item dispatch. This asserts every real slug resolves to its bespoke card
 * and that unregistered / factionless slugs fall through to the Default card.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import DefaultMobilePraxisCard from '../DefaultMobilePraxisCard'
import UaMobilePraxisCard from '../UaMobilePraxisCard'
import WowMobilePraxisCard from '../WowMobilePraxisCard'
import SnideMobilePraxisCard from '../SnideMobilePraxisCard'
import EphemeristsMobilePraxisCard from '../EphemeristsMobilePraxisCard'
import SingularityMobilePraxisCard from '../SingularityMobilePraxisCard'
import EverymenMobilePraxisCard from '../EverymenMobilePraxisCard'
import AlbescentMobilePraxisCard from '../AlbescentMobilePraxisCard'

const CARD_BY_SLUG = {
  ua: UaMobilePraxisCard,
  wow: WowMobilePraxisCard,
  snide: SnideMobilePraxisCard,
  ephemerists: EphemeristsMobilePraxisCard,
  singularity: SingularityMobilePraxisCard,
  everymen: EverymenMobilePraxisCard,
  albescent: AlbescentMobilePraxisCard,
} as const

describe('mobile praxis-card per-item dispatch', () => {
  for (const [slug, Card] of Object.entries(CARD_BY_SLUG)) {
    it(`a ${slug} praxis resolves to its bespoke mobile card`, () => {
      expect(pickVariant(surfaceMap('mobilePraxisCard'), slug, DefaultMobilePraxisCard)).toBe(Card)
    })
  }

  it('an unregistered / factionless praxis falls through to the Default mobile card', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobilePraxisCard'), slug, DefaultMobilePraxisCard)).toBe(
        DefaultMobilePraxisCard,
      )
    }
  })
})
