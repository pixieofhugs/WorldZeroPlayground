/**
 * Every faction-scoped catalog key must render somewhere on the faction copy
 * sheet, or the owner can't reach it. Skipped: `names.*` / `descriptions.*`
 * (on every page) and non-strings (the editor edits strings only).
 */
import '../../../test/preloadArchetypes'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { resources } from '../../../i18n'
import { recordedCopyTargets, setCopyRecording } from '../../../utils/copyRegistry'
import { isFactionScopedKey } from '../../../utils/copyScope'
import FactionCopySheet from '../FactionCopySheet'
import { AuthContext } from '../../../auth/AuthContext'
import { ThemeProvider } from '../../../hooks/useTheme'
import { aCurrentUser } from '../../../test/fixtures'
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER, setAlbescentRevealed } from '../../../utils/factions'

const SLUGS = [...FACTION_RAINBOW_ORDER, ALBESCENT_FACTION_SLUG]

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
  // UA's locked card prints no status line. Dead copy.
  'feed:factionSelect.ua.status.locked',
  // Post-press letters (busy, joined, failed): edit them in the live app.
  ...['cta.joined', 'cta.busy', 'declineError'].map((key) => `factions:albescent.letter.${key}`),
]

/* Blind spot: EverymenVote's tier words are aria-label only, so nothing to click. */

describe.each(SLUGS)('the %s copy sheet', (slug) => {
  it('renders every catalog key scoped to the faction', () => {
    // Unrevealed admins see Albescent redacted, by design.
    setAlbescentRevealed(true)
    // The copy editor's own index: a key in it is one a click can reach.
    setCopyRecording(true)
    let asked = new Set<string>()
    try {
    // Signed in: a vote draws its tiers only for a viewer.
      renderToStaticMarkup(
        <ThemeProvider>
          <AuthContext.Provider
            value={{ user: aCurrentUser(), loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}
          >
            <MemoryRouter initialEntries={[`/admin/copy/${slug}`]}>
              <Routes>
                <Route path="/admin/copy/:slug" element={<FactionCopySheet />} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </ThemeProvider>,
      )
      asked = new Set(recordedCopyTargets().map(({ ns, key }) => `${ns}:${key}`))
    } finally {
      setCopyRecording(false)
      setAlbescentRevealed(false)
    }
    const keys = factionKeys(slug)
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
