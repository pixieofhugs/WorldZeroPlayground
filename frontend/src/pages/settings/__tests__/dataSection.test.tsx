/**
 * #2158 — the Your data section. The download needs a DOM; the archive bytes are
 * tested in `backend/tests/integration/test_data_export.py`. Pinned here: the
 * filename parse, copy that promises nothing the file lacks (the canvas offered
 * "notification history"), and the section's place in the rail.
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
    // Cross-origin: missing from `expose_headers` reads as null.
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
    // Every string the card can draw, not only the idle state's.
    const everySetting = JSON.stringify(common.settings).toLowerCase()
    expect(everySetting).not.toContain('notification history')
    expect(markup().toLowerCase()).not.toContain('notification')
  })

  it('warns about the size ceiling BEFORE the download, not only inside the zip', () => {
    // Ceiling is `MEDIA_CEILING_BYTES` in backend/services/data_export.py.
    expect(common.settings.data.export.note).toMatch(/too large/)
    // The server renderer writes an apostrophe as an entity.
    expect(markup()).toContain(common.settings.data.export.note.replace(/'/g, '&#x27;'))
  })

  it('is registered in the shell, after cookies and before account', () => {
    const keys = SETTINGS_SECTIONS.map((section) => section.key)
    expect(keys).toContain('data')
    expect(keys.indexOf('data')).toBeGreaterThan(keys.indexOf('cookies'))
    expect(keys.indexOf('data')).toBeLessThan(keys.indexOf('account'))
  })
})
