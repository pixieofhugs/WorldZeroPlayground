/**
 * #1506 — `.filter-bar` must never clip its overflow: `OptionPicker`'s
 * absolute popover sits inside it, on every `FilterBar` consumer. Asserted on
 * the extracted rule body via `ruleBodies`.
 */
import { describe, expect, it } from 'vitest'
import { ruleBodies, stripComments } from '../../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../../test/indexCss'

const css = stripComments(
  readIndexCss(),
)

describe('.filter-bar does not clip its overflow (#1506)', () => {
  it('declares no overflow: hidden/clip that would trap an absolutely-positioned popover', () => {
    const bodies = ruleBodies(css, '.filter-bar')
    expect(bodies.length, '.filter-bar rule must exist').toBeGreaterThan(0)
    for (const body of bodies) {
      expect(body).not.toMatch(/overflow\s*:\s*(hidden|clip)\b/)
    }
  })

  it('still rounds the spectrum strip to the bar\'s top corners', () => {
    // The bar doesn't clip, so the strip needs its own top radius.
    const bodies = ruleBodies(css, '.filter-bar__spectrum')
    expect(bodies.length).toBeGreaterThan(0)
    expect(bodies.some((body) => /border-(top-(left|right)-radius|radius)\s*:/.test(body))).toBe(true)
  })
})

/**
 * #1854 — the bar is a surface card with a rainbow top edge, inherited by every
 * mounting surface from this one rule, so a dropped declaration regresses all.
 */
describe('.filter-bar is a surface card with a rainbow top edge (#1854)', () => {
  it('paints the card in tokens', () => {
    const bodies = ruleBodies(css, '.filter-bar')
    expect(bodies.length).toBeGreaterThan(0)
    const card = bodies.join('\n')
    expect(card).toMatch(/border\s*:\s*1px\s+solid\s+var\(--color-border\)/)
    expect(card).toMatch(/border-radius\s*:\s*var\(--space-md\)/)
    expect(card).toMatch(/background\s*:\s*var\(--color-bg-surface\)/)
  })

  it('draws the top edge in the na/default spectrum', () => {
    // ADR-0039: the everyone identity is legitimate global chrome (#1361).
    const bodies = ruleBodies(css, '.filter-bar__spectrum')
    const strip = bodies.join('\n')
    expect(strip).toMatch(/background\s*:\s*var\(--faction-default-rainbow\)/)
    expect(strip).toMatch(/height\s*:\s*var\(--[\w-]+\)/)
  })

  it('runs the controls as a padded column that tightens on the phone', () => {
    // Desktop then phone override; the phone must restate both axes.
    const bodies = ruleBodies(css, '.filter-bar__body')
    expect(bodies.length, 'a desktop body and a phone override').toBe(2)
    const [desktop, phone] = bodies
    expect(desktop).toMatch(/padding\s*:\s*var\(--space-lg\)\s+var\(--space-xl\)/)
    expect(desktop).toMatch(/gap\s*:\s*var\(--space-lg\)/)
    expect(phone).toMatch(/padding\s*:\s*var\(--space-md\)\s+var\(--space-lg\)/)
    expect(phone).toMatch(/gap\s*:\s*var\(--space-md\)/)
  })
})

/**
 * #1944 — CSS scales radii down when they exceed the box, so a 3px strip can't
 * hold a 12px corner. The box is radius-tall, the band is `padding-top`, and a
 * mask keeps the rest unpainted.
 */
describe('.filter-bar__spectrum can hold the bar\'s corner (#1944)', () => {
  const strip = ruleBodies(css, '.filter-bar__spectrum').join('\n')

  it('sizes its BOX to the radius and its BAND to the rail pad', () => {
    expect(strip).toMatch(/height\s*:\s*var\(--space-md\)/)
    expect(strip).not.toMatch(/height\s*:\s*var\(--switch-rail-pad\)/)
    expect(strip).toMatch(/padding-top\s*:\s*var\(--switch-rail-pad\)/)
  })

  it('builds its radius from the same token the bar rounds with', () => {
    // The bar's padding-box radius: one border in from its 12px.
    const radius = /border-radius\s*:\s*([^;]+);/.exec(strip)
    expect(radius, 'the strip must declare a radius').not.toBeNull()
    expect(radius![1]).toContain('var(--space-md)')
  })

  it('gives back the flow the taller box would add, and masks the rest', () => {
    expect(strip).toMatch(
      /margin-bottom\s*:\s*calc\(\s*var\(--switch-rail-pad\)\s*-\s*var\(--space-md\)\s*\)/,
    )
    // Without the exclude, the extra 9px paints as rainbow instead of nothing.
    expect(strip).toMatch(/mask[^;]*content-box[^;]*exclude/)
  })
})

/**
 * #1726 — a segment must never be narrower than its label. Guards the CSS half:
 * content-sized, horizontally padded segments and a width-animated thumb.
 */
describe('.filter-rail sizes segments to their labels (#1726)', () => {
  const segmentBodies = ruleBodies(css, '.filter-rail__segment')

  it('never gives a segment an equal 1/n share', () => {
    expect(segmentBodies.length).toBeGreaterThan(0)
    for (const body of segmentBodies) {
      // `flex: 1` = `1 1 0%`, an equal share; `flex: 1 1 auto` must pass.
      expect(body).not.toMatch(/flex\s*:\s*1\s*(?:1\s*(?:0|0%|0px)\s*)?;/)
      expect(body).not.toMatch(/flex-basis\s*:\s*(0|0%|0px)\s*;/)
    }
  })

  it('pads every segment horizontally, in both form factors', () => {
    for (const body of segmentBodies) {
      const shorthand = /padding\s*:\s*([^;]+);/.exec(body)
      const inline = /padding-(inline|left|right)[^:]*:\s*([^;]+);/.test(body)
      expect(
        inline || (shorthand !== null && horizontalPadding(shorthand[1]) !== '0'),
        `a .filter-rail__segment body pads no horizontal side: ${body.trim()}`,
      ).toBe(true)
    }
  })

  it('animates the thumb\'s width, not only its left edge', () => {
    const bodies = ruleBodies(css, '.filter-rail__thumb')
    expect(bodies.length).toBeGreaterThan(0)
    const transitions = bodies.join('\n')
    expect(transitions).toMatch(/transition[^;]*\bleft\b/)
    expect(transitions).toMatch(/transition[^;]*\bwidth\b/)
  })
})

/**
 * #3095 — the option trigger matches the rails beside it: same height, label
 * centred. Built like the rail (same ring as a real border, rail pad, inner box
 * with the segment's floor) rather than a calc, because browsers snap borders
 * to device pixels and a sum can't follow that.
 */
describe('the option trigger matches the rails beside it (#3095)', () => {
  const SEGMENT_HEIGHT = '--filter-segment-h'
  const RING = '--switch-rail-ring'
  const rails = ruleBodies(css, '.filter-rail')
  const segments = ruleBodies(css, '.filter-rail__segment')
  const triggers = ruleBodies(css, '.filter-factions__trigger')
  const labels = ruleBodies(css, '.filter-factions__label')
  const withBadge = ruleBodies(css, '.filter-factions__trigger:has(.filter-bar__badge)')

  /** Every value one property is given across a selector's rules, in order. */
  const declared = (bodies: string[], property: string) =>
    [...bodies.join('\n').matchAll(new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;]+);`, 'g'))].map(
      (match) => match[1].trim(),
    )

  it('says the segment\'s height once per form factor, and the segment reads it', () => {
    const heights = [...css.matchAll(new RegExp(`${SEGMENT_HEIGHT}\\s*:\\s*(\\d+)px`, 'g'))].map(
      (match) => match[1],
    )
    expect(heights).toEqual(['38', '44'])
    expect(declared(segments, 'min-height')).toEqual([`var(${SEGMENT_HEIGHT})`])
  })

  it('builds the trigger out of the rail\'s own box, never out of its arithmetic', () => {
    expect(declared(rails, 'border')[0]).toMatch(new RegExp(`^var\\(${RING}\\) solid `))
    expect(declared(triggers, 'border')[0]).toMatch(new RegExp(`^var\\(${RING}\\) solid `))
    expect(declared(triggers, 'border-width')).toEqual([])

    expect(declared(rails, 'padding')).toEqual(['var(--switch-rail-pad)'])
    expect(declared(triggers, 'padding')[0].split(/\s+/)[0]).toBe('var(--switch-rail-pad)')
    expect(declared(labels, 'min-height')).toEqual([`var(${SEGMENT_HEIGHT})`])
    // A <span> defaults to content-box, unlike the <button> segment.
    expect(declared(labels, 'box-sizing')).toEqual(['border-box'])
    expect(declared(labels, 'padding')).toEqual([`${declared(segments, 'padding')[0].split(/\s+/)[0]} 0`])

    expect(declared(triggers, 'min-height')).toEqual([])
    expect(declared(triggers, 'height')).toEqual([])
  })

  it('pads the label evenly, and tightens the right edge only around a badge', () => {
    const shorthands = declared(triggers, 'padding')
    expect(shorthands, 'one padding shorthand, in the base rule').toHaveLength(1)
    // 1–3 values mirror left from right; a fourth breaks centring.
    expect(shorthands[0].split(/\s+/).length, `asymmetric padding: ${shorthands[0]}`).toBeLessThan(4)
    for (const side of ['padding-left', 'padding-right', 'padding-inline', 'padding-inline-start', 'padding-inline-end']) {
      expect(declared(triggers, side), `${side} on the bare trigger`).toEqual([])
    }

    // Desktop: tight edge for the badge; phone (full width) gets the even edge.
    expect(declared(withBadge, 'padding-right')).toEqual([
      'var(--space-sm)',
      horizontalPadding(shorthands[0]),
    ])
  })

  it('has no rule for an empty ornament stack — the picker does not render one', () => {
    expect(ruleBodies(css, '.filter-factions__stack:empty')).toEqual([])
  })
})

/** The horizontal component of a `padding` shorthand: 1/2/3/4 values. */
function horizontalPadding(shorthand: string): string {
  const parts = shorthand.trim().split(/\s+/)
  return parts.length === 1 ? parts[0] : parts[1]
}
