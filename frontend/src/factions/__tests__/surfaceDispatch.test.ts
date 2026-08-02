/**
 * Surface dispatch table (#782; ponytail test audit, 2026-07-23).
 *
 * One table for every surface that ships bespoke faction skins: which slugs
 * resolve to a bespoke component, and which fall through to the surface Default.
 * This replaces ~20 per-faction *Dispatch.test files that each re-proved
 * pickVariant's fall-through (now unit-tested in
 * utils/__tests__/factionDispatch.test.ts) while collectively MISSING factions —
 * e.g. coven and snide ship bespoke taskDetail skins but had no dispatch test
 * at all.
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
// wow is bespoke on task detail (#1037) and on every mobile surface below.
//
// albescent's rows below are WRAPPERS over Default, not bespoke skins
// (ADR-0048): it is a secret society hiding in plain sight, so an entry here
// means "Default plus a flourish", never a treatment of its own. ADR-0046's
// registration freeze was reversed with the praxis-detail epic (#1151), which
// changes whether a row may exist, not what shape it takes.
//
// FOUR MOBILE ROWS ARE ABSENT BY DECISION, not by oversight, and all four used
// to exist. There is no mobile task-card row (ADR-0056, surface retired by
// #1044), no mobile task-detail row (ADR-0058, #1068), no mobile praxis-detail
// row (ADR-0061 + epic #1085, #1089) and, since #1181, no `mobileEditPraxis` row
// (ADR-0065): each verdict accepted one responsive component per faction, so
// task cards partition on `taskCard` alone, task detail on `taskDetail` alone,
// praxis detail on `praxisDetail` alone and the composer on `editPraxis` alone,
// for both form factors. Re-adding any of the four means re-adding the surface,
// which those ADRs call drift rather than a rollback. Note what that buys
// albescent: its single `taskDetail` registration now covers the phone too, and
// it never needs a second row it would have had to stay out of.
//
// THE `editPraxis` ROW IS NEW (#1181) and, like `praxisDetail` above, it grows
// no further — all seven skins are already registered and epic #1179 rebuilds
// them in place rather than adding or dropping registrations. It exists because
// retiring `mobileEditPraxis` also retired the only test that proved composer
// dispatch at all (`mobileArchetypes/__tests__/dispatch.test.tsx`), and the
// composer should not be the one big surface with no row here. `albescent` and
// `na` are absent deliberately: ADR-0065 §4 says Albescent registers nothing on
// this surface and falls through to `DefaultEditPraxis`, WHICH IS the na kit.
//
// THE `praxisDetail` ROW IS BACK, and it grows one slug per landed skin. ADR-0061
// made praxis detail ONE shared page and #1089 de-registered all six CORE_SIX
// skins, so for a while every slug fell through to `DefaultPraxisDetail`; the
// Unaffiliated page IS the shared page. Epic #1085's designs re-register one at
// a time as DRESS over that same layout. A slug still absent here is a skin not
// yet built, not a decision that it renders the Default forever.
//
// The entries are NOT all the same kind of thing, which is the row's other
// reason to exist: most are bespoke dress, while `albescent` (#1140) is a
// WRAPPER that renders `DefaultPraxisDetail` whole and washes light over it.
// Both are "registered"; only one is a skin.
//
// THIS ROW IS A SHARED REGISTRY AND IT RED-MAINED TWICE (#1162). The assertions
// below run BOTH ways — a listed slug must be registered, and an UNLISTED slug
// must resolve to the Default — so a PR that rewrites this line instead of
// appending to it drops whichever siblings merged while it was in flight. Each
// PR was green on its own branch; the breakage only appears after the squash.
// Append your slug; never restate the list from memory.
const BESPOKE: Record<string, string[]> = {
  taskDetail: [...CORE_SIX, 'wow', 'albescent'],
  praxisDetail: ['coven', 'ephemerists', 'singularity', 'albescent', 'everymen', 'snide', 'wow', 'ua'],
  editPraxis: [...CORE_SIX, 'wow'],
  mobileFactionPage: [...CORE_SIX, 'wow'],
  mobileFieldDesk: [...CORE_SIX, 'wow'],
  // Was `mobilePraxisCard` with this exact slug list until ADR-0067 collapsed
  // the praxis card to one responsive component per faction. The row moved to
  // the surviving surface rather than dying with the retired one: all eight
  // slugs register `praxisCard`, and that card is now what a phone renders, so
  // this proves the same dispatch it always did on the only card left.
  praxisCard: [...CORE_SIX, 'wow', 'albescent'],
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
/* cross-faction path at all — so this enforces the second half: both must be  */
/* bespoke on every surface the core factions are.                            */
/* -------------------------------------------------------------------------- */

// The bar, derived so a new core surface raises it automatically: every surface
// the reference core factions all skin — `duelSeal` included, since all five
// register it. It used to exclude `mobileProfile` (only wow ever filled it) and
// `mobileDuelSeal`; #1319 and #1313 retired both surfaces outright, so there is
// nothing left to exclude. The crested profile is the mobile branch of
// `profileBody` and every seal is one responsive component behind `duelSeal`,
// and every reference faction already skins both.
const REFERENCE_FACTIONS = ['snide', 'ephemerists', 'singularity', 'everymen', 'ua']
const REQUIRED = SURFACE_KEYS.filter((surface) =>
  REFERENCE_FACTIONS.every((faction) => surfaceMap(surface)[faction] !== undefined),
)

// WOW desktop pages the design kit never drew — tracked by #951. Each must ship
// a bespoke skin; until then WOW renders the generic Default (N/A), not Coven.
// When a skin ships, drop the surface here and the "still pending" guard below
// fails, forcing this allowlist to shrink in lockstep with the fix.
// `taskDetail` left this set in #1037 — the parchment field, WOW's first
// desktop task-detail page — and `praxisDetail` left it in #1121, the chronicle
// entry: WOW's dress over the one shared praxis-detail page (ADR-0061). Two
// bullets of #951 remain, and neither is a page the kit ever drew.
const WOW_PENDING: ReadonlySet<string> = new Set([
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
