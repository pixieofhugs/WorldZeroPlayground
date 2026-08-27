/**
 * The unreached vote petal is a COMPONENT BOUNDARY, and it is measured at 3:1
 * in BOTH cascades (#2524 dark, #2608 light).
 *
 * ## The seam
 *
 * The token's own value, composited over the ground the consumer actually draws
 * on. Not text: an unreached petal is what tells you the control has a fifth
 * position at all, so WCAG **1.4.11** governs it at 3:1 and 1.4.3's 4.5 does not
 * apply. That distinction is the whole reason the numbers below are 3 and not
 * 4.5, and it is why this file exists beside `factionContrast.test.ts` rather
 * than inside it — that registry is a text sweep asserted both ways.
 *
 * ## The consumer list is the load-bearing part, and it FORKED in #2608
 *
 * The token has three readers and none of them is text. #2524 lifted them
 * together because dark's one value cleared 3:1 on both grounds. Light does not
 * have that luxury, so the owner ruled the split (2026-08-26):
 *
 *   `components/vote/DefaultVote.tsx`                        ring, na card
 *   `pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx`  ring, na card
 *   `components/vote/AlbescentVote.tsx`                      fill, the PRISM
 *
 * The two `inset 0 0 0 1.5px` hairlines composite on the flat light na card
 * `--faction-default-card-bg`. Albescent's 42px blob does not: `.alb-prism`
 * paints a multiply sweep INTO that card, so the blob sits on a ground up to
 * ~10pp darker, and a ring value tuned on the flat card reads 2.70:1 there.
 * Two grounds, two values — "mint the name, keep the per-site alpha".
 *
 * Dark did NOT fork and must not: `--faction-default-dot-fill` aliases the ring
 * under `[data-theme="dark"]`, where the one cream reads 5.73:1 flat and 5.97:1
 * on the prism. Both rows below therefore run in both themes.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_LARGE,
  contrastRatio,
  formatRatio,
  parseColor,
  relativeLuminance,
  type Rgba,
} from '../../../utils/contrast'
import {
  declarationsIn,
  readThemes,
  resolveVar,
  ruleBodies,
  stripComments,
  type Theme,
} from '../../../utils/__tests__/cssVars'

const CSS_PATH = fileURLToPath(new URL('../../../index.css', import.meta.url))
const CSS = readFileSync(CSS_PATH, 'utf8')
const THEMES = readThemes(CSS)

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The flat card the two hairlines draw on — na's. */
const card = (theme: Theme) => resolve('--faction-default-card-bg', theme)

/**
 * Albescent's ground, worst pixel.
 *
 * `.alb-prism` sets `--faction-default-card-sheet` to a `multiply` sweep over
 * `--faction-default-card-bg`, so the ground under an Albescent petal is
 * `card x stop` at the darkest of the sweep's stops. Under
 * `prefers-reduced-motion` the SAME layer list is composited TWICE (epic #2496
 * ruling 6 — the rest frame), which is where the ground is deepest and so where
 * the fill has the least to work with. `depth` is that layer count.
 *
 * The stops are read out of index.css rather than restated here: retune the
 * prism and this measurement follows it, which is the whole point of measuring
 * the composited ground instead of the declared token.
 */
const PRISM_SELECTOR = '.alb-prism,\n.alb-faction-hero,\n.alb-faction-body'

const prismStops = (): Rgba[] => {
  const bodies = ruleBodies(stripComments(CSS), PRISM_SELECTOR)
  expect(bodies, 'the light .alb-prism rule is still one rule').toHaveLength(1)
  const sheet = declarationsIn(bodies).get('--faction-default-card-sheet')
  expect(sheet, '.alb-prism still declares the sheet').toBeDefined()
  const stops = [...sheet!.matchAll(/#[0-9a-f]{6}/gi)].map(([hex]) => parseColor(hex)!)
  expect(stops.length, 'the light prism sweep still has stops to measure').toBeGreaterThan(0)
  return stops
}

/** CSS `multiply` of an opaque source over an opaque backdrop. */
const multiply = (back: Rgba, source: Rgba): Rgba => ({
  r: (back.r * source.r) / 255,
  g: (back.g * source.g) / 255,
  b: (back.b * source.b) / 255,
  a: 1,
})

function darkestPrismPixel(depth: number): Rgba {
  let worst = card('light')
  for (const stop of prismStops()) {
    let ground = card('light')
    for (let layer = 0; layer < depth; layer += 1) ground = multiply(ground, stop)
    if (relativeLuminance(ground) < relativeLuminance(worst)) worst = ground
  }
  return worst
}

const ring = (theme: Theme) => contrastRatio(resolve('--faction-default-dot-ring', theme), card(theme))

describe('the unreached petal is visible against the ground it sits on', () => {
  it.each(['light', 'dark'] as const)('the hairline rings clear 3:1 on the %s na card', (theme) => {
    const ratio = ring(theme)
    expect(ratio, `the ring is ${formatRatio(ratio)} on the ${theme} card`).toBeGreaterThanOrEqual(
      AA_LARGE,
    )
  })

  it('and the cream it shipped with would not', () => {
    // The load-bearing half of the lift, light side. `#d6cfbf` is what stood
    // here until #2608 and it read 1.53:1 — a 4-of-5 vote showed two petals
    // rather than two of four. Walk the value back and this row goes red rather
    // than the defect returning quietly.
    const ratio = contrastRatio(parseColor('#d6cfbf')!, card('light'))
    expect(ratio, `the old cream is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })

  it('and 0.3 — the alpha dark shipped with — would not either', () => {
    const cream = { ...resolve('--faction-default-dot-ring', 'dark'), a: 0.3 }
    const ratio = contrastRatio(cream, card('dark'))
    expect(ratio, `at 0.3 the ring is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })

  // Albescent's blob, on Albescent's ground. `depth: 2` is the reduced-motion
  // rest frame and is the binding case — the moving frame is strictly lighter,
  // so a value that clears at 2 clears at 1. Both are asserted so a regression
  // says WHICH frame broke.
  it.each([1, 2])('the Albescent fill clears 3:1 on the prism at depth %i', (depth) => {
    const ground = darkestPrismPixel(depth)
    const ratio = contrastRatio(resolve('--faction-default-dot-fill', 'light'), ground)
    expect(
      ratio,
      `the fill is ${formatRatio(ratio)} on the prism's darkest pixel at depth ${depth}`,
    ).toBeGreaterThanOrEqual(AA_LARGE)
  })

  it('and the ring value would not survive the prism — which is why they forked', () => {
    // The evidence for the split, not a restatement of it. If the two ever
    // become interchangeable this row goes red and the fork can be re-argued.
    const ratio = contrastRatio(resolve('--faction-default-dot-ring', 'light'), darkestPrismPixel(1))
    expect(ratio, `the ring on the prism is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })

  it('dark did not fork: the fill is the ring there', () => {
    expect(resolveVar('--faction-default-dot-fill', 'dark', THEMES)).toBe(
      resolveVar('--faction-default-dot-ring', 'dark', THEMES),
    )
  })
})

describe('names its three readers, by token, and no more', () => {
  // A consumer audit rots the moment it is written down, so it is asserted
  // instead — and since #2608 it is asserted per TOKEN, because which of the two
  // a file reads is the ruling. Note the shape this has to survive:
  // `--spectrum-glow-N` in these same two files is built by INTERPOLATION, so a
  // grep for a token name is not a reliable census — the check below is scoped
  // to files rather than to a pattern for that reason.
  const READERS: [path: string, token: string][] = [
    ['../AlbescentVote.tsx', '--faction-default-dot-fill'],
    ['../DefaultVote.tsx', '--faction-default-dot-ring'],
    ['../../../pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx', '--faction-default-dot-ring'],
  ]

  it.each(READERS)('%s draws %s as paint, not as ink', (path, token) => {
    const source = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
    expect(source, `${path} reads ${token}`).toContain(`var(${token})`)
    // It must read ITS token and not the other one — a file that reads both has
    // lost the fork.
    const other = READERS.find(([, name]) => name !== token)![1]
    expect(source, `${path} does not also read ${other}`).not.toContain(`var(${other})`)
    // A bare `color:` would make it TEXT, and text is a 4.5 question rather than
    // a 3.0 one — at which point these values are no longer enough and this whole
    // file is measuring against the wrong floor. `backgroundColor` is not that,
    // and the word boundary is what keeps the two apart.
    expect(source).not.toMatch(new RegExp(`\\bcolor:\\s*['"\`]?var\\(${token}`))
  })
})
