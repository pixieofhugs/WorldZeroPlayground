/**
 * Surface dispatch table (#782; ponytail test audit, 2026-07-23).
 *
 * One table for every surface that ships bespoke faction skins: which slugs
 * resolve to a bespoke component, and which fall through to the surface Default.
 * This replaces ~20 per-faction *Dispatch.test files that each re-proved
 * pickVariant's fall-through (now unit-tested in
 * utils/__tests__/factionDispatch.test.ts) while collectively MISSING factions —
 * e.g. coven and snide ship bespoke praxisDetail/taskDetail skins but had no
 * dispatch test at all.
 *
 * The BESPOKE lists below are the executable record of who has customised each
 * surface: a de-registration flips a bespoke row red, an accidental
 * registration flips a defaulted row red. Adding a faction skin is one edit here.
 *
 * Component identity per (surface, slug) is deliberately NOT asserted:
 * addAFaction.test proves the manifest→surface wiring generically, and each
 * surface's *Slots test renders every registered archetype's faction-specific
 * markup — a mis-wire surfaces there, not as a bare identity check here.
 */
import { describe, it, expect } from 'vitest'
import { surfaceMap } from '..'
import type { FactionSurface } from '..'

// The table asserts each surface's registry CONTENTS: a bespoke slug has an
// entry, a non-bespoke faction does not (and so falls through to the surface
// Default). pickVariant's fallback/alias/null resolution is not re-tested here —
// it is unit-tested in utils/__tests__/factionDispatch.test.ts.

// Every game faction slug, bespoke or not — the pool each surface partitions
// into bespoke vs defaulted.
const ALL_SLUGS = [
  'coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua', 'wow', 'albescent', 'na',
]

// The six with a full bespoke desktop + mobile treatment.
const CORE_SIX = ['coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua']

// surface → slugs that ship a bespoke skin there. Everything in ALL_SLUGS not
// listed (plus a junk slug and null) must fall through to the surface Default.
// wow is Default on desktop praxis/task detail but bespoke on every mobile
// surface; albescent is bespoke only on the praxis card.
const BESPOKE: Record<string, string[]> = {
  praxisDetail: CORE_SIX,
  taskDetail: CORE_SIX,
  mobileTaskDetail: [...CORE_SIX, 'wow'],
  mobileFactionPage: [...CORE_SIX, 'wow'],
  mobileFieldDesk: [...CORE_SIX, 'wow'],
  mobileEditPraxis: [...CORE_SIX, 'wow'],
  mobileTaskCard: [...CORE_SIX, 'wow'],
  mobilePraxisCard: [...CORE_SIX, 'wow', 'albescent'],
}

for (const [surface, bespoke] of Object.entries(BESPOKE)) {
  describe(`${surface} surface dispatch`, () => {
    const map = surfaceMap(surface as FactionSurface)

    it.each(bespoke)('registers a bespoke skin for %s', (slug) => {
      expect(map[slug]).toBeDefined()
    })

    const defaulted = ALL_SLUGS.filter((slug) => !bespoke.includes(slug))
    it.each(defaulted)('leaves %s to the surface Default', (slug) => {
      expect(map[slug]).toBeUndefined()
    })
  })
}
