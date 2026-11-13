/**
 * The unreached vote petal is a component boundary: WCAG 1.4.11 at 3:1 (not
 * text's 4.5) in both themes (#2524 dark, #2608 light), on its real ground.
 *
 * Light forked (#2608): DefaultVote and DefaultPraxisDetail draw `-dot-ring` on
 * the flat na card; AlbescentVote draws `-dot-fill` on `.alb-prism`'s multiply
 * sweep, up to ~10pp darker, where the ring reads 2.70:1. Dark must not fork:
 * fill aliases ring there.
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
import { readIndexCss } from '../../../test/indexCss'

const CSS = readIndexCss()
const THEMES = readThemes(CSS)

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

const card = (theme: Theme) => resolve('--faction-default-card-bg', theme)

/**
 * Albescent's worst ground pixel: `card x stop` at the darkest sweep stop,
 * composited `depth` times (reduced motion composites twice, #2496). Stops are
 * read from index.css so a prism retune is followed.
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
    // The pre-#2608 value (1.53:1); reverting to it must go red.
    const ratio = contrastRatio(parseColor('#d6cfbf')!, card('light'))
    expect(ratio, `the old cream is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })

  it('and 0.3 — the alpha dark shipped with — would not either', () => {
    const cream = { ...resolve('--faction-default-dot-ring', 'dark'), a: 0.3 }
    const ratio = contrastRatio(cream, card('dark'))
    expect(ratio, `at 0.3 the ring is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })

  // Depth 2 (reduced-motion rest frame) binds; both asserted to name the frame.
  it.each([1, 2])('the Albescent fill clears 3:1 on the prism at depth %i', (depth) => {
    const ground = darkestPrismPixel(depth)
    const ratio = contrastRatio(resolve('--faction-default-dot-fill', 'light'), ground)
    expect(
      ratio,
      `the fill is ${formatRatio(ratio)} on the prism's darkest pixel at depth ${depth}`,
    ).toBeGreaterThanOrEqual(AA_LARGE)
  })

  it('and the ring value would not survive the prism — which is why they forked', () => {
    // Evidence for the fork; if this goes red the fork can be re-argued.
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
  // Per-file, not a grep census: these files build `--spectrum-glow-N` by
  // interpolation, so a pattern search is unreliable.
  const READERS: [path: string, token: string][] = [
    ['../AlbescentVote.tsx', '--faction-default-dot-fill'],
    ['../DefaultVote.tsx', '--faction-default-dot-ring'],
    ['../../../pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx', '--faction-default-dot-ring'],
  ]

  it.each(READERS)('%s draws %s as paint, not as ink', (path, token) => {
    const source = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
    expect(source, `${path} reads ${token}`).toContain(`var(${token})`)
    const other = READERS.find(([, name]) => name !== token)![1]
    expect(source, `${path} does not also read ${other}`).not.toContain(`var(${other})`)
    // A bare `color:` would make it text (4.5:1). `\b` excludes `backgroundColor`.
    expect(source).not.toMatch(new RegExp(`\\bcolor:\\s*['"\`]?var\\(${token}`))
  })
})
