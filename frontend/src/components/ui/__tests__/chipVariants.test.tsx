/**
 * #1824 — `Chip`'s `sigilText` variant must not leak into the two shipped ones:
 * they share one style object, so any ungated value would.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { Chip } from '../ChipRow'

const noop = () => {}

const text = (on: boolean) =>
  renderToStaticMarkup(
    <Chip on={on} onClick={noop} tint="var(--faction-ua)">
      UA
    </Chip>,
  )

const iconOnly = (on: boolean) =>
  renderToStaticMarkup(
    <Chip on={on} onClick={noop} tint="var(--faction-ua)" iconOnly ariaLabel="UA">
      <i />
    </Chip>,
  )

const sigilText = (on: boolean, slug: 'ua' | 'na') =>
  renderToStaticMarkup(
    <Chip
      on={on}
      onClick={noop}
      tint={slug === 'ua' ? 'var(--faction-ua)' : 'var(--faction-default)'}
      unaffiliated={slug === 'na'}
      sigilText
    >
      <span>Name</span>
    </Chip>,
  )

describe('the two shipped chip variants are untouched', () => {
  it('keeps the text chip at 36px with a 1px border', () => {
    for (const markup of [text(false), text(true)]) {
      expect(markup).toContain('min-height:36px')
      expect(markup).toContain('border:1px solid')
      expect(markup).not.toContain('min-height:40px')
    }
  })

  it('keeps the glyph chip at 36px with a 1px border', () => {
    for (const markup of [iconOnly(false), iconOnly(true)]) {
      expect(markup).toContain('min-height:36px')
      expect(markup).toContain('border:1px solid')
    }
  })

  it('still draws the 8x8 swatch for the text chip', () => {
    expect(text(false)).toContain('width:8px')
  })
})

describe('sigilText — the propose-task faction chip', () => {
  it('is 40px tall with a 2px border in BOTH states, so selecting never reflows the row', () => {
    for (const markup of [sigilText(false, 'ua'), sigilText(true, 'ua')]) {
      expect(markup).toContain('min-height:40px')
      expect(markup).toContain('border:2px solid')
    }
  })

  it('drops the swatch — the sigil is the mark', () => {
    expect(sigilText(false, 'ua')).not.toContain('width:8px')
  })

  it('is a radio, not a toggle: the chips live in a radiogroup', () => {
    expect(sigilText(true, 'ua')).toContain('role="radio"')
    expect(sigilText(true, 'ua')).toContain('aria-checked="true"')
    expect(sigilText(true, 'ua')).not.toContain('aria-pressed')
  })

  it('paints selection in the faction tint', () => {
    const on = sigilText(true, 'ua')
    expect(on).toContain('border:2px solid var(--faction-ua)')
    expect(on).toContain('color-mix(in srgb, var(--faction-ua) 14%, var(--color-bg-surface))')
  })

  it('gives a selected na chip the spectrum frame and no solid glow', () => {
    const on = sigilText(true, 'na')
    expect(on).toContain('--faction-default-rainbow')
    // Match the declaration: `transition` also names box-shadow.
    expect(on).not.toContain('box-shadow:')
    expect(sigilText(true, 'ua')).toContain('box-shadow:')
  })
})
