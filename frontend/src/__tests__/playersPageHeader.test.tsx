/**
 * #1699 — the Players page wears the SHARED page header.
 *
 * Seam: the markup `DesktopLeaderboard` emits above the sky. It used to
 * hand-roll an `<h1>` that copied `PageTitle`'s classes but dropped the
 * per-letter rainbow underline (Style Guide §7, ADR-0066), then drew a second
 * full-width rainbow rule of its own. Asserted here as what a reader sees:
 * every letter of the title carries its own spectrum bar, the page draws that
 * rainbow ONCE, and the controls that shared the old header row survive.
 *
 * Rendered through `DesktopLeaderboard`, not `<Leaderboard/>`: the page wrapper
 * shows its Loading branch under `renderToStaticMarkup` (no effect resolves the
 * fetch), so an assertion against it would pass with nothing on screen.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../i18n'
import type { CharacterOut } from '../api/auth'
import { DesktopLeaderboard } from '../pages/Leaderboard'

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
    score: 320,
    all_time_score: 900,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

const PLAYERS: CharacterOut[] = [
  player({ id: 11, display_name: 'Perpetua', faction_slug: 'everymen', score: 2140 }),
  player({ id: 22, display_name: 'Reza', faction_slug: 'ephemerists', score: 1880 }),
  player({ id: 33, display_name: 'Molly', faction_slug: 'na', score: 340 }),
]

function board() {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DesktopLeaderboard characters={PLAYERS} loading={false} error={null} user={null} />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** The heading only — the sky below paints faction hues of its own. */
function headingHtml(html: string): string {
  const open = html.indexOf('<h1')
  expect(open, 'the page has a heading').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('</h1>', open))
}

describe('players page header (#1699)', () => {
  it('underlines the title letter by letter, like every other page', () => {
    const heading = headingHtml(board().html)
    for (let stop = 1; stop <= 7; stop++) {
      expect(heading, `letter ${stop} wears spectrum stop ${stop}`).toContain(
        `var(--faction-default-stop-${stop})`,
      )
    }
  })

  it('draws that rainbow once — no separate full-width rule', () => {
    const { html, text } = board()
    expect(text, 'the title still reads as a word').toContain('Players')
    expect(html, 'no second spectrum bar under the title').not.toContain(
      'linear-gradient(90deg, var(--faction-everymen)',
    )
  })

  it('keeps the score toggle and the counts line', () => {
    const { text } = board()
    expect(text, 'era toggle').toContain('Era')
    expect(text, 'all-time toggle').toContain('All-Time')
    expect(text, 'players count').toContain('3 adventurers')
    expect(text, 'factions count').toContain('3 factions')
  })
})
