/**
 * #2129 + #2132 — a display name must not be an unbreakable token. A nowrap
 * name's min-content inflates every `min-width: auto` flex ancestor, so the fix
 * is on the NAME, which every surface shares.
 *
 * `overflow-wrap: anywhere`, NOT `break-word`: identical paint, but only
 * `anywhere` reduces min-content. So this asserts the value, not the effect.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import type { PraxisCardOut, PraxisMemberOut } from '../../api/praxis'
import { CollabRoster } from '../collab/CollabRoster'
import { PraxisByline } from '../praxisCard/shared'

/** Wider than any container, with no space to break at. */
const LONG_NAME = `Hell${'o'.repeat(120)}`

/** Style of the tag immediately before the `name` text node. */
function nameStyle(html: string, name: string): string {
  const at = html.indexOf(name)
  expect(at, 'the name renders at all').toBeGreaterThan(-1)
  const openTag = html.slice(0, at).lastIndexOf('<')
  return /style="([^"]*)"/.exec(html.slice(openTag, at))?.[1] ?? ''
}

function expectBreakable(style: string) {
  expect(style).toContain('overflow-wrap:anywhere')
  expect(style).not.toContain('break-word')
  expect(style).not.toContain('white-space:nowrap')
}

function member(id: number, displayName: string): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: displayName,
    character_avatar_url: '',
    has_submitted: false,
    is_done: false,
    joined_at: '2026-01-01T00:00:00Z',
    nudged_at: null,
    submitted_at: null,
  }
}

function praxis(): PraxisCardOut {
  return {
    id: 1,
    created_by_id: 7,
    created_by_display_name: LONG_NAME,
    created_by_faction_slug: 'coven',
    created_by_avatar_url: '',
    task_faction_slug: 'snide',
    task_level_required: 0,
    task_point_value: 5,
    member_count: 1,
    score: 12.5,
    voter_count: 3,
    applied_metatasks: [],
  } as unknown as PraxisCardOut
}

describe('a long display name cannot inflate its container (#2129, #2132)', () => {
  it('the collab roster row lets the name break (#2129)', () => {
    const html = renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, LONG_NAME), member(2, 'Pixie')]}
        invites={[]}
        currentCharacterId={1}
        factionSlug="coven"
        taskPointValue={5}
      />,
    )
    expectBreakable(nameStyle(html, LONG_NAME))
  })

  it('the praxis-card byline lets the name break (#2132)', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/characters/3']}>
        <PraxisByline praxis={praxis()} />
      </MemoryRouter>,
    )
    expectBreakable(nameStyle(html, LONG_NAME))
  })

  it('the byline is still breakable when the name is plain text, not a link', () => {
    // The own-page branch has no `<a>` (#2125) and is where #2132 was reported.
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/characters/7']}>
        <PraxisByline praxis={praxis()} />
      </MemoryRouter>,
    )
    expect(html).not.toContain('<a ')
    expectBreakable(nameStyle(html, LONG_NAME))
  })
})
