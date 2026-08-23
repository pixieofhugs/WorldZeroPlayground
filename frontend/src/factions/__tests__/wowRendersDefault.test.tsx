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
 * #901 the FIELD PAVILION mobile surfaces (six as built, two that outlived the
 * ADR-0056/0058/0061 and #1319 surface retirements). Every OTHER surface
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
 * RE-SCOPED, NOT DELETED (#951's last bill). The docblock used to
 * say "delete or re-scope this file when WOW's remaining surfaces ship"; they
 * have all shipped, and WOW_SKINNED is now every key in SURFACE_KEYS. The
 * completeness half of the file is therefore a stronger statement than it was
 * (WOW is fully dressed, and de-registering any surface reds a row) and the
 * theme half is untouched by the change — the second failure mode above, a
 * lapsed theme silently labelling a populated faction "Unaffiliated", is not a
 * skin question and never was. The file is misnamed now rather than obsolete:
 * `wowRendersDefault` is the state it disproves.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import { FACTION_MANIFESTS, surfaceMap, SURFACE_KEYS } from '..'
import type { FactionSurface } from '..'
import { pickVariant } from '../../utils/factionDispatch'
import {
  factionCssVar,
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
 * surfaces — the Lists seal, ONE responsive component serving both form factors
 * since #1313 retired `mobileDuelSeal` (the kit's phone sheet is the chassis's
 * full-bleed branch, not a deletion). Its two rail skins went with the
 * `duelRail` / `mobileDuelRail` SURFACES themselves in #1090, which folded
 * the duel into a card inside praxis detail; that is a surface retirement, not
 * a WOW gap, so none of those three names appears above or below. And #901's ONE
 * surviving FIELD PAVILION mobile surface (`mobileFieldDesk`, from the one phone
 * screen the kit drew — #901 skinned five further surfaces off that screen which
 * no longer exist, its task card, its task detail, its praxis detail, its
 * PROFILE and its FACTION PAGE, because ADR-0056 (#1044), ADR-0058 (#1068),
 * ADR-0061 (#1089), #1319 and ADR-0078 (#1314) retired all five surfaces
 * outright, so the decree `taskCard`, the parchment `taskDetail`, the crested
 * `profileBody` and the muster `factionBody` now serve WOW on both form factors
 * and praxis detail is ONE shared page every faction dresses; the pavilion
 * profile is the phone branch inside `WowProfileBody`, not a deletion), and
 * #931's
 * `metataskSeal` — WOW's court-writ seal, the last faction seal skin, built from
 * the chronicle identity since the kit drew no wow specimen.
 *
 * and #1037's desktop `taskDetail` — THE PARCHMENT FIELD, the first of #951's
 * four missing desktop surfaces to ship — and #1121's `praxisDetail`, THE
 * CHRONICLE ENTRY: WOW's dress over the one shared praxis-detail page every
 * faction dresses (ADR-0061). One responsive component, so it serves both form
 * factors and there is no mobile row to add beside it.
 *
 * and the `factionBody` beneath that hero — THE MUSTER PAGE: the charter, the
 * muster roll, the two galleries and the enlist rail. Third of #951's four to
 * ship. Derived rather than drawn, like the two above it: the ornaments come
 * from `wowOrnament`, the section order from the `mobileFactionPage` twin
 * ADR-0078 has since retired, and the copy was already sitting unread in
 * `factions.json` from #900. It serves both form factors now.
 *
 * #951's FOURTH bullet, `factionCard`, is absent from the list below and there
 * is no WOW gap behind it: #2024 RETIRED THE SURFACE. The dispatcher had never
 * had a production mount — #422 replaced the faction directory grid with
 * `FactionSelectCard` on both form factors — so the muster bill was seven skins
 * maintained for a `/design-sync` preview cell. The key is gone from
 * SURFACE_KEYS, which is why the loop below no longer walks it: the row follows
 * the surviving surface, and a retired surface leaves nothing to pin. That is
 * the same move ADR-0056/0058/0061/0065/0078 made five times over.
 *
 * SO THE SET IS NOW EXHAUSTIVE, and that is what this file records. #951 is
 * closed and there is no pending list left in either guard. #899/#900/#840 had
 * scoped the four desktop surfaces out on a design-fidelity argument (the kit
 * drew WOW's cards and hero, not the desktop pages beneath them, so a page skin
 * would be invention), but the owner ruled (2026-07-23) that a faction missing a
 * custom experience is a bug regardless, and ruled again (2026-08-16) that a
 * surface with no sheet gets DERIVED rather than left generic. The set shrank
 * three times, each in the same commit as its skin — `taskDetail` in #1037,
 * `praxisDetail` in #1121 and `factionBody` with the muster page — and emptied
 * when #2024 retired `factionCard` rather than skinning it.
 *
 * WHAT THE FALL-BACK BRANCH IS STILL FOR. Nothing is unclaimed today, so the
 * `else` below does not run — it is the contract a NEW surface key lands on. A
 * fallback goes to the neutral Default (N/A), never to Coven, which took WOW's
 * old aesthetic. `surfaceDispatch.test.ts` is the guard that actually bites
 * there: it derives the bar from what the five reference factions skin, so a new
 * core surface raises it automatically and WOW must follow.
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
  'factionBody',
  'backdrop',
  'profileBody',
  'factionSelectCard',
  'duelSeal',
  'mobileFieldDesk',
  'metataskSeal',
  // #2350 — THE CHARTER: WOW's dress over character creation, the surface
  // #2346 declared. Derived, not drawn (the owner ruled no design was needed):
  // the register is the decree task card's and the geometry is the writ's.
  'createCharacter',
])

describe('wow is fully skinned: every surface the manifest declares is claimed', () => {
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
    // Its ornament ink is its own token, not the unaffiliated neutral. (This
    // read factionColor() until #1269 deleted the JS hex table; the statement
    // is the same one, made about the cascade reference that replaced it.)
    expect(factionCssVar('wow')).not.toBe(factionCssVar('na'))
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
    //
    // The NAME is the whole assertion now. A second arm compared the two
    // DESCRIPTIONS, and #2332 set six of the nine — Coven's and WOW's among
    // them — to the literal `PLACEHOLDER`, which is the owner's deliberate
    // marker for copy she has not written rather than a collision. So that arm
    // stopped being able to tell "separate identities" from "both unwritten",
    // and an arm that cannot fail for the reason it was written is worse than
    // no arm. It comes back when the descriptions do.
    expect(factionName('coven')).not.toBe(factionName('wow'))
  })
})
