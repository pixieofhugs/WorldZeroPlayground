/**
 * #1560 — the roster is only shown when it has a choice to offer.
 *
 * Owner ruling: a second life must not be advertised before the era's gate
 * opens. The padlocked "A second self awaits" dossier is deleted, and so is the
 * chrome that announced the same thing in prose — the heading that presumes a
 * choice, the "N life in play" chip, and the closing line offering to "cut a new
 * pair from whole cloth".
 *
 * TWO HALVES, BECAUSE THE HARNESS ONLY REACHES ONE OF THEM
 * --------------------------------------------------------
 * `renderToStaticMarkup` never runs effects, so `getMyCharacters` never resolves
 * and the rendered cases are all "roster still loading" — which is exactly the
 * state that must not flash a heading it is about to take away, so it is worth
 * pinning. The loaded cases (two lives, a shut gate) cannot be rendered at all
 * here, so `rosterOffersAChoice` / `rosterFooterKey` are exported and asserted
 * directly. A page that hides the create-your-first-life path renders perfectly
 * and dead-ends signup.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser, CharacterOut } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  user: null as CurrentUser | null,
}))

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, refetch: async () => {}, signOut: async () => {} }),
}))
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    loading: false,
    refetch: () => {},
  }),
}))
vi.mock('../../../hooks/useVotesReceived', () => ({
  useVotesReceived: () => ({ votesReceived: 0, loading: false }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => {},
}))
vi.mock('../../../api/tasks', () => ({ listTasks: async () => [] }))
vi.mock('../../../api/praxis', () => ({ listPraxes: async () => [], createPraxis: async () => ({ id: 1 }) }))

// Imported after the mocks are registered.
import FieldDesk, { rosterFooterKey } from '../../FieldDesk'
// Moved out of the page in #2111 so the rail and the eight mobile skins can ask
// the same question without importing it.
import { rosterOffersAChoice } from '../../../hooks/useRosterChoice'

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

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character: life(),
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: true,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    albescent_level_required: 8,
    second_character_level_required: 4,
    era_name: 'Era 1',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
    ...overrides,
  }
}

function renderRaw(user: CurrentUser | null): string {
  mocks.user = user
  return renderToStaticMarkup(
    <MemoryRouter>
      <FieldDesk />
    </MemoryRouter>,
  )
}

function render(user: CurrentUser | null): string {
  return renderRaw(user).replace(/<[^>]*>/g, '')
}

/** The text of every `<h1>` the page drew, in document order. */
function h1s(html: string): string[] {
  return [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].map((m) => m[1].replace(/<[^>]*>/g, '').trim())
}

describe('a life before the gate is told nothing about a second one (#1560)', () => {
  it('says none of the four things that advertised it', () => {
    const body = render(currentUser())
    // The padlocked dossier itself…
    expect(body).not.toContain('A second self awaits')
    expect(body).not.toContain('Reach Lvl')
    expect(body).not.toContain('levels to go')
    // …and the three places the page said it anyway.
    expect(body).not.toContain('Whose shoes today?')
    expect(body).not.toContain('life in play')
    expect(body).not.toContain('cut a new pair from whole cloth')
    // Nor the open slot, which is not the viewer's to take yet.
    expect(body).not.toContain('Begin a new self')
  })

  it('still answers "what do I do now?" — the gate hides the roster, not the page', () => {
    const body = render(currentUser())
    expect(body).toContain('Tasks you can sign up for')
  })
})

describe('the roster is shown whenever it has a choice to offer (#1560)', () => {
  it('shows it once the gate has opened', () => {
    const body = render(currentUser({ can_create_additional_character: true }))
    expect(body).toContain('Whose shoes today?')
  })

  it('shows it to an account carrying no life at all, so signup cannot dead-end', () => {
    // The roster IS the create-your-first-life path: gate it away here and a
    // brand-new account has no way to make anyone.
    const body = render(currentUser({ character: null }))
    expect(body).toContain('Nothing in the drawer yet.')
    expect(body).not.toContain('Whose shoes today?')
  })
})

describe('the page keeps its level-1 heading whatever the gate does (#1794)', () => {
  // The <h1> used to live INSIDE the roster block, so the commonest state of
  // all — one life, gate shut — served `/` with an outline starting at level 2.
  it('names the carried life when the roster is gated away', () => {
    const heads = h1s(renderRaw(currentUser()))
    expect(heads).toEqual(['Mollusk'])
  })

  it('falls back to the handle rather than an empty heading', () => {
    const heads = h1s(renderRaw(currentUser({ character: life({ display_name: '' }) })))
    expect(heads).toEqual(['@molly'])
  })

  it('still asks whose shoes once the gate opens', () => {
    const heads = h1s(renderRaw(currentUser({ can_create_additional_character: true })))
    expect(heads).toEqual(['Whose shoes today?'])
  })

  it('still has exactly one for an account playing nobody', () => {
    const heads = h1s(renderRaw(currentUser({ character: null })))
    expect(heads).toEqual(['Nothing in the drawer yet.'])
  })
})

describe("the title's rule is as wide as the title (#3097)", () => {
  // SEAM: the rendered markup. This harness has no layout, so "the edges align"
  // is not a question it can ask; what it can ask is whether the declarations
  // that make them align are there — the rule is the <h1>'s next sibling inside
  // a box that shrinks to the <h1>, and the rule names no width of its own.
  // Captures: the box's style, the <h1>'s attributes, the rule's attributes.
  const titleBlock = (html: string) =>
    /<div style="([^"]*)"><h1\b([^>]*)>[^<]*<\/h1><div\b([^>]*)><\/div><\/div>/.exec(html)

  it.each([
    ['a character name', currentUser({ character: life({ display_name: 'Pi' }) })],
    ['the roster heading', currentUser({ can_create_additional_character: true })],
    ['no character', currentUser({ character: null })],
  ])('shares a shrink-to-fit box with the heading for %s', (_label, user) => {
    const [, box, , rule] = titleBlock(renderRaw(user)) ?? []
    expect(box, "the rule is not the heading's next sibling in a box").toBeDefined()
    expect(box).toContain('width:fit-content')
    expect(rule).toContain('--faction-default-total-rainbow')
    expect(rule).toContain('height:4px')
    expect(rule, 'a fixed width cannot follow the text').not.toMatch(/[";]width:/)
    expect(rule, 'the rule is ornament').toContain('aria-hidden="true"')
  })

  it('keeps an unbroken 50-character name inside the column', () => {
    // A `display_name` may be 50 characters with no space. `fit-content` then
    // resolves to the word's own width, wider than a phone — unless the box is
    // capped at the column and the heading is allowed to break.
    const user = currentUser({ character: life({ display_name: 'X'.repeat(50) }) })
    const [, box, heading] = titleBlock(renderRaw(user)) ?? []
    expect(box).toContain('max-width:100%')
    expect(heading).toContain('overflow-wrap:anywhere')
  })
})

describe('rosterOffersAChoice', () => {
  it('waits on the fetch rather than flash a heading it will take away', () => {
    // `null` = roster still in flight. A carried life + a shut gate is the
    // concealed case, and it is the ONLY one that has to guess.
    expect(rosterOffersAChoice(null, true, false)).toBe(false)
    expect(rosterOffersAChoice(null, true, true)).toBe(true)
    expect(rosterOffersAChoice(null, false, false)).toBe(true)
  })

  it('always offers the roster to an account playing nobody', () => {
    expect(rosterOffersAChoice([], false, false)).toBe(true)
    // Even if a row comes back that the server will not carry (a banned life):
    // the account still has no one to play, and no other way to make someone.
    expect(rosterOffersAChoice([life()], false, false)).toBe(true)
  })

  it('hides it for exactly one life and no way to make another', () => {
    expect(rosterOffersAChoice([life()], true, false)).toBe(false)
    expect(rosterOffersAChoice([life()], true, true)).toBe(true)
  })

  it('shows it for more than one life whatever the gate says', () => {
    // Reachable: an era reset drops every level, so an account that already
    // carries two lives can sit behind a shut gate. It still needs the chooser.
    expect(rosterOffersAChoice([life({ id: 1 }), life({ id: 2 })], true, false)).toBe(true)
  })
})

describe('rosterFooterKey', () => {
  it('keeps both halves only when both are true', () => {
    expect(rosterFooterKey(1, true)).toBe('fieldDesk.footer')
    expect(rosterFooterKey(2, true)).toBe('fieldDesk.footer')
  })

  it('drops the new pair when the gate is shut', () => {
    expect(rosterFooterKey(2, false)).toBe('fieldDesk.footerNoNewSelf')
  })

  it('drops the old pair when there is nothing to lace up', () => {
    expect(rosterFooterKey(0, false)).toBe('fieldDesk.footerFirstLife')
    expect(rosterFooterKey(0, true)).toBe('fieldDesk.footerFirstLife')
  })
})
