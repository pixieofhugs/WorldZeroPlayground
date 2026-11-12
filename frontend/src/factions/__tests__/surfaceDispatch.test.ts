/**
 * Surface dispatch table (#782): which slugs register each surface. A
 * de-registration or an accidental registration flips a row red. Component
 * identity is proven elsewhere (addAFaction.test, each surface's *Slots test);
 * unknown-slug resolution in utils/__tests__/factionDispatch.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { FACTION_MANIFESTS, surfaceMap, SURFACE_KEYS } from '..'
import type { FactionSurface } from '..'
import { sourceFiles, toRelative } from '../../test/sourceScan'

/** Non-test source modules as [path relative to src, text]. */
function walkSource(): Array<[string, string]> {
  return sourceFiles()
    .filter((path) => !/\.test\.tsx?$/.test(path))
    .map((path) => [toRelative(path), readFileSync(path, 'utf8')])
}

// `na` is excluded: it registers every surface (`factions/default.ts`, #2530),
// pinned in `defaultManifest.test.tsx`.
const ALL_SLUGS = FACTION_MANIFESTS.map((manifest) => manifest.slug).filter(
  (slug) => slug !== 'na',
)

const CORE_SIX = ['coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua']

// surface → registered slugs; every other slug must be undefined.
// albescent rows are WRAPPERS over Default, not skins (ADR-0048).
// No phone-only rows: ADR-0056/0058/0061/0065/0078 made each surface one
// responsive component, so a phone-only row would be drift.
// praxisDetail/createCharacter/duelReader grow one slug per landed design; a
// missing slug is a skin not yet built.
//
// SHARED REGISTRY (#1162): assertions run both ways, so a PR that rewrites a
// line instead of appending drops siblings merged in flight. Append your slug;
// never restate the list from memory.
const BESPOKE: Record<string, string[]> = {
  taskDetail: [...CORE_SIX, 'wow', 'albescent'],
  praxisDetail: ['coven', 'ephemerists', 'singularity', 'albescent', 'everymen', 'snide', 'wow', 'ua'],
  editPraxis: [...CORE_SIX, 'wow', 'albescent'],
  // albescent (#2531) is a wrapper re-cutting the credential card's
  // `.spectrum-dial` ring, both widths since #2992 — mirrors albescent.ts's
  // createCharacter note; the two move together.
  createCharacter: ['ephemerists', 'snide', 'wow', 'ua', 'everymen', 'coven', 'singularity', 'albescent'],
  factionBody: [...CORE_SIX, 'wow', 'albescent'],
  mobileFieldDesk: [...CORE_SIX, 'wow', 'albescent'],
  praxisCard: [...CORE_SIX, 'wow', 'albescent'],
  // No faction has a duel-reader design yet (#1084); the chassis already wears
  // each faction's role map. albescent is a pass-through (#2531).
  duelReader: ['albescent'],
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

// Coven and WOW must be bespoke wherever the reference factions all are
// (owner ruling, 2026-07-23): never fall back on each other or on Default.
const REFERENCE_FACTIONS = ['snide', 'ephemerists', 'singularity', 'everymen', 'ua']
const REQUIRED = SURFACE_KEYS.filter((surface) =>
  REFERENCE_FACTIONS.every((faction) => surfaceMap(surface)[faction] !== undefined),
)

/**
 * Albescent claims every key (#2531) so an absent row is never misread; "renders
 * the Default" is its designed answer, so a hole is always a bug. Rows are
 * wrappers, not skins; kinds held in `src/__tests__/albescentWrapperKinds.test.tsx`.
 */
/* Albescent claims every surface, so the matrix has no holes (#2531)          */
/* -------------------------------------------------------------------------- */

/**
 * ALBESCENT REGISTERS EVERY KEY IN `SURFACE_KEYS`, and this is the row that
 * turns "count the matrix by hand" into something CI counts.
 *
 * The 2026-08-23 audit found four keys absent — `backdrop`, `comment`,
 * `createCharacter`, `duelSeal` — and each absence was readable two ways with
 * nothing in the tree saying which was true: na draws no mark there so a wrapper
 * would have nothing to grab, or nobody got to it. #2531 filled all four, so the
 * manifest is now the single place that answers "does Albescent dress this?",
 * and it answers for every surface.
 *
 * A REGISTRATION HERE IS NOT A SKIN, and this bar is not the one `REQUIRED`
 * holds Coven and WOW to. Every Albescent row is a WRAPPER over na's rendering
 * (ADR-0027, ADR-0048): a RE-CUT one re-cuts a mark na already draws, a
 * PASS-THROUGH one renders the Default byte-identically and exists so the map
 * stops lying about who dresses what. Both are "registered"; neither is a
 * treatment of its own. `src/__tests__/albescentWrapperKinds.test.tsx` is where
 * each of the four is held to its declared kind.
 *
 * Which is why it is asserted for `albescent` alone rather than derived into a
 * rule for every faction: a faction with a kit of its own registers a surface
 * when its design lands, so a missing row there is a design not yet drawn.
 * Albescent is the one slug for which "renders the Default" is the DESIGNED
 * answer, and therefore the one slug for which a hole is always a bug.
 */
describe('albescent registers every surface (#2531)', () => {
  it.each(SURFACE_KEYS)('claims %s', (surface) => {
    expect(
      surfaceMap(surface)['albescent'],
      `albescent has no \`${surface}\` row in factions/albescent.ts.\n` +
        `Every Albescent surface is a wrapper over na — a re-cut where na draws a\n` +
        `mark, a pass-through where it does not — so an ABSENT row is not "renders\n` +
        `the Default", it is a reader left to guess which of those two was meant.\n` +
        `Add the row, with one line of docblock saying which kind it is (#2531).`,
    ).toBeDefined()
  })
})

/**
 * na claims every key because nothing is behind it (#2530): a missing row
 * renders NOTHING. Components pinned in `defaultManifest.test.tsx`.
 */
describe('na registers every surface (#2530)', () => {
  it.each(SURFACE_KEYS)('claims %s', (surface) => {
    expect(
      surfaceMap(surface)['na'],
      `na has no \`${surface}\` row in factions/default.ts.\n` +
        `Nothing is behind it: the dispatcher no longer names a Default of its\n` +
        `own, so this surface renders nothing for an unaffiliated player.`,
    ).toBeDefined()
  })
})

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

/**
 * Never spread a surface map (#2529): it lets a slug reach the screen without a
 * manifest row, invisible to every check above. A source scan because by
 * `pickVariant` time an injected key looks registered.
 */
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
const CALL_SITES = walkSource()
const READS_SURFACE_MAP = CALL_SITES.filter(([, text]) => text.includes('surfaceMap('))

describe('every dispatcher reads surfaceMap() whole (#2529)', () => {
  it('has dispatchers to check at all', () => {
    // Guards the guard against a vacuous walk.
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
        `    resolveVariant({ albescent: Adapter, ...surfaceMap('sigil') }, slug)\n\n` +
        `Register the component in factions/<slug>.ts instead and pass the map\n` +
        `whole. A surface reached outside surfaceMap() is invisible to every\n` +
        `assertion in this file and gets dropped by the next refactor of its\n` +
        `dispatcher.`,
    ).toEqual([])
  })
})
