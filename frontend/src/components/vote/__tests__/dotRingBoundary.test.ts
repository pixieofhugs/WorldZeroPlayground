/**
 * `--faction-default-dot-ring` is a COMPONENT BOUNDARY, and it is measured at
 * 3:1 (#2524).
 *
 * ## The seam
 *
 * The token's own value, composited over the card it is drawn on. Not text: an
 * unreached petal is what tells you the control has a fifth position at all, so
 * WCAG **1.4.11** governs it at 3:1 and 1.4.3's 4.5 does not apply. That
 * distinction is the whole reason the number below is 3 and not 4.5, and it is
 * why this file exists beside `factionContrast.test.ts` rather than inside it —
 * that registry is a text sweep asserted both ways.
 *
 * ## The consumer list is the load-bearing part
 *
 * The board's patch was written against ONE site, `AlbescentVote`'s fill. The
 * token has three readers and none of them is text:
 *
 *   `components/vote/AlbescentVote.tsx`               fill (the reported site)
 *   `components/vote/DefaultVote.tsx`                 `inset 0 0 0 1.5px` ring
 *   `pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx`   the same ring
 *
 * So it was LIFTED rather than forked: a 1.5px hairline is a thinner target than
 * a 44px blob and wants at least what the blob wants, which means a fork would
 * have had to hand the two rings the higher number anyway. `names its three
 * readers and no more` below is what makes that reasoning re-checkable — a
 * fourth consumer, or one of these three turning into TEXT, re-opens the choice.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_LARGE,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'

const CSS_PATH = fileURLToPath(new URL('../../../index.css', import.meta.url))
const THEMES = readThemes(readFileSync(CSS_PATH, 'utf8'))

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The card all three readers draw on — na's, and Albescent's through it. */
const card = (theme: Theme) => resolve('--faction-default-card-bg', theme)

const ring = (theme: Theme) => contrastRatio(resolve('--faction-default-dot-ring', theme), card(theme))

describe('the unreached petal is visible against the card it sits on', () => {
  it('dark clears the 3:1 graphic floor', () => {
    const ratio = ring('dark')
    expect(ratio, `the ring is ${formatRatio(ratio)} on the dark card`).toBeGreaterThanOrEqual(
      AA_LARGE,
    )
  })

  it('and 0.3 — the alpha it shipped with — would not', () => {
    // The load-bearing half of the lift. `AlbescentVote` filled the blob with
    // this and the vote row read as an empty line; walk the alpha back and this
    // row goes red rather than the defect returning quietly.
    const cream = { ...resolve('--faction-default-dot-ring', 'dark'), a: 0.3 }
    const ratio = contrastRatio(cream, card('dark'))
    expect(ratio, `at 0.3 the ring is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })

  // ponytail: LIGHT IS A SECOND, UNFIXED DEFECT AND THIS ROW IS THE RECORD OF
  // IT. #2524 measured the dark alpha and states in as many words that "light is
  // unaffected: the light value is the opaque #d6cfbf" — true of the CHANGE, and
  // not a pass: that cream on `--faction-default-card-bg` reads 1.53:1, which is
  // the same 1.4.11 failure at half the ratio, on the theme most players use.
  //
  // It is not fixed here because fixing it repaints every player's vote row and
  // the praxis detail's dot rail in the dominant theme, which is a visible design
  // change the issue explicitly scoped out and no ruling covers. The ceiling of
  // this file is therefore "dark is guarded"; the upgrade path is an owner
  // ruling on the light value, after which this row becomes the same
  // `toBeGreaterThanOrEqual(AA_LARGE)` as the dark one above.
  it('light is still under the same floor, and that is an open finding', () => {
    const ratio = ring('light')
    expect(ratio, `the light ring is ${formatRatio(ratio)} on the light card`).toBeLessThan(
      AA_LARGE,
    )
  })
})

describe('names its three readers and no more', () => {
  // A consumer audit rots the moment it is written down, so it is asserted
  // instead. Note the shape this has to survive: `--spectrum-glow-N` in these
  // same two files is built by INTERPOLATION, so a grep for a token name is not
  // a reliable census — the check below is scoped to files rather than to a
  // pattern for that reason.
  const READERS = [
    '../AlbescentVote.tsx',
    '../DefaultVote.tsx',
    '../../../pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx',
  ]

  it.each(READERS)('%s still draws the ring as paint, not as ink', (path) => {
    const source = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
    expect(source, `${path} reads the token`).toContain('var(--faction-default-dot-ring)')
    // A bare `color:` would make it TEXT, and text is a 4.5 question rather than
    // a 3.0 one — at which point 0.6 is no longer enough and this whole file is
    // measuring against the wrong floor. `backgroundColor` is not that, and the
    // word boundary is what keeps the two apart.
    expect(source).not.toMatch(/\bcolor:\s*['"`]?var\(--faction-default-dot-ring/)
  })
})
