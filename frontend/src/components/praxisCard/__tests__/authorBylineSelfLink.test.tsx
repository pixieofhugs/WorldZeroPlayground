/**
 * #2125 — the praxis byline's author name must not be an anchor pointing at the
 * page the reader is already on.
 *
 * The seam is `PraxisByline` itself: every faction praxis card composes it
 * through `desktop/shared`'s `PraxisBody`, so this is the single place the
 * author name becomes a link. The condition is destination-vs-location, which
 * is why these cases vary only the router's current entry.
 *
 * SSR-rendered in isolation. No effects run, so these pin markup — which is the
 * whole point: the defect is that an `<a>` exists at all.
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
    // Not an anchor at all: removing it is what fixes the screen-reader
    // announcement. A disabled/pointer-events-none link would still announce.
    expect(html).not.toContain('<a ')
    expect(html).not.toContain(`href="/characters/${AUTHOR_ID}"`)
  })

  it('still links on a DIFFERENT character’s page', () => {
    // Constraint 1 of the ruling: character-to-character, never account-to-
    // account. A player viewing their own other character's page gets a link.
    const html = at('/characters/9')
    expect(html).toContain(`href="/characters/${AUTHOR_ID}"`)
  })

  it('still links where the id collides with a non-character route', () => {
    // Guards the lazy-but-wrong version of this fix: comparing bare ids from
    // `useParams` would silently kill the link on /praxis/7 too.
    const html = at(`/praxis/${AUTHOR_ID}`)
    expect(html).toContain(`href="/characters/${AUTHOR_ID}"`)
  })

  it('still links on every other surface', () => {
    expect(at('/praxis')).toContain(`href="/characters/${AUTHOR_ID}"`)
  })
})
