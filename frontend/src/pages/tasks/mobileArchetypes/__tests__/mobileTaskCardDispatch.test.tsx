/**
 * Per-item MOBILE task-card dispatch (#565). The mobile browse feed no longer
 * themes the whole page to one faction — each card picks its own skin from its
 * data item's faction slug, mirroring the desktop TaskCard per-item dispatch.
 * This asserts every real slug resolves to its bespoke card and that
 * unregistered / factionless slugs fall through to the Default mobile card.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import DefaultMobileTaskCard from '../cards/DefaultMobileTaskCard'
import UaMobileTaskCard from '../cards/UaMobileTaskCard'
import WowMobileTaskCard from '../cards/WowMobileTaskCard'
import SnideMobileTaskCard from '../cards/SnideMobileTaskCard'
import EverymenMobileTaskCard from '../cards/EverymenMobileTaskCard'
import SingularityMobileTaskCard from '../cards/SingularityMobileTaskCard'
import EphemeristsMobileTaskCard from '../cards/EphemeristsMobileTaskCard'

const CARD_BY_SLUG = {
  ua: UaMobileTaskCard,
  wow: WowMobileTaskCard,
  snide: SnideMobileTaskCard,
  everymen: EverymenMobileTaskCard,
  singularity: SingularityMobileTaskCard,
  ephemerists: EphemeristsMobileTaskCard,
} as const

describe('mobile task-card per-item dispatch', () => {
  for (const [slug, Card] of Object.entries(CARD_BY_SLUG)) {
    it(`a ${slug} task resolves to its bespoke mobile card`, () => {
      expect(pickVariant(surfaceMap('mobileTaskCard'), slug, DefaultMobileTaskCard)).toBe(Card)
    })
  }

  it('unregistered, factionless AND albescent tasks fall through to the Default mobile card', () => {
    for (const slug of ['__unregistered__', 'na', 'albescent', null]) {
      expect(pickVariant(surfaceMap('mobileTaskCard'), slug, DefaultMobileTaskCard)).toBe(DefaultMobileTaskCard)
    }
  })
})
