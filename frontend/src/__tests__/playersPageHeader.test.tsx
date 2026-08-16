/**
 * #1699 — the Players page wears the SHARED page header. Re-pinned against the
 * rebuilt page (#1855), because the design it was rebuilt from draws a 140px
 * rainbow rule under the title, which is precisely the second spectrum bar
 * #1699 deleted. `PageTitle` brings the rainbow, per letter; the page draws it
 * once and no rule of its own.
 *
 * Seam: the markup `DesktopPlayers` emits above the podium. Rendered directly,
 * not through `<Leaderboard/>`: the page shows its Loading branch under
 * `renderToStaticMarkup` (no effect resolves the fetch), so an assertion
 * against it would pass with nothing on screen.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../i18n'
import type { CharacterOut } from '../api/auth'

vi.mock('../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggle: () => {} }),
}))

import DesktopPlayers from '../pages/players/DesktopPlayers'
import { NO_RELATIONSHIPS, rankPlayers } from '../pages/players/playersData'

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

const ERA_EYEBROW = 'Renaissance · The Standings'

function board() {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DesktopPlayers
        ranked={rankPlayers(PLAYERS, 'era')}
        scoreMode="era"
        onScoreMode={() => {}}
        eyebrow={ERA_EYEBROW}
        myCharId={null}
        related={NO_RELATIONSHIPS}
        latest={{}}
      />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** The heading only — the sections below paint faction hues of their own. */
function headingHtml(html: string): string {
  const open = html.indexOf('<h1')
  expect(open, 'the page has a heading').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('</h1>', open))
}

describe('players page header (#1699, rebuilt in #1855)', () => {
  it('underlines the title letter by letter, like every other page', () => {
    const heading = headingHtml(board().html)
    for (let stop = 1; stop <= 7; stop++) {
      expect(heading, `letter ${stop} wears spectrum stop ${stop}`).toContain(
        `var(--faction-default-stop-${stop})`,
      )
    }
  })

  it('draws that rainbow once — no separate rule under the title', () => {
    const { html, text } = board()
    expect(text, 'the title still reads as a word').toContain('Players')
    // The spectrum appears on the letters and on the ONE ornament that is not
    // a rule: your own roster row's left edge. A 140px bar under the title —
    // the design's, and this page's before #1699 — is not drawn.
    expect(html, 'no second spectrum bar under the title').not.toContain('width:140px')
  })

  it('names the live era in the eyebrow, never a literal', () => {
    // The page reads `era_name` off the game config; the header only states it.
    expect(board().text).toContain(ERA_EYEBROW)
  })

  it('keeps the score toggle beside the title', () => {
    const { text } = board()
    expect(text, 'era toggle').toContain('Era')
    expect(text, 'all-time toggle').toContain('All-Time')
  })
})
