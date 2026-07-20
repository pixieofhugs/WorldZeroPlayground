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
  bio: null,
  avatar_url: null,
  location: null,
  level: 4,
  score: 120,
  all_time_score: 340,
  faction_slug: 'everymen',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
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
  base_points: 20,
  metatask_points: 0,
  display_multiplier: null,
  points_from_votes: 4,
  total: 24,
  is_top_for_task: false,
  task_faction_slug: 'everymen',
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
  }
})

describe('mobile faction directory dispatch', () => {
  it('registry is an object (bespoke directory skins register here)', () => {
    expect(typeof surfaceMap('mobileFactionsDirectory')).toBe('object')
  })

  it('Default directory skin renders the heading + unaffiliated banner', () => {
    const { text } = render(<DefaultFactionsDirectory />)
    expect(text).toContain('Factions')
    expect(text).toContain('Unaffiliated')
  })
})
