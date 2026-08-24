/**
 * Warriors of Whimsy has a THEME of its own (#812, after #784 moved its lo-fi
 * pink identity wholesale to Cozy Coven and left `wow` with neither).
 *
 * What a lapsed theme looks like: nothing crashes and nothing looks broken.
 * `isKnownFaction('wow')` goes false, `factionCssVar('wow')` resolves to the
 * neutral `default` token, and `factionName()` falls through to `names.na` —
 * so a real, populated, joinable faction is silently labelled "Unaffiliated"
 * in its own ornament and its own label. No type or build check can see that.
 *
 * WOW's SKINS ARE NOT ASSERTED HERE (#2534): `surfaceDispatch.test.ts` derives
 * that bar from what the reference factions skin, so a new surface raises it
 * automatically. A hand-maintained set here would have defaulted a new key to
 * "unclaimed" — asserting the opposite of what it meant to guard.
 */
import { describe, expect, it } from 'vitest'

import {
  factionCssVar,
  factionDescription,
  factionName,
  isKnownFaction,
} from '../../utils/factions'

describe('wow is themed', () => {
  it('reads its OWN hue tokens, and every name here is declared in index.css', () => {
    // A slug pointed at a token that is not declared emits valid CSS, lints
    // clean, and renders as nothing — which is why this asserts the resolved
    // names rather than trusting CSS_KEY to be internally consistent.
    expect(factionCssVar('wow')).toBe('var(--faction-wow)')
    expect(factionCssVar('wow', 'card-bg')).toBe('var(--faction-wow-card-bg)')
    expect(factionCssVar('wow', 'on-fill')).toBe('var(--faction-wow-on-fill)')
    expect(factionCssVar('wow')).not.toBe(factionCssVar('na'))
  })

  it('is a known faction, so its members get coloured ornament', () => {
    // The predicate reads the mapped VALUE, not key presence (#749) — this is
    // the single assertion that separates #812's state from #784's.
    expect(isKnownFaction('wow')).toBe(true)
  })

  it('resolves its own name and description, NOT the Unaffiliated fallback', () => {
    // The exact name also keeps it distinct from Coven, which took WOW's old
    // aesthetic; catalog.test pins `factionName('coven')` the same way.
    expect(factionName('wow')).toBe('Warriors of Whimsy')
    expect(factionName('wow')).not.toBe(factionName('na'))

    // `descriptions.wow` is the owner's literal `PLACEHOLDER` (#2332) — a slot
    // she has not written, which is still a slot of its OWN. This asserts the
    // lookup lands on it rather than falling through to na or to empty.
    const description = factionDescription('wow')
    expect(description).not.toBe(factionDescription('na'))
    expect(description).not.toBe(factionDescription('definitely_not_a_faction'))
    expect(description.length).toBeGreaterThan(0)
  })
})
