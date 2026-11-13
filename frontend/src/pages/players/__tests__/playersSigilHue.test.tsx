/**
 * The Players page draws every faction mark in that faction's own hue (#2723),
 * read from the mark's `fill` (`markFills`), which `playersFactionInk` (inline
 * styles) cannot see. Component defaults failed: the kite's `currentColor` went
 * white after dark; snide/wow/UA defaults are theme-invariant.
 * `factionCssVar(slug)` carries both themes.
 *
 * Probed by difference so a hardcoded hue cannot pass. `na`/`albescent` must
 * keep their spectra, not the flat `--faction-default` grey (#2528).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { ALBESCENT_FACTION_SLUG, factionCssVar } from '../../../utils/factions'
import { markFills, occurrences } from '../../../utils/__tests__/sigilInk'

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' as const, toggle: () => {} }),
}))

import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import { NO_RELATIONSHIPS, rankPlayers, type PlayersViewProps } from '../playersData'

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 100,
    all_time_score: 100,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

/** Podium fillers, so rows under test land in the roster. */
const FILLER: CharacterOut[] = [
  player({ id: 1, display_name: 'Filler A', faction_slug: 'coven', score: 900 }),
  player({ id: 2, display_name: 'Filler B', faction_slug: 'ua', score: 800 }),
  player({ id: 3, display_name: 'Filler C', faction_slug: 'singularity', score: 700 }),
]

function props(field: CharacterOut[]): PlayersViewProps {
  return {
    ranked: rankPlayers([...FILLER, ...field], 'era'),
    scoreMode: 'era',
    onScoreMode: () => {},
    eyebrow: 'Renaissance · The Standings',
    myCharId: null,
    related: NO_RELATIONSHIPS,
    latest: {},
  }
}

const desktop = (field: CharacterOut[] = []) => render(<DesktopPlayers {...props(field)} />)
const mobile = (field: CharacterOut[] = []) => render(<MobilePlayers {...props(field)} />)

describe('a race lane', () => {
  it("draws its mark in the lane's own hue, not the page ink", () => {
    // Two lanes in one render: proves `lane.slug`, not a pinned hue.
    const html = desktop()
    expect(markFills(html, 'ephemerists')).toContain(factionCssVar('ephemerists'))
    expect(markFills(html, 'snide')).toContain(factionCssVar('snide'))
  })

  it('draws no lane mark in the page ink', () => {
    // Only the kite defaulted to `currentColor` (page ink).
    expect(markFills(desktop(), 'ephemerists')).not.toContain('currentColor')
  })

  it('is the same token the lane bar beside it reads', () => {
    // Not `-metal-gold`: theme-invariant, 1.69:1 here in light.
    const html = desktop()
    expect(html).toContain(`background:${factionCssVar('ephemerists')}`)
    expect(markFills(html, 'ephemerists')).toContain(factionCssVar('ephemerists'))
  })

  it('takes the lane off the marks that carry only ONE theme', () => {
    // `--faction-snide-acid` is one value in both themes: invisible in light.
    expect(markFills(desktop(), 'snide')).not.toContain('var(--faction-snide-acid)')
  })
})

describe('the MOBILE race lane', () => {
  // Mobile shows only 4 lanes, so Ephemerists is scored to the top to be on
  // the page.
  const LEADING_KITE = [player({ id: 4, display_name: 'Kite', faction_slug: 'ephemerists', score: 5000 })]

  it("draws its mark in the lane's own hue", () => {
    expect(markFills(mobile(LEADING_KITE), 'ephemerists')).toContain(factionCssVar('ephemerists'))
  })

  it('draws no lane mark in the page ink', () => {
    expect(markFills(mobile(LEADING_KITE), 'ephemerists')).not.toContain('currentColor')
  })
})

describe("the roster's faction column", () => {
  it("draws the row's faction in that faction's hue", () => {
    // The lane draws snide anyway, so the count must move.
    const ink = `fill="${factionCssVar('snide')}"`
    const empty = occurrences(desktop(), ink)
    const withRow = occurrences(desktop([player({ id: 77, faction_slug: 'snide', score: 10 })]), ink)
    expect(withRow).toBe(empty + 1)
  })
})

/** Asserted at the mark only: the albescent lane's bar legitimately uses the
 *  grey (#2409). */
describe('the two slugs that own a spectrum keep it', () => {
  it('leaves the unaffiliated ring unpainted — `na` is not a flat grey', () => {
    const html = desktop([player({ id: 78, faction_slug: 'na', score: 10 })])
    // The quoted bare token, not the `--faction-default-*` family.
    expect(html, 'the flat grey never reaches a mark').not.toContain(
      `fill="${factionCssVar('na')}"`,
    )
  })

  it('leaves the labyrinth on the conic it is painted with', () => {
    // The mark is a masked span, so its ink is a `background` on the stencil.
    const html = desktop([player({ id: 79, faction_slug: ALBESCENT_FACTION_SLUG, score: 10 })])
    const stencil = [...html.matchAll(/<span[^>]*>/g)]
      .map((match) => match[0])
      .filter((tag) => tag.includes('labyrinth.svg'))
    expect(stencil.length, 'the labyrinth is drawn on this page').toBeGreaterThan(0)
    for (const tag of stencil) {
      expect(tag).toContain('background:var(--faction-default-rainbow-conic)')
    }
  })
})
