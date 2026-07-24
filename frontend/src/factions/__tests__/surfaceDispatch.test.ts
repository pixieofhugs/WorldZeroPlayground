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
import { surfaceMap, SURFACE_KEYS } from '..'
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

/* -------------------------------------------------------------------------- */
/* WOW + Coven completeness (owner ruling, 2026-07-23)                        */
/*                                                                            */
/* Coven and WOW are distinct factions that must never fall back on each      */
/* other aesthetically, and a faction missing a custom experience is a design */
/* bug. Any fallback goes to the generic Default (N/A) — pickVariant has no    */
/* cross-faction path (FACTION_ALIASES is empty) — so this enforces the second */
/* half: both must be bespoke on every surface the core factions are.         */
/* -------------------------------------------------------------------------- */

// The bar, derived so a new core surface raises it automatically: every surface
// the reference core factions all skin. Excludes the duel surfaces (ua leaves
// them Default) and mobileProfile (only wow has it) by construction.
const REFERENCE_FACTIONS = ['snide', 'ephemerists', 'singularity', 'everymen', 'ua']
const REQUIRED = SURFACE_KEYS.filter((surface) =>
  REFERENCE_FACTIONS.every((faction) => surfaceMap(surface)[faction] !== undefined),
)

// WOW desktop pages the design kit never drew — tracked by #951. Each must ship
// a bespoke skin; until then WOW renders the generic Default (N/A), not Coven.
// When a skin ships, drop the surface here and the "still pending" guard below
// fails, forcing this allowlist to shrink in lockstep with the fix.
const WOW_PENDING: ReadonlySet<string> = new Set([
  'taskDetail',
  'praxisDetail',
  'factionCard',
  'factionBody',
])

describe('Coven is bespoke on every core surface, never the Default', () => {
  it.each(REQUIRED)('coven skins %s', (surface) => {
    expect(surfaceMap(surface)['coven']).toBeDefined()
  })
})

describe('WOW is bespoke on every core surface except the #951 pending set', () => {
  it.each(REQUIRED.filter((surface) => !WOW_PENDING.has(surface)))('wow skins %s', (surface) => {
    expect(surfaceMap(surface)['wow']).toBeDefined()
  })

  it.each([...WOW_PENDING])('%s is still pending a WOW skin (#951) — falls to Default', (surface) => {
    expect(surfaceMap(surface as FactionSurface)['wow']).toBeUndefined()
  })
})
