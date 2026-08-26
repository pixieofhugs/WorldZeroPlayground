/**
 * The Players page draws every faction mark in that faction's own hue (#2723).
 *
 * SEAM: the `fill` the mark itself is rendered with — `markFills`, not the
 * page's inline `style=` declarations. Both of this page's sigil mounts (the
 * race lane and the roster's faction column) passed `FactionSigil` no `color`,
 * so each mark fell through to whatever its own component defaults to.
 *
 * THAT IS TWO DEFECTS AND NOT THE ONE THE ISSUE DESCRIBES. Only the Ephemerists
 * kite defaults to `currentColor`, so only the kite took the page's text ink and
 * came out white after dark — the reported symptom. The other marks default to
 * an ink of their own, and three of those are theme-INVARIANT
 * (`--faction-snide-acid`, `--faction-wow-plum-surface`, and UA's ornament
 * glow), so they fail one cascade half instead of both. `factionCssVar(slug)`
 * answers both: it is the token the lane's own bar already reads and it carries
 * a light value and a dark one.
 *
 * WHY NEITHER SIBLING FILE SAW IT. `playersFactionInk.test.tsx` reads inline
 * `style=` declarations, and this ink is an ATTRIBUTE. `playersFactionLinks`
 * asks where the mark GOES. And the rendered geometry was never wrong — it is
 * the canonical mark on both mounts, only the ink was the page's.
 *
 * PROBED BY DIFFERENCE, like the two sidebar suites: one faction's mark drawn
 * in one faction's hue would also pass on a mount that had hardcoded that hue,
 * so two lanes are asserted in a single render and the roster is asserted by
 * the count MOVING when a player of that faction arrives.
 *
 * `na` AND `albescent` ARE THE HOLD-OUTS, and they are the half of this a
 * careless sweep breaks. Both resolve to CSS key `default`, and
 * `--faction-default` is a flat grey: handing it to them paints over the two
 * spectra they own — the unaffiliated rainbow (ADR-0039) and the labyrinth's
 * deliberate lack of any livery (#783). That is #2528's report, and the guard
 * against it is the same `isKnownFaction` the filter facet already uses.
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

/** Three podium-fillers, so anything added below lands in the ROSTER. */
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

describe('a race lane', () => {
  it("draws its mark in the lane's own hue, not the page ink", () => {
    // Every lane renders whatever the field holds (`factionStandings` seeds all
    // of RACE_LANES at zero), so both of these are lanes in ONE render — which
    // is what makes this an assertion about `lane.slug` and not about a hue
    // someone pinned to the row.
    const html = desktop()
    expect(markFills(html, 'ephemerists')).toContain(factionCssVar('ephemerists'))
    expect(markFills(html, 'snide')).toContain(factionCssVar('snide'))
  })

  it('draws no lane mark in the page ink', () => {
    // The defect itself, stated. `currentColor` on this neutral chrome IS the
    // page's text colour, which is why the kite came out white after dark.
    // Ephemerists is the mount that had it: the other seven marks each default
    // to an ink of their own inside their sigil component, which is why the
    // symptom was only ever reported against the kite.
    expect(markFills(desktop(), 'ephemerists')).not.toContain('currentColor')
  })

  it('is the same token the lane bar beside it reads', () => {
    // The mark and the bar are one colour, which is the ruling's own reason for
    // this token over `--faction-ephemerists-metal-gold`: that one is
    // theme-invariant and measures 1.69:1 on this page in light.
    const html = desktop()
    expect(html).toContain(`background:${factionCssVar('ephemerists')}`)
    expect(markFills(html, 'ephemerists')).toContain(factionCssVar('ephemerists'))
  })

  it('takes the lane off the marks that carry only ONE theme', () => {
    // The other half of the ruling, and the half the issue's own root cause
    // missed. S.N.I.D.E.'s mark defaulted to `--faction-snide-acid` — declared
    // once, #b6ff2e in both cascades — so the lane was a near-invisible acid on
    // the light page. `--faction-snide` is #6fae00 light / #b6ff2e dark: the
    // same green after dark, a legible one before it.
    expect(markFills(desktop(), 'snide')).not.toContain('var(--faction-snide-acid)')
  })
})

describe("the roster's faction column", () => {
  it("draws the row's faction in that faction's hue", () => {
    // The lane for `snide` is drawn either way, so presence proves nothing: the
    // count has to MOVE when a snide player joins the roster.
    const ink = `fill="${factionCssVar('snide')}"`
    const empty = occurrences(desktop(), ink)
    const withRow = occurrences(desktop([player({ id: 77, faction_slug: 'snide', score: 10 })]), ink)
    expect(withRow).toBe(empty + 1)
  })
})

/**
 * The grey is asserted at the MARK and nowhere else, because this page paints
 * it legitimately: the albescent lane's own BAR is `factionCssVar(lane.slug)`
 * and has been since that lane existed (#2409). A page-wide ban on the token
 * would fail on a bar that is working as designed.
 */
describe('the two slugs that own a spectrum keep it', () => {
  it('leaves the unaffiliated ring unpainted — `na` is not a flat grey', () => {
    const html = desktop([player({ id: 78, faction_slug: 'na', score: 10 })])
    // The bare token, never the suffixed family (`--faction-default-rainbow`,
    // `--faction-default-card-muted`): the closing paren is the line between
    // "this hue" and "this hue's ramp".
    expect(html, 'the flat grey never reaches a mark').not.toContain(
      `fill="${factionCssVar('na')}"`,
    )
  })

  it('leaves the labyrinth on the conic it is painted with', () => {
    // Albescent has a lane of its own since #2409, so it reaches this mount
    // whether or not a player wears it. Its mark is a masked span rather than
    // an svg, so the ink is a `background` declaration — read off the span that
    // carries the stencil, not off the page.
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
