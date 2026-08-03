/**
 * Mobile faction-page + directory dispatch invariant — the faction twin of the
 * task-browse mobileArchetypeSlots test. Walks FactionDetail's
 * surfaceMap('mobileFactionPage') plus the Default mobile faction-page skin and asserts
 * each emits the invariant slots (colour-washed hero name + tagline, real
 * member/task stats, top members, recent praxis) and honours the invite-gated
 * Join model. Also proves Factions' directory registry falls through to the
 * Default directory skin (banner + heading). Both registries are empty today, so
 * this mainly guards the Default fallbacks and any bespoke skin added later.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { surfaceMap } from '../../../factions'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import DefaultFactionsDirectory from '../../factions/mobileArchetypes/DefaultFactionsDirectory'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import type { PraxisCardOut } from '../../../api/praxis'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const MEMBER: CharacterOut = {
  id: 7,
  username: 'ada',
  display_name: 'Ada',
  bio: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 120,
  all_time_score: 340,
  faction_slug: 'everymen',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const PRAXIS: PraxisCardOut = {
  id: 55,
  task_id: 11,
  task_title: 'Plant a tree',
  task_point_value: 20,
  task_level_required: 2,
  type: 'solo',
  status: 'submitted',
  title: 'My sapling',
  moderation_status: 'visible',
  created_by_id: 7,
  created_by_display_name: 'Ada',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  submitted_at: '2026-01-02T00:00:00Z',
  member_count: 1,
  score: 24,
  voter_count: 3,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  is_top_for_task: false,
  task_faction_slug: 'everymen',
  applied_metatasks: [],
  body_text: null,
  created_by_avatar_url: '',
  created_by_faction_slug: null,
  duel_id: null,
  media_items: [],
  members: [],
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_praxis_id: null,
  submit_proposed_at: null,
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
}

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    state: 'eligible',
    currentFactionSlug: null,
    join: async () => {},
    joining: false,
    joinError: null,
    ...overrides,
  }
}

function baseState(overrides: Partial<FactionDetailState> = {}): FactionDetailState {
  return {
    slug: 'everymen',
    loading: false,
    faction: { slug: 'everymen' },
    fetchError: null,
    members: [MEMBER],
    tasks: [],
    recentPraxis: [PRAXIS],
    viewerFactionSlug: null,
    gameFactions: [],
    membership: membership(),
    ...overrides,
  }
}

const archetypes = { ...surfaceMap('mobileFactionPage'), __default__: DefaultFactionPage }

describe('mobile faction-page content-slot invariant', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders hero name, tagline, real stats + entities`, () => {
      const { text } = render(<Archetype state={baseState()} />)
      expect(text, 'hero name').toContain('Everymen')
      expect(text.toLowerCase(), 'members stat').toContain('members')
      expect(text.toLowerCase(), 'tasks stat').toContain('tasks')
      expect(text, 'top member').toContain('Ada')
      expect(text, 'recent praxis').toContain('Plant a tree')
    })

    it(`${slug} offers Join only to an eligible viewer (invite-gated)`, () => {
      const eligible = render(<Archetype state={baseState({ membership: membership({ state: 'eligible' }) })} />)
      expect(eligible.text).toContain('Join Everymen')

      const gated = render(<Archetype state={baseState({ membership: membership({ state: 'gate' }) })} />)
      expect(gated.text, 'no CTA for gated viewer').not.toContain('Join Everymen')

      const memberView = render(<Archetype state={baseState({ membership: membership({ state: 'member' }) })} />)
      // renderToStaticMarkup escapes the apostrophe, so match the plain tail.
      expect(memberView.text, 'member badge').toContain('re a member')
      expect(memberView.text, 'no CTA for member').not.toContain('Join Everymen')
    })

    it(`${slug} tells a burned viewer the era is closed, not to keep tasking`, () => {
      // "burned" = left this faction this era; the join is refused for the rest
      // of it (#1305). The soft "keep completing tasks" gate is the RIGHT
      // message for the not-yet-invited viewer (#454) and a lie here.
      const burned = render(<Archetype state={baseState({ membership: membership({ state: 'burned' }) })} />)
      expect(burned.text, 'no soft gate for a burned viewer').not.toContain('Keep completing tasks')
      expect(burned.text, 'no CTA for a burned viewer').not.toContain('Join Everymen')
      // UA is graduation-gated: the hook resolves it to "none" before any
      // status is read (#200/#243), so it must not grow a burned notice.
      if (slug === 'ua') {
        expect(burned.text, 'UA never burns').not.toContain('next era begins')
      } else {
        expect(burned.text, 'era notice').toContain('next era begins')
      }
    })
  }
})

describe('mobile faction directory', () => {
  // The `mobileFactionsDirectory` slot is gone: no faction ever registered one,
  // so Factions renders `DefaultFactionsDirectory` on mobile with no dispatch.
  it('Default directory skin renders the heading + unaffiliated banner', () => {
    // The directory fetch lives in the page dispatcher now (#1116), so the skin
    // takes the same still-loading state it used to produce for itself.
    const { text } = render(
      <DefaultFactionsDirectory
        state={{ factions: [], factionPage: null, invitations: [], loading: true, error: null }}
      />,
    )
    expect(text).toContain('Factions')
    expect(text).toContain('Unaffiliated')
  })
})
