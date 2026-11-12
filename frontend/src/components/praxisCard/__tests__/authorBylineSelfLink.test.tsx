/**
 * #2125 — the byline's author name must not link to the page you're on. Every
 * card composes `PraxisByline`, so it's the one seam; cases vary the route only.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { PraxisByline } from '../shared'

const AUTHOR_ID = 7

function praxis(overrides: Partial<PraxisCardOut> = {}): PraxisCardOut {
  return {
    id: 1,
    created_by_id: AUTHOR_ID,
    created_by_display_name: 'Isolde',
    created_by_faction_slug: 'ua',
    created_by_avatar_url: '',
    task_faction_slug: 'ua',
    task_level_required: 0,
    task_point_value: 5,
    member_count: 1,
    score: 12.5,
    voter_count: 3,
    applied_metatasks: [],
    ...overrides,
  } as PraxisCardOut
}

const at = (path: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <PraxisByline praxis={praxis()} />
    </MemoryRouter>,
  )

const text = (html: string) => html.replace(/<[^>]*>/g, '')

describe('the author byline does not link to the page you are on (#2125)', () => {
  it('is plain text on that author’s own character page', () => {
    const html = at(`/characters/${AUTHOR_ID}`)
    expect(text(html)).toContain('Isolde')
    // Not an anchor at all: a disabled link would still announce.
    expect(html).not.toContain('<a ')
    expect(html).not.toContain(`href="/characters/${AUTHOR_ID}"`)
  })

  it('still links on a DIFFERENT character’s page', () => {
    // Character-to-character, never account-to-account.
    const html = at('/characters/9')
    expect(html).toContain(`href="/characters/${AUTHOR_ID}"`)
  })

  it('still links where the id collides with a non-character route', () => {
    // Comparing bare `useParams` ids would wrongly kill the link on /praxis/7.
    const html = at(`/praxis/${AUTHOR_ID}`)
    expect(html).toContain(`href="/characters/${AUTHOR_ID}"`)
  })

  it('still links on every other surface', () => {
    expect(at('/praxis')).toContain(`href="/characters/${AUTHOR_ID}"`)
  })
})
