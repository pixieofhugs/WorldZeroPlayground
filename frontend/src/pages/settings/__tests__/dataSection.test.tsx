/**
 * #2158 — the Your data section, and the two things this harness can see.
 *
 * THE HARNESS HAS NO DOM (`renderToStaticMarkup`, node env — see
 * `vite.config.ts`), so the download itself is not testable here: it ends in
 * `URL.createObjectURL` and a synthetic click. The bytes are covered where they
 * are actually produced, in `backend/tests/integration/test_data_export.py`,
 * which opens the real archive. What is left, and what is worth pinning, is:
 *
 *   1. THE FILENAME PARSE. A header parse that quietly returns the wrong thing
 *      saves a file called `export` with no extension. It is the only branching
 *      logic on this side.
 *   2. THE COPY NOT PROMISING WHAT THE FILE CANNOT CONTAIN. The canvas offers
 *      "notification history", which does not exist in any form. That is a
 *      falsehood a future "restore the design" pass would reintroduce, and
 *      nothing else in the build can see it.
 *   3. THE SECTION BEING REACHABLE, in the order the design draws.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => 'desktop',
}))

import '../../../i18n'
import { exportFilename } from '../../../api/me'
import { SETTINGS_SECTIONS } from '../../Settings'
import DataSection from '../sections/DataSection'
import common from '../../../locales/en/common.json'

const markup = () => renderToStaticMarkup(<DataSection sectionId="sec-data" />)

describe('exportFilename', () => {
  it('takes the name the server chose', () => {
    expect(
      exportFilename('attachment; filename="world-zero-export-2026-08-30.zip"'),
    ).toBe('world-zero-export-2026-08-30.zip')
  })

  it('falls back to a named zip when the header is absent or unparseable', () => {
    // Cross-origin, so a deployment that drops it from `expose_headers` reads
    // null here — and must still save something a reader can open.
    expect(exportFilename(null)).toBe('world-zero-export.zip')
    expect(exportFilename('attachment')).toBe('world-zero-export.zip')
  })
})

describe('DataSection', () => {
  it('renders the card, its lead and the download button', () => {
    const html = markup()
    expect(html).toContain('id="sec-data"')
    expect(html).toContain(common.settings.data.eyebrow)
    expect(html).toContain('data-testid="settings-export-data"')
    expect(html).toContain(common.settings.data.export.button)
  })

  it('never promises notification history, which does not exist', () => {
    // The canvas' own words for this card. Every string the card can draw,
    // not only the ones rendered in the idle state.
    const everySetting = JSON.stringify(common.settings).toLowerCase()
    expect(everySetting).not.toContain('notification history')
    expect(markup().toLowerCase()).not.toContain('notification')
  })

  it('warns about the size ceiling BEFORE the download, not only inside the zip', () => {
    // A reader who opens an archive with no photos in it has to have been told
    // why beforehand. The number is `MEDIA_CEILING_BYTES` in
    // backend/services/data_export.py; this is its other home.
    expect(markup()).toContain('200 MB')
  })

  it('is registered in the shell, after cookies and before account', () => {
    const keys = SETTINGS_SECTIONS.map((section) => section.key)
    expect(keys).toContain('data')
    expect(keys.indexOf('data')).toBeGreaterThan(keys.indexOf('cookies'))
    expect(keys.indexOf('data')).toBeLessThan(keys.indexOf('account'))
  })
})
