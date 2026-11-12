/**
 * #1946: marks drawn on the WOW plate (idle fill, outline, string) must flip
 * with it, or unreached balloons glare on dark. The ramp sits on the balloon and
 * stays theme-invariant. Reads which selector declares what, not values.
 */
import { describe, expect, it } from 'vitest'
import { declarationsIn, ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const css = stripComments(
  readIndexCss(),
)
const dark = declarationsIn(ruleBodies(css, '[data-theme="dark"]'))
const light = declarationsIn(ruleBodies(css, ':root'))

const PLATE_FACING = [
  '--faction-wow-balloon-idle',
  '--faction-wow-balloon-outline',
  '--faction-wow-balloon-string',
]

// Rung 1 reuses the plum surface; the ramp has no token of its own for it.
const RAMP = ['--faction-wow-plum-surface', ...[2, 3, 4, 5].map((tier) => `--faction-wow-balloon-${tier}`)]

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
