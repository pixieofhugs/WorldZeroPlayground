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
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { surfaceMap, SURFACE_KEYS } from '..'
import type { FactionSurface } from '..'

/** Every non-test source module under `src`, as [path relative to src, text]. */
function walkSource(root: string): Array<[string, string]> {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry)
      return statSync(full).isDirectory() ? files(full) : [full]
    })
  return files(root)
    .filter(
      (path) =>
        /\.tsx?$/.test(path) &&
        !/\.test\.tsx?$/.test(path) &&
        !path.includes(`${sep}__tests__${sep}`),
    )
    .map((path) => [relative(root, path), readFileSync(path, 'utf8')])
}

// The table asserts each surface's registry CONTENTS: a bespoke slug has an
// entry, a non-bespoke faction does not (and so falls through to the surface
// Default). pickVariant's fallback/alias/null resolution is not re-tested here —
// it is unit-tested in utils/__tests__/factionDispatch.test.ts.

// Every game faction slug, bespoke or not — the pool each surface partitions
// into bespoke vs defaulted.
const ALL_SLUGS = [
  'coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua', 'wow', 'albescent', 'na',
]

// The six with a full bespoke treatment. (They HAD a bespoke desktop skin and a
// separate bespoke phone one on several surfaces; ADR-0056/0058/0061/0065/0067
// and ADR-0078 have collapsed every one of those pairs, so on the rows below
// this is one component per faction serving both widths.)
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
// FIVE MOBILE ROWS ARE ABSENT BY DECISION, not by oversight, and all five used
// to exist. There is no mobile task-card row (ADR-0056, surface retired by
// #1044), no mobile task-detail row (ADR-0058, #1068), no mobile praxis-detail
// row (ADR-0061 + epic #1085, #1089), since #1181 no `mobileEditPraxis` row
// (ADR-0065), and since #1314 no `mobileFactionPage` row (ADR-0078): each
// verdict accepted one responsive component per faction, so task cards partition
// on `taskCard` alone, task detail on `taskDetail` alone, praxis detail on
// `praxisDetail` alone, the composer on `editPraxis` alone and faction detail on
// `factionBody` alone, for both form factors. Re-adding any of the five means
// re-adding the surface, which those ADRs call drift rather than a rollback.
// Note what that buys albescent: its single `taskDetail` registration now covers
// the phone too, and it never needs a second row it would have had to stay out
// of.
//
// THE `editPraxis` ROW IS NEW (#1181). It exists because retiring
// `mobileEditPraxis` also retired the only test that proved composer dispatch at
// all (`mobileArchetypes/__tests__/dispatch.test.tsx`), and the composer should
// not be the one big surface with no row here.
//
// It said it would grow no further, and #2505 grew it by one. The claim was
// about SKINS — all seven of those are registered and epic #1179 rebuilt them in
// place — and `albescent` is not one: it is a WRAPPER that renders
// `DefaultEditPraxis` whole and hands it one ornament span, the same shape as
// its `taskDetail` and `praxisDetail` rows. ADR-0065 §4's "Albescent registers
// nothing on this surface" was true while the two kits were pixel-identical and
// stopped being true at #2404, which ruled that Albescent's borders move. `na`
// is still absent, and permanently: it IS `DefaultEditPraxis`.
//
// THE `mobileFieldDesk` ROW takes `albescent` for the same reason (#2505, epic
// #2496 ruling 5) and on the same terms — `AlbescentFieldDesk` renders
// `DefaultFieldDesk` whole and only sets its existing spectrum hairline
// travelling. Ruling 5 also says what is NOT here: the desktop `/field-desk`
// page dispatches on no faction at all, so there is no desktop row to add.
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
  editPraxis: [...CORE_SIX, 'wow', 'albescent'],
  // THE `createCharacter` ROW IS NEW (#2346/#2347) and it is the one row here
  // that is expected to GROW, one slug per landed archetype — #2348–#2353 fan
  // out in parallel behind the chassis, which is exactly the shape the note
  // above warns about. Append your slug; do not restate the list.
  //
  // `albescent` and `na` are absent, and the REASON for albescent changed while
  // this was being built. It is no longer "albescent can never be picked at
  // creation" — #2399 re-cut the gate and it can be, since a new life is level 0
  // and clears the level-8 ceiling. Molly's ruling is that it gets no archetype
  // anyway: every Albescent registration is a WRAPPER rather than a skin
  // (ADR-0027), so it renders `DefaultCreateCharacter`, WHICH IS the na kit. The
  // `leaves %s to the surface Default` row below covers it either way.
  createCharacter: ['ephemerists', 'snide', 'wow', 'ua', 'everymen', 'coven', 'singularity'],
  // Was `mobileFactionPage` with this exact slug list until ADR-0078 collapsed
  // faction detail to one responsive component per faction. Same move the
  // praxis-card row made below: the row follows the surviving surface rather
  // than dying with the retired one. `factionBody` is what a phone renders now,
  // and it carries the same seven registrations the phone twin did — which is
  // why the deleted twin was drift rather than a second design.
  // `albescent` appended by #2504 — a WRAPPER over `DefaultFactionBody`, not an
  // eighth skin: it forwards the whole na body and hands its plates one ornament
  // node. The row is here because the dispatch is real, not because the dress is.
  factionBody: [...CORE_SIX, 'wow', 'albescent'],
  mobileFieldDesk: [...CORE_SIX, 'wow', 'albescent'],
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

// THE #951 ALLOWLIST IS GONE, and its absence is the record that the issue
// closed. It held the WOW desktop pages the design kit never drew: each had to
// ship a bespoke skin, and until it did WOW rendered the generic Default (N/A),
// never Coven. It shrank four times, each time in the same commit as the skin —
// `taskDetail` in #1037 (the parchment field), `praxisDetail` in #1121 (the
// chronicle entry, WOW's dress over the one shared page, ADR-0061),
// and `factionBody` with the muster page. The fourth, `factionCard`, emptied a
// different way: #2024 retired the surface outright rather than skinning it, so
// there is no key left for WOW to claim or miss.
//
// So WOW is now asserted exactly the way Coven is, with no exemption to keep in
// step — which is the whole point of an allowlist that was always meant to
// empty. A NEW WOW gap is a red row below, not a line to add back here.

describe('Coven is bespoke on every core surface, never the Default', () => {
  it.each(REQUIRED)('coven skins %s', (surface) => {
    expect(surfaceMap(surface)['coven']).toBeDefined()
  })
})

describe('WOW is bespoke on every core surface, never the Default', () => {
  it.each(REQUIRED)('wow skins %s', (surface) => {
    expect(surfaceMap(surface)['wow']).toBeDefined()
  })
})

/* -------------------------------------------------------------------------- */
/* No dispatcher may add a slug the manifest does not have (#2529)            */
/* -------------------------------------------------------------------------- */

/**
 * Everything above derives its bar from `surfaceMap()`, which is exactly why
 * nothing above could see #2529: `FactionSigil` dispatched on
 * `{ albescent: AlbescentSigilAdapter, ...surfaceMap('sigil') }`, so the one
 * surface reached outside the map was the one surface this file had no opinion
 * about. `SURFACE_KEYS_ARE_EXHAUSTIVE` could not see it either — that guard
 * catches a new surface KEY, and this was a slug injected at a call site.
 *
 * THE RULE IS "NEVER SPREAD IT", and the narrowness is the point. A map can
 * only gain a sibling key by being opened up, so a spread is the whole surface
 * area of the bypass — `{ x: A, ...surfaceMap(k) }` and
 * `{ ...surfaceMap(k), x: A }` are both spreads and both caught, in either
 * order and however the object is formatted. A dispatcher that hands the map
 * straight to `pickVariant`, or parks it in a local first the way
 * `FactionSelectCard` does, never trips this.
 *
 * A source scan, like `archetypeReachability`'s two: the thing being asserted is
 * a property of what people WRITE at a call site, and a graph walk cannot see it
 * — by the time `pickVariant` has an object, the injected key is
 * indistinguishable from a registered one.
 */
const CALL_SITES = walkSource(join(process.cwd(), 'src'))
const READS_SURFACE_MAP = CALL_SITES.filter(([, text]) => text.includes('surfaceMap('))

describe('every dispatcher reads surfaceMap() whole (#2529)', () => {
  it('has dispatchers to check at all', () => {
    // Guards the guard: a walk that matched nothing would be vacuously green
    // forever, which is the failure mode this whole block exists to end.
    expect(READS_SURFACE_MAP.length).toBeGreaterThan(10)
  })

  it('never spreads a surface map, so nothing can be added beside it', () => {
    const offenders = READS_SURFACE_MAP.filter(([, text]) =>
      /\.\.\.\s*surfaceMap\s*\(/.test(text),
    ).map(([path]) => path)

    expect(
      offenders,
      `A dispatcher spreads surfaceMap() into an object literal.\n` +
        `That is how a slug reaches the screen without a manifest row (#2529):\n\n` +
        `    pickVariant({ albescent: Adapter, ...surfaceMap('sigil') }, slug, Default)\n\n` +
        `Register the component in factions/<slug>.ts instead and pass the map\n` +
        `whole. A surface reached outside surfaceMap() is invisible to every\n` +
        `assertion in this file and gets dropped by the next refactor of its\n` +
        `dispatcher.`,
    ).toEqual([])
  })
})
