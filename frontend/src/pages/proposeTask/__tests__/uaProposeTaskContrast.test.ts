/**
 * The UA propose leaf's delta over its create twin (#2538). Sheet, wash and
 * their inks are `uaCreateCharacterContrast.test.ts`'s; field inks on
 * `--faction-ua-panel` are `factionContrast.test.ts`'s; the breadcrumb is the
 * shared one (#2973, `createCharacterContrast.test.ts`). Not re-measured here.
 *
 *  1. The preview's credit line reads `--faction-ua-card-credit` — a new pairing
 *     on the panel.
 *  2. The level row: shared `FilterLevelNodes` stands on translucent
 *     `--color-bg-surface` and misses on this leaf, and a field cannot be moved
 *     off the sheet, so the kit redraws it. If the shared control ever clears,
 *     the redraw is dead weight — the failing row will say so.
 *
 * The wash is read from the stylesheet, not transcribed.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
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

/** The sheet under the ornament layer — what a mark on the leaf really sits on. */
function washedLeaf(theme: Theme): Rgba {
  const alpha = Number(resolveVar('--faction-ua-card-lotus-opacity', theme, THEMES))
  expect(alpha, `the lotus opacity is a number in ${theme}`).toBeGreaterThan(0)
  return compositeOver(
    { ...resolve('--faction-ua-card-lotus', theme), a: alpha },
    resolve('--faction-ua-card-bg', theme),
  )
}

describe("the preview's bonus line reads the kit's own credit rung", () => {
  it.each(BOTH_THEMES)('%s', (theme) => {
    // The panel is opaque over the wash: a flat pairing.
    const ratio = contrastRatio(
      resolve('--faction-ua-card-credit', theme),
      resolve('--faction-ua-panel', theme),
    )
    expect(
      ratio,
      `--faction-ua-card-credit on the well is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

describe('and the level row is drawn here because the shared one could not stand on the leaf', () => {

  it('and clears it in light, so this is a dark-only miss and invisible to a light-only check', () => {
    const node = compositeOver(resolve('--color-bg-surface', 'light'), washedLeaf('light'))
    const ratio = contrastRatio(resolve('--color-text-secondary', 'light'), node)
    expect(ratio, `the level node's ink on the leaf is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe('keeps the grounds in step with the archetype', () => {
  // The measurements above hold only while the archetype still uses these
  // tokens and still declines the shared level control.
  const source = readFileSync(
    fileURLToPath(new URL('../archetypes/UaProposeTask.tsx', import.meta.url)),
    'utf8',
  )

  it('still washes its ground with the tokens the create leaf measures', () => {
    expect(source).toContain('var(--faction-ua-card-lotus)')
    expect(source).toContain('var(--faction-ua-card-lotus-opacity)')
  })

  it('draws its own level row rather than mounting the shared control', () => {
    // The import path, not the name: the archetype names it in prose.
    expect(source).not.toContain('ui/FilterLevelNodes')
  })
})
