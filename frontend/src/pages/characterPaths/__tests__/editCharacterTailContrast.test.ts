/**
 * The edit-character tail (FactionRow + DeleteCharacter, #2537/#3009) on the
 * ground each archetype stands it on. One table row per faction: the grounds the
 * tail can land on, the plate and edge the archetype hands both controls, and
 * the alarm ink. Colours are read from the stylesheet; pixels are visual QA.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_LARGE,
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const INDEX_CSS = readIndexCss()
const THEMES = readThemes(INDEX_CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

const over = (token: string, theme: Theme, ground: Rgba): Rgba =>
  compositeOver(resolve(token, theme), ground)

/** Token layers stacked, in order, on a base token. */
const stack =
  (base: string, ...layers: string[]) =>
  (theme: Theme): Rgba =>
    layers.reduce((ground, token) => over(token, theme, ground), resolve(base, theme))

/** The `.na-backdrop` wash stops over the page stock, one ground per stop. */
function washedPage(theme: Theme): Rgba[] {
  const marker = theme === 'dark' ? '[data-theme="dark"] .na-backdrop {' : '\n.na-backdrop {'
  const start = INDEX_CSS.indexOf(marker)
  expect(start, `the ${theme} .na-backdrop rule exists`).toBeGreaterThan(-1)
  const block = INDEX_CSS.slice(start, INDEX_CSS.indexOf('}', start))
  const stops = [...block.matchAll(/rgba\([^)]*\)/g)].map(([whole]) => whole)
  expect(stops.length, `the ${theme} wash still paints its stops`).toBe(5)
  return stops.map((stop) => compositeOver(parseColor(stop)!, resolve('--color-bg-page', theme)))
}

/** S.N.I.D.E.'s wall readings: ramp ends plus the acid and pink corner washes. */
const snideWall = (theme: Theme): Rgba[] =>
  [
    stack('--faction-snide-wall'),
    stack('--faction-snide-wall-deep'),
    stack('--faction-snide-wall', '--faction-snide-note-wash-acid'),
    stack('--faction-snide-wall-deep', '--faction-snide-note-wash-pink'),
  ].map((reading) => reading(theme))

type Tail = {
  faction: string
  grounds: (theme: Theme) => Rgba[]
  /** The plate both controls take, and the edge that identifies it. */
  fill: string
  edge: string
  alarm: string
}

const TAILS: Tail[] = [
  {
    faction: 'coven',
    grounds: (t) => [resolve('--color-bg-page', t)],
    fill: '--faction-coven-card-bg',
    edge: '--faction-coven-accent-ink',
    alarm: '--faction-coven-card-alarm',
  },
  {
    faction: 'ephemerists',
    grounds: (t) => [resolve('--faction-ephemerists-plate-bg', t)],
    fill: '--faction-ephemerists-plate-inner',
    edge: '--faction-ephemerists-card-accent',
    alarm: '--faction-ephemerists-card-alarm',
  },
  {
    faction: 'everymen',
    grounds: (t) =>
      ['--faction-everymen-bill-glow-gold', '--faction-everymen-bill-glow-olive'].map((glow) =>
        stack('--everymen-paper', glow, '--faction-everymen-bill-ray')(t),
      ),
    fill: '--faction-everymen-sheet-panel',
    edge: '--everymen-deep-accent',
    alarm: '--faction-everymen-card-alarm',
  },
  {
    faction: 'snide',
    grounds: snideWall,
    fill: '--faction-snide-note-paper',
    edge: '--faction-snide-accent-ink',
    alarm: '--faction-snide-wall-alarm',
  },
  {
    faction: 'ua',
    grounds: washedPage,
    fill: '--faction-ua-panel',
    edge: '--faction-ua-card-accent',
    alarm: '--faction-ua-card-alarm',
  },
  {
    faction: 'wow',
    grounds: (t) => [resolve('--faction-wow-card-bg', t)],
    fill: '--faction-wow-chronicle-panel',
    edge: '--faction-wow-accent-deep',
    alarm: '--faction-wow-card-alarm',
  },
]

describe.each(TAILS)('the $faction edit-character tail', ({ grounds, fill, edge, alarm }) => {
  it.each(BOTH_THEMES)('clears AA on every ground it lands on — %s', (theme) => {
    for (const ground of grounds(theme)) {
      for (const ink of [alarm, '--color-text-secondary', '--color-text-tertiary']) {
        const got = contrastRatio(resolve(ink, theme), ground)
        expect(got, `${ink} is ${formatRatio(got)}`).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    }
  })

  it.each(BOTH_THEMES)("carries the row's and the cancel key's ink on its own plate — %s", (theme) => {
    for (const ground of grounds(theme)) {
      const well = over(fill, theme, ground)
      for (const ink of ['--color-text-secondary', '--color-text-primary']) {
        const got = contrastRatio(resolve(ink, theme), well)
        expect(got, `${ink} on ${fill} is ${formatRatio(got)}`).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    }
  })

  it.each(BOTH_THEMES)('has a plate edge identifiable at 3:1 (WCAG 1.4.11) — %s', (theme) => {
    for (const ground of grounds(theme)) {
      const outside = contrastRatio(resolve(edge, theme), ground)
      expect(outside, `${edge} on the ground is ${formatRatio(outside)}`).toBeGreaterThanOrEqual(AA_LARGE)
      const inside = contrastRatio(resolve(edge, theme), over(fill, theme, ground))
      expect(inside, `${edge} on ${fill} is ${formatRatio(inside)}`).toBeGreaterThanOrEqual(AA_LARGE)
    }
  })
})

// A fill and its ink: no sheet reaches the confirm button, so no faction row owns it.
it.each(BOTH_THEMES)('the filled confirm keeps its neutral pair at AA — %s', (theme) => {
  const got = contrastRatio(resolve('--color-on-danger', theme), resolve('--color-danger', theme))
  expect(got, `the filled confirm reads ${formatRatio(got)}`).toBeGreaterThanOrEqual(AA_NORMAL)
})

// The `snide.alarm` row above measures the wall ink only while the archetype paints it.
it('snide re-points the card alarm onto the wall family', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../archetypes/SnideEditCharacter.tsx', import.meta.url)),
    'utf8',
  )
  expect(/'--faction-snide-card-alarm':\s*'var\((--[a-z0-9-]+)\)'/.exec(source)?.[1]).toBe(
    '--faction-snide-wall-alarm',
  )
})
