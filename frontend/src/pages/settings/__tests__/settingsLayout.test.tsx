/**
 * #2829 and #2824 — the two ways a settings row loses a column. No layout here,
 * so these pin the declarations (markup plus `index.css` as text).
 *
 *   #2829  `SettingsRow` must wrap and floor its text column, else an email
 *          value crushes the label.
 *   #2824  Intrinsic `ch` maxima around a `1fr` resolved the description to 0px.
 *          The pane width decides, so an `@container` query, never an inline
 *          `grid-template-columns`. Numbers: owner ruling on #2835.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => 'desktop',
}))

import '../../../i18n'
import SettingsRow from '../SettingsRow'
import { StorageInventory } from '../sections/CookiesSection'
import { readIndexCss } from '../../../test/indexCss'

const CSS = readIndexCss()

const textValuedRow = () =>
  renderToStaticMarkup(
    <SettingsRow title="Email address" help="Where World Zero writes to you.">
      <div style={{ minWidth: 0 }}>pixieofhugs@gmail.com</div>
    </SettingsRow>,
  )

const styleAt = (markup: string, nth: number) =>
  [...markup.matchAll(/style="([^"]*)"/g)][nth]?.[1] ?? ''

describe('a text-valued settings row keeps its label readable (#2829)', () => {
  it('lets the value leave the label line instead of crushing it', () => {
    expect(styleAt(textValuedRow(), 0)).toMatch(/flex-wrap:\s*wrap/)
  })

  it('gives the label column a minimum measure rather than a 0% basis', () => {
    const markup = textValuedRow()
    // `flex-1` is the same 0% basis.
    expect(markup).not.toMatch(/class="[^"]*\bflex-1\b/)
    expect(markup).not.toMatch(/class="[^"]*\bmin-w-0\b/)
    expect(styleAt(markup, 1)).toMatch(/flex:\s*1 1 \d+ch/)
  })
})

describe('the storage inventory picks its shape from the pane (#2824)', () => {
  const list = () => renderToStaticMarkup(<StorageInventory id="sec-cookies-inventory" />)

  it('declares no inline grid template, which would beat the sheet', () => {
    expect(list()).not.toMatch(/grid-template-columns/)
  })

  it('hands both the well and its rows to the stylesheet', () => {
    const markup = list()
    expect(markup).toContain('class="settings-inventory"')
    expect(markup).toContain('class="settings-inventory-row"')
  })

  it('makes the well a size container', () => {
    expect(CSS).toMatch(/\.settings-inventory\s*\{[^}]*container-type:\s*inline-size/)
  })

  it('puts the three-column form behind a container query', () => {
    expect(CSS).toMatch(
      /@container[^{]*\{\s*\.settings-inventory-row\s*\{[^}]*grid-template-columns/,
    )
    const base = /\.settings-inventory-row\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(base).not.toMatch(/grid-template-columns/)
    expect(base).toMatch(/display:\s*grid/)
  })

  /**
   * #2835: 476px is the ~500px pane floor (224 + 118 + 24 gaps + 24 padding + a
   * 110px description) minus the well's padding: size queries measure the
   * CONTENT box.
   */
  it('switches at the content-box equivalent of the pane floor', () => {
    expect(CSS).toMatch(/@container settings-inventory \(min-width: 476px\)/)
  })

  /** A HARD floor makes 0px impossible above the threshold. */
  it('floors the description and declares no ch maximum', () => {
    const table =
      /@container settings-inventory[^{]*\{\s*\.settings-inventory-row\s*\{([^}]*)\}/.exec(
        CSS,
      )?.[1] ?? ''
    expect(table).toMatch(/grid-template-columns:\s*auto minmax\(110px, 1fr\) auto/)
    expect(table).not.toMatch(/\dch/)
  })
})
