/**
 * #1506 — `.filter-bar` must never clip its own overflow.
 *
 * `OptionPicker`'s desktop panel (`.filter-factions__popover`, shared by every
 * facet the bar mounts — type, faction, whatever comes next) is
 * `position: absolute` inside a `.filter-bar` descendant. An `overflow:
 * hidden` on that ancestor clips the panel to the bar's own box, so pressing
 * a facet trigger shows only the corner of the menu that survives the clip.
 * That is exactly what happened live on Updates (#1506) and would happen
 * identically on Tasks, Praxes and `admin/ModerationTab` — every `FilterBar`
 * consumer shares this one rule.
 *
 * Braces prove nothing (a merge can drop an `@media` opener and still read as
 * a match): this asserts on the DECLARATION inside the extracted `.filter-bar`
 * rule body, not on the file merely containing the string "overflow". Reusing
 * `ruleBodies` — the same brace-balanced extractor the contrast/token ratchets
 * already trust — rather than inventing a second parser.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ruleBodies, stripComments } from '../../../../utils/__tests__/cssVars'

const css = stripComments(
  readFileSync(fileURLToPath(new URL('../../../../index.css', import.meta.url)), 'utf8'),
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
    // Since the bar itself no longer clips, the full-bleed rainbow edge needs
    // its own top radius or it would square off past the bar's rounded corner.
    const bodies = ruleBodies(css, '.filter-bar__spectrum')
    expect(bodies.length).toBeGreaterThan(0)
    expect(bodies.some((body) => /border-(top-(left|right)-radius|radius)\s*:/.test(body))).toBe(true)
  })
})

/**
 * #1854 — the bar is a surface card wearing a rainbow top edge, and every
 * mounting surface inherits it from this one rule.
 *
 * The chrome itself shipped with the bar (#1365) and is unchanged here; what
 * was missing is a guard. Four surfaces plus the Players rebuild (#1855) get
 * the card by mounting `FilterBar` and nothing else, so a dropped declaration
 * is five regressions with no local diff to notice them in — and the sibling
 * `describe` above exists because a rule in this exact block was edited once
 * already. Pinning the tokens (not px) also keeps the ratchet honest against
 * `local/no-raw-style-values`.
 *
 * `overflow: hidden` is NOT part of the card and must not be re-added; the
 * spectrum's own top radius does that clipping. See #1506 above.
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
    // ADR-0039: this is the unaffiliated/everyone identity, which is what
    // makes it legitimate as global chrome. A faction hue here would be the
    // Snide-lime accent #1361 ruling 1 rejected.
    const bodies = ruleBodies(css, '.filter-bar__spectrum')
    const strip = bodies.join('\n')
    expect(strip).toMatch(/background\s*:\s*var\(--faction-default-rainbow\)/)
    expect(strip).toMatch(/height\s*:\s*var\(--[\w-]+\)/)
  })

  it('runs the controls as a padded column that tightens on the phone', () => {
    // Two bodies in document order: the desktop rule, then the max-width:767px
    // override. The phone must restate BOTH axes — inheriting the desktop gap
    // is what this test caught.
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
 * #1944 — the rainbow edge has to be able to HOLD the corner it declares.
 *
 * `border-radius` is a request, not a guarantee: where the radii along one edge
 * sum to more than that edge, CSS scales every radius on the box down by the
 * same factor until they fit. The strip asked for the bar's 12px top corners at
 * `height: 3px`, got 0.25 of it, and drew a 3px corner alongside a padding box
 * that turns at 11px — so its left end overhung the bar's rounded corner and
 * sat out over the border.
 *
 * The sibling `describe` above already asserted a radius WAS declared, and that
 * assertion passed throughout. What it could not see is the box: this harness
 * has no layout, so the clamp is unobservable at runtime and the only thing a
 * DOM-less test can check is that the strip's box is at least as tall as the
 * corner it is drawing. That is the whole contract here — the band's thickness
 * moves to `padding-top`, and a mask is what keeps the rest of the taller box
 * from painting as a 12px rainbow slab.
 */
describe('.filter-bar__spectrum can hold the bar\'s corner (#1944)', () => {
  const strip = ruleBodies(css, '.filter-bar__spectrum').join('\n')

  it('sizes its BOX to the radius and its BAND to the rail pad', () => {
    expect(strip).toMatch(/height\s*:\s*var\(--space-md\)/)
    // The tell for the regression: the band thickness back in `height`.
    expect(strip).not.toMatch(/height\s*:\s*var\(--switch-rail-pad\)/)
    expect(strip).toMatch(/padding-top\s*:\s*var\(--switch-rail-pad\)/)
  })

  it('builds its radius from the same token the bar rounds with', () => {
    // `calc(var(--space-md) - 1px)`: the bar's PADDING-box radius, one border
    // in from the 12px it rounds its own border box with.
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
 * #1726 — a segment must never be narrower than its own label.
 *
 * `.filter-rail__segment` used to be `flex: 1` with zero horizontal padding, so
 * every label got the same box no matter how long it was. In Courier Prime a
 * label's width is exactly its character count, and at the rail's own
 * `min-width` a four-segment status rail gave each label 53.5px against a
 * 58.8px "Retired" — it overflowed. Only a signed-in viewer allowed `retired`
 * and `pending` ever saw four segments, which is why it survived.
 *
 * The measurement itself is not reachable from this harness (no DOM), so what
 * is guarded here is the CSS half of the fix: content-sized segments with real
 * horizontal padding, and a thumb whose WIDTH is animated now that it changes
 * from segment to segment.
 */
describe('.filter-rail sizes segments to their labels (#1726)', () => {
  const segmentBodies = ruleBodies(css, '.filter-rail__segment')

  it('never gives a segment an equal 1/n share', () => {
    expect(segmentBodies.length).toBeGreaterThan(0)
    for (const body of segmentBodies) {
      // `flex: 1` is shorthand for `1 1 0%` — a zero basis, i.e. an equal share
      // that ignores the label. `flex: 1 1 auto` (grow into slack from a
      // CONTENT basis) is the fix and must keep passing.
      expect(body).not.toMatch(/flex\s*:\s*1\s*(?:1\s*(?:0|0%|0px)\s*)?;/)
      expect(body).not.toMatch(/flex-basis\s*:\s*(0|0%|0px)\s*;/)
    }
  })

  it('pads every segment horizontally, in both form factors', () => {
    // One shorthand with a horizontal component, or an explicit inline pair.
    // A single-value `padding: X` counts — it pads all four sides.
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
    // The thumb is now as wide as the segment under it, so a transition that
    // names only `left` slides the pill while snapping its width.
    const bodies = ruleBodies(css, '.filter-rail__thumb')
    expect(bodies.length).toBeGreaterThan(0)
    const transitions = bodies.join('\n')
    expect(transitions).toMatch(/transition[^;]*\bleft\b/)
    expect(transitions).toMatch(/transition[^;]*\bwidth\b/)
  })
})

/** The horizontal component of a `padding` shorthand: 1/2/3/4 values. */
function horizontalPadding(shorthand: string): string {
  const parts = shorthand.trim().split(/\s+/)
  return parts.length === 1 ? parts[0] : parts[1]
}
