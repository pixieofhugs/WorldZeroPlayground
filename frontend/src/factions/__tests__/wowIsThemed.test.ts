/**
 * WOW has a THEME of its own (#812). A lapsed theme fails silently:
 * `factionCssVar('wow')` resolves to `default` and `factionName()` to
 * "Unaffiliated". Skins are asserted by `surfaceDispatch.test.ts` (#2534).
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
    // An undeclared token renders as nothing, so assert the resolved names.
    expect(factionCssVar('wow')).toBe('var(--faction-wow)')
    expect(factionCssVar('wow', 'card-bg')).toBe('var(--faction-wow-card-bg)')
    expect(factionCssVar('wow', 'on-fill')).toBe('var(--faction-wow-on-fill)')
    expect(factionCssVar('wow')).not.toBe(factionCssVar('na'))
  })

  it('is a known faction, so its members get coloured ornament', () => {
    // Reads the mapped VALUE, not key presence (#749).
    expect(isKnownFaction('wow')).toBe(true)
  })

  it('resolves its own name and description, NOT the Unaffiliated fallback', () => {
    expect(factionName('wow')).toBe('Warriors of Whimsy')
    expect(factionName('wow')).not.toBe(factionName('na'))

    // `descriptions.wow` is the owner's literal `PLACEHOLDER` (#2332): still its own slot.
    const description = factionDescription('wow')
    expect(description).not.toBe(factionDescription('na'))
    expect(description).not.toBe(factionDescription('definitely_not_a_faction'))
    expect(description.length).toBeGreaterThan(0)
  })
})
