/**
 * The seam: the Coven profile's identity band — `CovenProfileBody`'s
 * `headerStyle` as `ProfileSkin` renders it — and the two framed panels that
 * sit inside it, the shared `CredentialCard` and the progression panel (#2131).
 *
 * §5's rule: A BORDERED PANEL MAY NOT SIT DIRECTLY INSIDE ANOTHER BORDERED
 * PANEL. Coven was the loud case because both edges are the same pink token:
 * the band drew `2px solid --faction-coven-slip-border`, the credential card
 * inside it drew `2px solid --faction-coven-card-accent`, and the progression
 * panel beside the card drew `1.5px solid --faction-coven-slip-border` again —
 * three concentric frames in one ink, which is what the report's screenshot is.
 *
 * Which one gives way is decided here and pinned here: the CARD keeps its
 * frame, because it is the object being looked at and it renders framed on the
 * FieldDesk roster and the creation preview too. The BAND drops to its ground
 * — it already carries `--faction-coven-ward-card` and a radius, so it still
 * reads as a panel with no edge on it.
 *
 * This reads the rendered markup rather than the kit object, because the kit is
 * not exported and because the band's style is a merge of `headerStyle` with
 * `ProfileSkin`'s own positioning — the merge is the thing that ships.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

function renderProfile(factionSlug: string): string {
  const character: CharacterOut = {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 200,
    all_time_score: 200,
    faction_slug: factionSlug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
  }
  const props: ProfileBodyProps = {
    character,
    submissions: [],
    proposedTasks: [],
    progression: {
      nextLevel: 4,
      currentThreshold: 150,
      nextThreshold: 300,
      pointsIntoLevel: 50,
      levelSpan: 150,
      progressPercent: 33,
    },
    identityActions: null,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
}

/** The identity band is the one `<header>` in a profile body's markup. */
function bandStyle(html: string): string {
  const match = html.match(/<header[^>]*style="([^"]*)"/)
  if (!match) throw new Error('no identity band in the rendered profile')
  return match[1]
}

/**
 * A frame is the `border` shorthand or any of its sides — NOT `border-radius`,
 * which is a shape, and not a single-side rule, which is §5's permitted
 * hairline divider. Only the shorthand draws the four-sided edge the rule is
 * about.
 */
function drawsAFrame(style: string): boolean {
  return style
    .split(';')
    .some((decl) => decl.trim().toLowerCase().startsWith('border:'))
}

describe('the Coven identity band is not itself framed (#2131)', () => {
  it('the band draws a ground, a radius and no edge', () => {
    const style = bandStyle(renderProfile('coven'))
    expect(drawsAFrame(style), `the band still draws a frame: ${style}`).toBe(false)
    // It is still a panel: the ward card stock and its radius stay.
    expect(style).toContain('--faction-coven-ward-card')
    expect(style).toContain('border-radius')
  })

  it('the credential card inside it keeps its own frame', () => {
    // The card is the object being looked at, and it is framed on every other
    // surface it renders on.
    expect(renderProfile('coven')).toContain(
      'border:2px solid var(--faction-coven-card-accent)',
    )
  })

  it('the progression panel inside it keeps its own frame', () => {
    // Legal once the band has no edge: a framed panel on an unframed ground.
    expect(renderProfile('coven')).toContain(
      'border:1.5px solid var(--faction-coven-slip-border)',
    )
  })
})
