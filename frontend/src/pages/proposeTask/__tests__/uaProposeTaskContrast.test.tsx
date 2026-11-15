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
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import {
  AA_NORMAL,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'
import UaProposeTask, { LOTUS } from '../archetypes/UaProposeTask'
import { proposeTaskState } from './proposeTaskState'

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

const PAGE = renderToStaticMarkup(
  <MemoryRouter>
    <UaProposeTask state={proposeTaskState()} />
  </MemoryRouter>,
)

describe('keeps the grounds in step with the archetype', () => {
  // The measurements above hold only while the archetype still uses these
  // tokens and still declines the shared level control.
  it('still washes its ground with the tokens the create leaf measures', () => {
    expect(LOTUS).toEqual({
      color: 'var(--faction-ua-card-lotus)',
      opacity: 'var(--faction-ua-card-lotus-opacity)',
    })
  })

  it('draws its own level row rather than mounting the shared control', () => {
    // The shared control's wrapper class; the redraw is a bare flex div.
    expect(PAGE).not.toContain('flex flex-wrap items-center')
  })
})
