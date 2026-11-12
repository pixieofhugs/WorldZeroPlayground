/**
 * §5: no bordered panel directly inside another (#2131). On Coven the identity
 * band, credential card and progression panel were three frames in one ink. The
 * card keeps its frame (it's framed everywhere); the band drops to its ground.
 * Reads rendered markup: the band's style is a merge, and the merge ships.
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

/** The identity band is the one `<header>`. */
function bandStyle(html: string): string {
  const match = html.match(/<header[^>]*style="([^"]*)"/)
  if (!match) throw new Error('no identity band in the rendered profile')
  return match[1]
}

/** Only the `border:` shorthand: a single side is §5's permitted divider. */
function drawsAFrame(style: string): boolean {
  return style
    .split(';')
    .some((decl) => decl.trim().toLowerCase().startsWith('border:'))
}

describe('the Coven identity band is not itself framed (#2131)', () => {
  it('the band draws a ground, a radius and no edge', () => {
    const style = bandStyle(renderProfile('coven'))
    expect(drawsAFrame(style), `the band still draws a frame: ${style}`).toBe(false)
    expect(style).toContain('--faction-coven-ward-card')
    expect(style).toContain('border-radius')
  })

  it('the credential card inside it keeps its own frame', () => {
    expect(renderProfile('coven')).toContain(
      'border:2px solid var(--faction-coven-card-accent)',
    )
  })

  it('the progression panel inside it keeps its own frame', () => {
    expect(renderProfile('coven')).toContain(
      'border:1.5px solid var(--faction-coven-slip-border)',
    )
  })
})
