/**
 * #1946 — a WOW balloon drawn against the PLATE must flip when the plate does.
 *
 * The googly-balloon widget draws three things straight onto its parchment
 * plate: the idle fill of an unreached balloon, the outline every balloon
 * carries, and the string that hangs off it. The plate itself flips
 * (`-plate-from` / `-plate-to` are both restated in the dark cascade). Only the
 * string had been given a dark half, so on a dark plate the idle fill stayed a
 * literal cream and an untouched row rendered five near-white blobs — the
 * UNREACHED state louder than anything the plum→gold ramp climbs to.
 *
 * What is guarded is the split, not the hexes. The RAMP is deliberately
 * theme-invariant (it sits on the balloon, not on the plate) and must stay
 * that way; the three plate-facing marks must each carry both cascades. A
 * value assertion cannot see this class of bug — every one of these tokens had
 * a perfectly good value the whole time — so this reads the CASCADE, in the
 * shape `frozenThemeAliases.test.ts` set.
 *
 * No DOM and no layout here, and none is needed: the defect is entirely in
 * which selector declares what.
 */
import { describe, expect, it } from 'vitest'
import { declarationsIn, ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const css = stripComments(
  readIndexCss(),
)
const dark = declarationsIn(ruleBodies(css, '[data-theme="dark"]'))
const light = declarationsIn(ruleBodies(css, ':root'))

/** Drawn ON the plate — so each one owes the plate's own flip. */
const PLATE_FACING = [
  '--faction-wow-balloon-idle',
  '--faction-wow-balloon-outline',
  '--faction-wow-balloon-string',
]

/** Drawn ON a balloon — theme-invariant on purpose, and must stay so. */
const RAMP = [1, 2, 3, 4, 5].map((tier) => `--faction-wow-balloon-${tier}`)

describe('the WOW balloon plate (#1946)', () => {
  it('flips the plate itself, which is the premise everything else rests on', () => {
    for (const token of ['--faction-wow-balloon-plate-from', '--faction-wow-balloon-plate-to']) {
      expect(dark.has(token), `${token} must be restated in dark`).toBe(true)
    }
  })

  it('gives every mark drawn against the plate a dark half', () => {
    for (const token of PLATE_FACING) {
      expect(light.has(token), `${token} must be declared in the light cascade`).toBe(true)
      expect(
        dark.has(token),
        `${token} is drawn on a plate that flips, so it must flip too (#1946)`,
      ).toBe(true)
      expect(dark.get(token)).not.toBe(light.get(token))
    }
  })

  it('leaves the plum→gold ramp theme-invariant', () => {
    for (const token of RAMP) {
      expect(light.has(token)).toBe(true)
      expect(
        dark.has(token),
        `${token} sits on a balloon, not on the plate — one ramp for both themes`,
      ).toBe(false)
    }
  })
})
