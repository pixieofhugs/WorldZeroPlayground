/**
 * The seam: the faction copy sheet against the faction MANIFEST.
 *
 * The sheet is only useful if it is complete — a surface a faction owns that has
 * no section is wording the owner cannot reach. So the test reads the Everymen
 * manifest and fails when a declared surface has no entry, which is what makes
 * "add a surface" a two-place change instead of a silent gap.
 *
 * Harness: `renderToStaticMarkup`. The archetypes are lazy, so the section
 * HEADINGS (one `data-sheet-surface` per key) are what is asserted, not the
 * archetypes' bodies — those render in the browser.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { EVERYMEN_MANIFEST } from '../../../factions/everymen'
import { isFactionScopedKey } from '../../../utils/copyScope'
import FactionCopySheet, { COPY_SHEET_SURFACES } from '../FactionCopySheet'

describe('the Everymen copy sheet', () => {
  it('has a section for every surface the manifest declares', () => {
    const declared = Object.keys(EVERYMEN_MANIFEST).filter((key) => key !== 'slug')
    const sheeted = COPY_SHEET_SURFACES.map((s) => s.key)
    expect(declared.filter((key) => !sheeted.includes(key as never))).toEqual([])

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin/copy/everymen']}>
        <Routes>
          <Route path="/admin/copy/:slug" element={<FactionCopySheet />} />
        </Routes>
      </MemoryRouter>,
    )
    for (const key of declared) expect(html).toContain(`data-sheet-surface="${key}"`)
  })
})

describe('isFactionScopedKey', () => {
  it('tells one faction’s wording from shared wording', () => {
    expect(isFactionScopedKey({ ns: 'feed', key: 'factionSelect.wow.banner' })).toBe(true)
    expect(isFactionScopedKey({ ns: 'factions', key: 'names.everymen' })).toBe(true)
    expect(isFactionScopedKey({ ns: 'factions', key: 'descriptions.coven' })).toBe(true)
    expect(isFactionScopedKey({ ns: 'common', key: 'actions.accept' })).toBe(false)
  })
})
