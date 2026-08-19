/**
 * #2129 + #2132 — a player display name must not be an unbreakable token.
 *
 * THE SEAM is the *min-content contribution* of the element that prints a
 * display name, and it is one root cause with two reporters. Both issues were
 * filed as different bugs ("collaborator status pushed off the edge",
 * "embedded video overflows the page") and both reporters independently
 * guessed the same cause — "this may be because my name is long". They were
 * right, and the arithmetic in the two screenshots proves it: in each one the
 * overflowing box measures *exactly* its own min-content width.
 *
 * `white-space: nowrap` makes a string's min-content size equal its full
 * rendered width. `min-width: auto` — the initial value, and therefore the
 * value of every flex item nobody thought about — floors that item at its
 * content-based minimum size. So a long name does not overflow the box it is
 * in: it INFLATES every ancestor up to the first one carrying an explicit
 * bound, and the siblings dragged along with it are what the reporters saw.
 *   · #2129: the roster's own `min-width: 0` + ellipsis was already correct and
 *     bought nothing, because `controls.tsx` wraps the roster in a
 *     `flex: 1 1 100%` item whose `min-width` is `auto`. The row grew to
 *     min-content and the status pill went past the panel's clip.
 *   · #2132: same shape one page over — `profileSkin.tsx` wraps each praxis
 *     card in a bare `position: relative` flex item. The CARD grew past the
 *     viewport, so the media slot went with it and looked like the bug.
 *
 * Which is why this guard lives beside neither component. Bounding those two
 * ancestors would fix these two screenshots and nothing else; there is no
 * shared ancestor to fix, and no way to enumerate the ones not written yet.
 * The one thing both surfaces share is the *name*, so that is where the fix
 * goes: a name that may break anywhere has a min-content size of one
 * character, and then no ancestor can be inflated by it on any surface, now or
 * later.
 *
 * `overflow-wrap: anywhere` and NOT `break-word`. They render identically
 * here; they differ in exactly the property this bug is about — `anywhere`'s
 * break opportunities count towards intrinsic sizing and `break-word`'s do
 * not. A future simplification to `break-word` would repaint zero pixels and
 * restore both defects, so this asserts the value rather than the effect.
 *
 * SSR-rendered: the harness has no layout engine, so a width cannot be
 * measured here. These pin the declarations that decide it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import type { PraxisCardOut, PraxisMemberOut } from '../../api/praxis'
import { CollabRoster } from '../collab/CollabRoster'
import { PraxisByline } from '../praxisCard/shared'

/**
 * The reporter's name was 22 characters. The fix has to hold for anything a
 * player can type into the field, so the fixture is well past any plausible
 * container width and carries no space to break at.
 */
const LONG_NAME = `Hell${'o'.repeat(120)}`

/**
 * The style declarations on the element that prints `name` — i.e. the tag
 * immediately before the text node.
 */
function nameStyle(html: string, name: string): string {
  const at = html.indexOf(name)
  expect(at, 'the name renders at all').toBeGreaterThan(-1)
  const openTag = html.slice(0, at).lastIndexOf('<')
  return /style="([^"]*)"/.exec(html.slice(openTag, at))?.[1] ?? ''
}

/** Every surface asserts the same three things about the same one property. */
function expectBreakable(style: string) {
  // The declaration that puts min-content at one character.
  expect(style).toContain('overflow-wrap:anywhere')
  // Not `break-word`: identical paint, and it does NOT reduce min-content.
  expect(style).not.toContain('break-word')
  // And the declaration that would take min-content back to the whole string.
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
    // #2125 drops the `<a>` on the author's own character page, so the two
    // branches render different elements. The fix has to land on both — that
    // page is precisely where #2132 was reported.
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/characters/7']}>
        <PraxisByline praxis={praxis()} />
      </MemoryRouter>,
    )
    expect(html).not.toContain('<a ')
    expectBreakable(nameStyle(html, LONG_NAME))
  })
})
