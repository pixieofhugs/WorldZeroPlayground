/**
 * #2829 and #2824 — the two ways a settings row loses a column.
 *
 * SEAM: the rendered markup of `SettingsRow` and of `StorageInventory`, plus
 * `index.css` read as text — the repo's DOM-less node env has no layout, so
 * "the description column measured 0px" is not a question this harness can ask.
 * What it CAN ask is whether the declarations that produced those measurements
 * are still there, and both defects were single declarations:
 *
 *   #2829  `SettingsRow`'s flex row could not wrap, and its text column was
 *          `flex-1 min-w-0` — a 0% basis with no floor, so a text-valued
 *          control (an email) kept its intrinsic width and the label column
 *          absorbed all of the compression: 32px wide, 638px tall at 375px.
 *
 *   #2824  The inventory's desktop grid declared `minmax(0, 32ch)` and
 *          `minmax(0, 26ch)` around a `1fr`. Two intrinsic maxima are grown
 *          BEFORE a flexible track gets anything, so in the 483px settings pane
 *          they split the free space 229.5/229.5 and the description resolved
 *          to 0px. The width that decides this is the PANE's, which the sidebar
 *          changes without the viewport moving — so the shape is chosen by an
 *          `@container` query in the sheet, not by `useFormFactor` and not by
 *          an inline style (an inline `grid-template-columns` beats every rule
 *          that could yield it).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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

const HERE = dirname(fileURLToPath(import.meta.url))
const CSS = readFileSync(join(HERE, '..', '..', '..', 'index.css'), 'utf8')

/** A row whose control is a string of the length a real account carries. */
const textValuedRow = () =>
  renderToStaticMarkup(
    <SettingsRow title="Email address" help="Where World Zero writes to you.">
      <div style={{ minWidth: 0 }}>pixieofhugs@gmail.com</div>
    </SettingsRow>,
  )

/** The `style="…"` of the nth element in a markup string. */
const styleAt = (markup: string, nth: number) =>
  [...markup.matchAll(/style="([^"]*)"/g)][nth]?.[1] ?? ''

describe('a text-valued settings row keeps its label readable (#2829)', () => {
  it('lets the value leave the label line instead of crushing it', () => {
    expect(styleAt(textValuedRow(), 0)).toMatch(/flex-wrap:\s*wrap/)
  })

  it('gives the label column a minimum measure rather than a 0% basis', () => {
    const markup = textValuedRow()
    // `flex-1` (Tailwind) and `flex:1 1 0%` are the same 0% basis: the column
    // shrinks past its own content while the value gives up nothing.
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
    // The stacked form is the base rule; three columns only where they fit.
    expect(CSS).toMatch(
      /@container[^{]*\{\s*\.settings-inventory-row\s*\{[^}]*grid-template-columns/,
    )
    const base = /\.settings-inventory-row\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(base).not.toMatch(/grid-template-columns/)
    expect(base).toMatch(/display:\s*grid/)
  })
})
