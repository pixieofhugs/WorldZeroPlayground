/**
 * #2552 — the desktop home's player cards carry an edit door (owner ruling).
 * Seam: one exported `RosterLifeCard`, since SSR never resolves the roster.
 * Ownership is structural (`getMyCharacters()`), so it isn't asserted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { RosterLifeCard } from '../../FieldDesk'

function life(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 42,
    username: 'molly',
    display_name: 'Mollusk',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 2,
    score: 120,
    all_time_score: 120,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function render(overrides: Partial<CharacterOut> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RosterLifeCard life={life(overrides)} rotation={0} switching={false} onEnter={() => {}} />
    </MemoryRouter>,
  )
}

/** Every `/characters/:id/edit` href in the markup, in document order. */
function editHrefs(html: string): string[] {
  return [...html.matchAll(/href="(\/characters\/\d+\/edit)"/g)].map((m) => m[1])
}

describe('a desktop roster card leads to its own edit page (#2552)', () => {
  it('draws exactly one edit link, pointing at that life', () => {
    expect(editHrefs(render())).toEqual(['/characters/42/edit'])
    expect(editHrefs(render({ id: 7 }))).toEqual(['/characters/7/edit'])
  })

  it('wears the string the rail and all nine phone desks already wear', () => {
    // No new copy (ADR-0032).
    expect(i18n.t('common:sidebar.characterCard.edit'), 'guard: key resolves').toBe('Edit')
    expect(render()).toContain(i18n.t('common:sidebar.characterCard.edit'))
  })

  it('navigates with a link, not a button', () => {
    // Must be a sibling of the card's button: an anchor inside a button is
    // invalid DOM the browser re-parents.
    const html = render()
    expect(html).toMatch(/<a\b[^>]*href="\/characters\/42\/edit"/)
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/)
  })

  it('still steps into the life when the card itself is pressed', () => {
    const html = render()
    expect(html).toContain('class="fielddesk-life"')
    expect(html).toContain(i18n.t('common:fieldDesk.stepInto', { name: 'Mollusk' }))
  })
})
