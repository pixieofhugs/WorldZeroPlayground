/**
 * Badge art registry (#823, ADR-0033).
 *
 * `duel_victor` is unobservable in every running environment — Era 1 is live and
 * the badge only lands once an era closes and duels freeze — so these
 * assertions are the only thing standing between "the art is wired up" and "the
 * art silently falls through to UnknownBadgeArt". The registry key has to match
 * `Badge(key="duel_victor", …)` in `backend/badges.py` exactly, and a typo on
 * either side is invisible: `badgeArtFor` answers every unknown key with a
 * perfectly reasonable-looking medallion ring.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { badgeArtFor, UnknownBadgeArt } from '../badgeArt'

const HEX = /#[0-9a-fA-F]{3,8}\b/

describe('badgeArtFor', () => {
  it('has its own art for duel_victor rather than the unknown-key fallback', () => {
    expect(badgeArtFor('duel_victor')).not.toBe(UnknownBadgeArt)
  })

  it('keeps duelist and duel_victor as two distinct glyphs', () => {
    // #748's crossed blades (currently ahead / won by forfeit) and #823's seal
    // (won a duel last era) are separate badges that can be worn at once.
    expect(badgeArtFor('duel_victor')).not.toBe(badgeArtFor('duelist'))
    const blades = renderToStaticMarkup(<Duelist />)
    expect(blades).toContain('Duelist badge')
    expect(blades).not.toContain('Duel Victor badge')
  })

  it('still falls back for a key with no art', () => {
    expect(badgeArtFor('no_such_badge')).toBe(UnknownBadgeArt)
  })
})

const Duelist = badgeArtFor('duelist')
const DuelVictor = badgeArtFor('duel_victor')

describe('the duel_victor seal', () => {
  it('paints frame and spectrum from tokens and ships no hex', () => {
    const html = renderToStaticMarkup(<DuelVictor />)
    expect(html).toContain('var(--badge-victor-frame)')
    expect(html).toContain('var(--badge-victor-stop-1)')
    expect(html).toContain('var(--badge-victor-stop-10)')
    // The mask's white/black are luminance channels, so they are keywords —
    // which lets this stay an unconditional "no hex anywhere" assertion.
    expect(html).not.toMatch(HEX)
  })

  it('namespaces every referenced id so a roster of badges cannot collide', () => {
    // SVG ids are document-global; RosterTable renders one badge per row, so
    // the collision case is two seals in ONE tree — rendering twice into two
    // separate roots would restart React's id counter and prove nothing.
    const roster = renderToStaticMarkup(
      <>
        <DuelVictor />
        <DuelVictor />
      </>,
    )
    const first = roster
    const idsOf = (html: string) => (html.match(/id="([^"]+)"/g) ?? []).sort()
    expect(idsOf(first).length).toBeGreaterThan(0)
    // Bare design ids would survive verbatim into the markup.
    for (const bare of ['id="fleur"', 'id="crown"', 'id="duel"', 'id="sealRing"']) {
      expect(first).not.toContain(bare)
    }
    // Every declared id and every reference to one is namespaced.
    for (const declared of idsOf(first)) {
      expect(declared).toContain('wz-victor-')
    }
    for (const reference of first.match(/(url\(#|href="#)([^)"]+)/g) ?? []) {
      expect(reference).toContain('wz-victor-')
    }
    // Two seals in one tree declare eight ids, not four repeated twice.
    const declared = idsOf(roster)
    expect(new Set(declared).size).toBe(declared.length)
  })

  it('drops the ring legend at the sizes the roster actually renders', () => {
    // 16 and 18 are the only sizes any consumer passes; 13/240 of those is a
    // sub-pixel cap height, so the legend degrades to the compact mark.
    for (const size of [16, 18]) {
      const html = renderToStaticMarkup(<DuelVictor size={size} />)
      expect(html).not.toContain('DUEL')
      expect(html).not.toContain('VICTOR')
      expect(html).toContain('scale(1.42)')
    }
  })

  it('sets the full seal, legend and all, once it is drawn large enough', () => {
    const html = renderToStaticMarkup(<DuelVictor size={240} />)
    expect(html).toContain('>DUEL<')
    expect(html).toContain('>VICTOR<')
    expect(html).toContain('var(--font-faction-engraved)')
    // The design's own placement, unscaled from Turn 2.
    expect(html).toContain('translate(60,54) scale(1.12)')
  })

  it('keeps the crown, so it can never be mistaken for the uncrowned base mark', () => {
    // Turn 1 of the design is the same lily WITHOUT crown or legend.
    for (const size of [18, 240]) {
      expect(renderToStaticMarkup(<DuelVictor size={size} />)).toContain('M32 24 L32 12')
    }
  })
})
