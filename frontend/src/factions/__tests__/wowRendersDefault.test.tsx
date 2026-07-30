/**
 * Warriors of Whimsy is THEMED and PARTLY SKINNED (#784, #812, then #821).
 *
 * #784 moved its lo-fi pink `.exe` identity wholesale to Cozy Coven, leaving
 * `wow` with no manifest and no theme. #812 gave back a minimal yellow
 * `--faction-wow-*` block, so WOW rejoins the rainbow. #821 ships its FIRST
 * bespoke surfaces: the praxis card (its mobile twin retired with the surface in
 * ADR-0067) and the vote widget; #840
 * adds the score stamp when it rebuilds the chronicle from source; #835 adds the
 * desktop edit-praxis composer, #836 its mobile twin, #897 the crest sigil plus
 * the avatar that mounts it, #899 the three repeating desktop surfaces (the
 * decree task card, the comment voice, the feed frame), and #900 the four
 * page-level desktop surfaces (hero, backdrop, profile body, select card), and
 * #901 the FIELD PAVILION mobile surfaces (six as built, four that outlived the
 * ADR-0056/0058 surface retirements). Every OTHER surface
 * still falls through to `Default*` — WOW is themed-and-partly-skinned, and
 * definitely not "broken faction".
 *
 * That split is fragile in BOTH directions, neither of which crashes:
 *
 *  - Register a component "helpfully" on an UNCLAIMED surface and WOW starts
 *    wearing a half-built skin nobody designed, most likely one borrowed from the
 *    faction that took its old one.
 *  - Let the theme lapse and `factionName()` falls through to `names.na`,
 *    silently labelling a real, populated, joinable faction "Unaffiliated".
 *
 * So this file pins the exact skinned set AND the theme AND the words together:
 * only the surfaces in WOW_SKINNED are claimed, the rest fall back, WOW resolves
 * its own hue, and it still has a name and description of its own.
 *
 * DELETE (or re-scope) THIS FILE when WOW's remaining surfaces ship.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import { FACTION_MANIFESTS, surfaceMap, SURFACE_KEYS } from '..'
import type { FactionSurface } from '..'
import { pickVariant } from '../../utils/factionDispatch'
import {
  factionCssVar,
  factionColor,
  factionDescription,
  factionFill,
  factionName,
  isKnownFaction,
} from '../../utils/factions'

function Sentinel() {
  return <div>default-sentinel</div>
}

/**
 * The surfaces WOW has skinned: #821's three, the `scoreStamp` its own chronicle
 * plate claims in #840 (ADR-0049), #835's edit-praxis composer — which #836 gave
 * a mobile twin and #1181 collapsed back into one responsive component when
 * ADR-0065 retired the `mobileEditPraxis` SURFACE, so the single `editPraxis`
 * row below now serves WOW at both widths — #897's `sigil` (the crest) and the `avatar`
 * that mounts it, #899's three repeating desktop surfaces (the decree
 * `taskCard`, the `comment` voice and the herald's-dispatch `feedFrame`),
 * #900's four page-level desktop surfaces (`factionHero`, `backdrop`,
 * `profileBody`, `factionSelectCard`), and what is left of #895's four DUEL
 * surfaces — the Lists seal on both form factors. Its two rail skins went with
 * the `duelRail` / `mobileDuelRail` SURFACES themselves in #1090, which folded
 * the duel into a card inside praxis detail; that is a surface retirement, not
 * a WOW gap, so neither name appears above or below. And #901's three
 * surviving FIELD PAVILION mobile surfaces (`mobileFieldDesk` from the one phone
 * screen the kit drew, plus `mobileFactionPage` and `mobileProfile` derived from
 * that screen's chrome and the matching desktop archetype — #901 skinned three
 * further surfaces off that screen which no longer exist, its task card, its
 * task detail and its praxis detail, because ADR-0056 (#1044), ADR-0058 (#1068)
 * and ADR-0061 (#1089) retired all three surfaces outright, so the decree
 * `taskCard` and the parchment `taskDetail` now serve WOW on both form factors
 * and praxis detail is ONE shared page every faction dresses), and #931's
 * `metaTaskSeal` — WOW's court-writ seal, the last faction seal skin, built from
 * the chronicle identity since the kit drew no wow specimen.
 *
 * and #1037's desktop `taskDetail` — THE PARCHMENT FIELD, the first of #951's
 * four missing desktop surfaces to ship — and #1121's `praxisDetail`, THE
 * CHRONICLE ENTRY: WOW's dress over the one shared praxis-detail page every
 * faction dresses (ADR-0061). One responsive component, so it serves both form
 * factors and there is no mobile row to add beside it.
 *
 * SIX SURFACES ARE STILL UNCLAIMED, in two groups.
 *
 * `factionBody` and `factionCard` are PENDING DESIGN BUGS, tracked by #951.
 * #899/#900/#840 scoped them out on a design-fidelity argument (the kit drew
 * WOW's cards and hero, not the desktop pages beneath them, so a page skin would
 * be invention), but the owner ruled (2026-07-23) that a faction missing a
 * custom experience is a bug regardless: WOW players get the generic Default on
 * those pages. They fall to the neutral Default (N/A), never to Coven — which is
 * the point of pinning the set here. When #951 ships a skin, move that surface
 * into WOW_SKINNED and this list shrinks; `surfaceDispatch.test.ts` enforces the
 * same #951 allowlist. That shrink has now happened twice: `taskDetail` moved
 * down into WOW_SKINNED in #1037, and `praxisDetail` in #1121 — each out of both
 * allowlists in the same commit as its skin.
 *
 * `mobileCreateCharacter` and `mobileEditCharacter`, `mobileFactionsDirectory`
 * and `mobilePlayersDirectory` used to be listed here as Default-for-everyone
 * rather than a WOW gap. Since NO faction ever skinned them, the four slots were
 * retired: those pages render their `Default*` skin with no dispatch at all, so
 * there is nothing left for this list to pin. If a later slice wants a skin for
 * one of them, it adds the manifest field back together with a registration.
 */
const WOW_SKINNED: ReadonlySet<FactionSurface> = new Set([
  'sigil',
  'avatar',
  'taskCard',
  'taskDetail',
  'praxisDetail',
  'comment',
  'feedFrame',
  'praxisCard',
  'scoreStamp',
  'vote',
  'editPraxis',
  'factionHero',
  'backdrop',
  'profileBody',
  'factionSelectCard',
  'duelSeal',
  'mobileDuelSeal',
  'mobileFieldDesk',
  'mobileFactionPage',
  'mobileProfile',
  'metaTaskSeal',
])

describe('wow is partly skinned: twenty-two surfaces claimed, the rest fall back', () => {
  it('registers a manifest now (#821)', () => {
    expect(FACTION_MANIFESTS.map((manifest) => manifest.slug)).toContain('wow')
  })

  for (const surface of SURFACE_KEYS) {
    const claimed = WOW_SKINNED.has(surface as FactionSurface)
    it(`${claimed ? 'claims' : 'falls back on'} the ${surface} surface`, () => {
      const map = surfaceMap(surface as FactionSurface)

      if (claimed) {
        // A bespoke component is registered for the slug, so the dispatcher
        // hands it back rather than the caller's Default.
        expect(map['wow'], `${surface} should be claimed by wow`).toBeDefined()
        const Resolved = pickVariant(map as Record<string, typeof Sentinel>, 'wow', Sentinel)
        expect(Resolved).not.toBe(Sentinel)
        return
      }

      // Unclaimed: no component for the slug, so the caller's Default renders.
      expect(map['wow'], `${surface} should be unclaimed by wow`).toBeUndefined()
      const Resolved = pickVariant(map as Record<string, typeof Sentinel>, 'wow', Sentinel)
      expect(Resolved).toBe(Sentinel)
      expect(renderToStaticMarkup(<Resolved />)).toContain('default-sentinel')
    })
  }

  it('reads its OWN theme — the fallback is a skin fallback, not a colour one', () => {
    // Every var() named here has a real declaration in index.css (#812). A
    // slug pointed at a token that is not declared emits valid CSS, lints
    // clean, and renders as nothing — which is why this asserts the resolved
    // names rather than trusting CSS_KEY to be internally consistent.
    expect(factionCssVar('wow')).toBe('var(--faction-wow)')
    expect(factionCssVar('wow', 'card-bg')).toBe('var(--faction-wow-card-bg)')
    expect(factionCssVar('wow', 'on-fill')).toBe('var(--faction-wow-on-fill)')
  })

  it('is a known faction, so its members get coloured ornament', () => {
    // The predicate reads the mapped VALUE, not key presence (#749) — this is
    // the single assertion that separates #812's state from #784's.
    expect(isKnownFaction('wow')).toBe(true)
    expect(factionColor('wow')).not.toBe(factionColor('na'))
  })

  it('has a solid fill, not the unaffiliated spectrum', () => {
    // ADR-0039: a gradient is `na`'s identity. A real faction returns its hue
    // for every shape, with the paired AA ink on a pill.
    expect(factionFill('wow', 'bar')).toEqual({ background: 'var(--faction-wow)' })
    expect(factionFill('wow', 'dot')).toEqual({ background: 'var(--faction-wow)' })
    expect(factionFill('wow', 'pill')).toEqual({
      background: 'var(--faction-wow)',
      color: 'var(--faction-wow-on-fill)',
    })
  })
})

describe('wow still reads as a real faction', () => {
  it('resolves its own name, NOT the Unaffiliated fallback', () => {
    expect(factionName('wow')).toBe('Warriors of Whimsy')
    expect(factionName('wow')).not.toBe(factionName('na'))
  })

  it('resolves its own description, NOT the empty-description fallback', () => {
    const description = factionDescription('wow')
    expect(description).not.toBe(factionDescription('na'))
    expect(description).not.toBe(factionDescription('definitely_not_a_faction'))
    expect(description.length).toBeGreaterThan(0)
  })

  it('is distinguishable from Cozy Coven, which took its aesthetic', () => {
    // The rename is only sound if the two slugs are genuinely separate
    // identities. If these ever collide, one of them has swallowed the other.
    expect(factionName('coven')).not.toBe(factionName('wow'))
    expect(factionDescription('coven')).not.toBe(factionDescription('wow'))
  })
})
