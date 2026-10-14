/**
 * The seam: the faction copy sheet against the faction's own CATALOG wording.
 *
 * The sheet shows only surfaces that carry wording written for one faction, and
 * it is only useful if that is ALL of it — a faction-scoped key that renders
 * nowhere on the sheet is wording the owner cannot reach. So this renders the
 * sheet, records every key it asks i18next for, and fails on any Everymen key in
 * the catalogs that was never asked for.
 *
 * Left out on purpose: `names.*` / `descriptions.*` (the faction's name and
 * blurb render on every page already) and non-string values (taunt pools,
 * perk lists) — the live editor edits strings only.
 *
 * Harness: `renderToStaticMarkup` with the archetypes preloaded, so the lazy
 * surfaces render their bodies.
 */
import '../../../test/preloadArchetypes'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n, { resources } from '../../../i18n'
import { isFactionScopedKey } from '../../../utils/copyScope'
import FactionCopySheet from '../FactionCopySheet'

/** Every string leaf whose dotted key has `slug` as a segment, as `ns:key`. */
function factionKeys(slug: string): string[] {
  const found: string[] = []
  const walk = (ns: string, node: unknown, path: string[]) => {
    if (typeof node === 'string') {
      if (path.includes(slug) && !/^(names|descriptions)$/.test(path[0])) found.push(`${ns}:${path.join('.')}`)
    } else if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) walk(ns, v, [...path, k])
    }
  }
  for (const [ns, table] of Object.entries(resources.en)) walk(ns, table, [])
  // A plural is asked for by its stem; i18next picks `_one` / `_other`.
  return [...new Set(found.map((key) => key.replace(/_(zero|one|two|few|many|other)$/, '')))]
}

/**
 * Faction keys never drawn as visible text, so no sheet can offer them to the
 * click-to-edit editor. Listed, not silently skipped: each awaits a decision.
 */
const UNRENDERED = [
  // EverymenSelectCard draws tagline, status and cta; never the blurb. Dead copy.
  'feed:factionSelect.everymen.blurb',
  // EverymenVote's gears carry the tier words only in their aria-label.
  ...[1, 2, 3, 4, 5].map((n) => `votes:everymen.tier${n}`),
]

describe('the Everymen copy sheet', () => {
  it('renders every Everymen-only catalog key', () => {
    const asked = new Set<string>()
    const t = i18n.t.bind(i18n)
    const spy = vi.spyOn(i18n, 't').mockImplementation(((key: string | string[], options?: { ns?: string | string[] }) => {
      const raw = Array.isArray(key) ? key[0] : key
      const [ns, bare] = raw.includes(':') ? raw.split(':') : [[options?.ns ?? 'common'].flat()[0], raw]
      asked.add(`${ns}:${bare}`)
      return t(key as never, options as never)
    }) as never)
    try {
      renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/copy/everymen']}>
          <Routes>
            <Route path="/admin/copy/:slug" element={<FactionCopySheet />} />
          </Routes>
        </MemoryRouter>,
      )
    } finally {
      spy.mockRestore()
    }
    const keys = factionKeys('everymen')
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.filter((key) => !asked.has(key) && !UNRENDERED.includes(key))).toEqual([])
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
