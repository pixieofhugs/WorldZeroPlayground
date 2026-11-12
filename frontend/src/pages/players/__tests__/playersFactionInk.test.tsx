/**
 * The Players page paints no faction spine hue as TEXT (#1932): the `color`
 * declarations both surfaces render, against the page's two neutral grounds.
 *
 * `factionContrast.test.ts` measures tokens against their declared surface, and
 * `local/no-global-ink-on-faction-surface` is scoped to faction sheets, so
 * neither saw a faction ink on neutral chrome. `local/no-faction-hue-as-ink`
 * (#2077) now catches most sites, but not `--gem-ink` passed via `LevelGem`'s
 * props, so this render-level check stays. Shared helpers: `inkSeam.ts`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { fillUses, inkOffenders } from '../../../utils/__tests__/inkSeam'
import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' as const, toggle: () => {} }),
}))

import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import { NO_RELATIONSHIPS, rankPlayers, type PlayersViewProps } from '../playersData'
import { readIndexCss } from '../../../test/indexCss'

// The two grounds, from index.css: `--color-bg-page`, and `--color-bg-surface`
// (alpha, so composited over the page, #1413) for the viewer's own row. That
// composite is the layer missed before (#1715, #1579).
const THEMES = readThemes(readIndexCss())

function token(name: string, theme: Theme): Rgba {
  const raw = resolveVar(name, theme, THEMES)
  if (raw === null) throw new Error(`${name} does not resolve under ${theme}`)
  const colour = parseColor(raw)
  if (colour === null) throw new Error(`${name} resolves to an unparseable ${raw}`)
  return colour
}

function grounds(theme: Theme): { page: Rgba; frost: Rgba } {
  const page = token('--color-bg-page', theme)
  return { page, frost: compositeOver(token('--color-bg-surface', theme), page) }
}

/** The seven spine hues, in the order `factionCssVar` can hand them out. */
const SPINE_KEYS = ['ua', 'everymen', 'wow', 'snide', 'ephemerists', 'singularity', 'coven'] as const

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
    level: 5,
    score: 100,
    all_time_score: 100,
    faction_slug: 'wow',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

/** Puts the reported hues on the podium and roster, plus a `na` player, who
 *  must keep the spectrum (ADR-0039). */
const FIELD: CharacterOut[] = [
  player({ id: 11, display_name: 'Pip', faction_slug: 'wow', score: 412 }),
  player({ id: 22, display_name: 'Ada', faction_slug: 'ua', score: 388 }),
  player({ id: 33, display_name: 'Nodefour', faction_slug: 'singularity', score: 341 }),
  player({ id: 44, display_name: 'Wren', faction_slug: 'na', score: 296 }),
  ...SPINE_KEYS.map((slug, index) =>
    player({ id: 100 + index, display_name: `Filler ${index}`, faction_slug: slug, score: 200 - index }),
  ),
]

function props(overrides: Partial<PlayersViewProps> = {}): PlayersViewProps {
  return {
    ranked: rankPlayers(FIELD, 'era'),
    scoreMode: 'era',
    onScoreMode: () => {},
    eyebrow: 'Renaissance · The Standings',
    // Their own row wears the frost, the tighter ground.
    myCharId: 11,
    related: NO_RELATIONSHIPS,
    latest: { 11: { taskTitle: 'Left a poem in a library book', submittedAt: '2026-01-01T00:00:00Z' } },
    ...overrides,
  }
}

describe('the Players surfaces paint no faction hue as text', () => {
  for (const [surface, element] of [
    ['desktop', <DesktopPlayers {...props()} />],
    ['mobile', <MobilePlayers {...props()} />],
  ] as const) {
    it(`${surface}: no inline ink resolves to a faction spine hue`, () => {
      expect(inkOffenders(render(element))).toEqual([])
    })

    it(`${surface}: the hue still dresses the fills, rules and marks`, () => {
      // The page stays faction-coded: fills, rules and marks keep the hue.
      expect(fillUses(render(element)).length).toBeGreaterThan(0)
    })
  }
})

describe('why the hue cannot be the ink here, measured', () => {
  it('four of the seven spine hues are illegible as text on this page in light', () => {
    const { page, frost } = grounds('light')
    const measured = Object.fromEntries(
      SPINE_KEYS.map((key) => {
        const hue = token(`--faction-${key}`, 'light')
        return [key, { page: contrastRatio(hue, page), frost: contrastRatio(hue, frost) }]
      }),
    )

    // Since #2068 the large miss is Ephemerists' brass: clearing 4.5:1 on the
    // frost needs luminance <= 0.1776 and it sits at 0.3877, so it is never ink.
    expect(measured.ephemerists.page).toBeLessThan(AA_NORMAL)
    expect(measured.ephemerists.frost).toBeLessThan(AA_NORMAL)

    // WOW clears now (plum, #2068); the rule is about the slot, not the faction.
    expect(measured.wow.page).toBeGreaterThanOrEqual(AA_NORMAL)
    expect(measured.wow.frost).toBeGreaterThanOrEqual(AA_NORMAL)

    // UA's near miss (4.46:1) is the ground; no per-faction ink tier is minted
    // for it (2026-08-14 owner ruling, see factionContrast.test.ts).
    expect(measured.ua.page).toBeLessThan(AA_NORMAL)

    for (const key of ['everymen', 'singularity'] as const) {
      expect(measured[key].page).toBeGreaterThanOrEqual(AA_NORMAL)
    }
    // Snide and coven also fail; recorded so no "exempt the passing factions"
    // argument can stand.
    expect(measured.snide.page).toBeLessThan(AA_NORMAL)
    expect(measured.coven.page).toBeLessThan(AA_NORMAL)
  })

  it('the inks it paints instead clear AA on both grounds, in both themes', () => {
    for (const theme of ['light', 'dark'] as Theme[]) {
      const { page, frost } = grounds(theme)
      // `--label-ink` is `--color-text-tertiary` here; the rank numeral inherits
      // `--color-text-primary`.
      for (const ink of ['--color-text-tertiary', '--color-text-primary']) {
        const colour = token(ink, theme)
        expect(contrastRatio(colour, page)).toBeGreaterThanOrEqual(AA_NORMAL)
        expect(contrastRatio(colour, frost)).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    }
  })
})
