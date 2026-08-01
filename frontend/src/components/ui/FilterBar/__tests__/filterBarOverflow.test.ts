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
