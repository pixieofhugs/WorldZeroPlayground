/**
 * `FactionProfileBody` × `useFormFactor()` (#1319, #2996): one responsive
 * component per faction (ADR-0056 / ADR-0067); a phone reaches the faction's OWN
 * dress — `ProfileSkin` restacked with a Praxis/Tasks switch.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import '../../../i18n'
import i18n from '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'
import { SURFACE_KEYS } from '../../../factions/manifest'

function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
    invitations: [],
    ...overrides,
  }
}

function makePraxis(): PraxisCardOut {
  return {
    id: 101,
    task_id: 5,
    task_title: 'Map a hidden gap',
    task_point_value: 20,
    task_level_required: 2,
    type: 'solo',
    status: 'submitted',
    title: 'A quiet finding',
    moderation_status: 'visible',
    created_by_id: 7,
    created_by_display_name: 'Reza',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    submitted_at: '2026-01-02T00:00:00Z',
    member_count: 1,
    score: 32,
    voter_count: 3,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 12,
    habit_bonus_points: 0,
    is_top_for_task: false,
    task_faction_slug: 'ephemerists',
    applied_metatasks: [],
    body_text: null,
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    duel_id: null,
    media_items: [],
    members: [],
    opponent_display_name: null,
    opponent_faction_slug: null,
    opponent_avatar_url: '',
    opponent_praxis_id: null,
    submit_proposed_at: null,
    viewer_can_vote: true,
    viewer_vote: null,
    voted_by_name: null,
  }
}

function makeTask(): TaskOut {
  return {
    id: 55,
    title: 'Plant a tree',
    description: 'Dig a hole and plant a native sapling.',
    point_value: 20,
    level_required: 2,
    status: 'active',
    task_type: 'standard',
    created_by: 7,
    primary_faction_slug: 'ephemerists',
    metatask_faction_slug: null,
    created_at: '2026-01-01T00:00:00Z',
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    submitted_praxis_id: null,
    can_sign_up: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
    start_here: false,
    viewer_faction_multiplier: 1,
  }
}

function renderBody(
  overrides: Partial<CharacterOut> = {},
  content: Partial<Pick<ProfileBodyProps, 'submissions' | 'proposedTasks'>> = {},
): string {
  const props: ProfileBodyProps = {
    character: makeCharacter(overrides),
    submissions: content.submissions ?? [],
    proposedTasks: content.proposedTasks ?? [],
    progression: {
      nextLevel: 8,
      currentThreshold: 1500,
      nextThreshold: 2000,
      pointsIntoLevel: 380,
      levelSpan: 500,
      progressPercent: 76,
    },
    identityActions: <div>Friend</div>,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe('the profile surface is one responsive component per faction', () => {
  it('no longer advertises a mobileProfile surface', () => {
    expect(SURFACE_KEYS).not.toContain('mobileProfile')
  })
})

describe('na profile serves both form factors from DefaultProfileBody', () => {
  it('reaches its own dress on a phone, through one renderer', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody({ faction_slug: 'na' })
    // The na kit's own spectrum band, at 375px.
    expect(html, 'the na spectrum band').toContain('class="spectrum-rule"')
    expect(html, 'the phone toggle').toContain('aria-pressed')
  })

  // The #459 contract slots on a phone (#517/#969).
  it('still renders every #459 contract slot on a phone', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody(
      {},
      { submissions: [makePraxis()], proposedTasks: [makeTask()] },
    )
    const text = html.replace(/<[^>]*>/g, '')
    expect(text, 'name (credential)').toContain('Reza')
    expect(text, 'progression next-level label').toContain('next · lvl 8')
    expect(text, 'progression points-into-level').toContain('380 / 500 pts this level')
    expect(text, 'badge').toContain('Sock Puppet')
    expect(text, 'friend/foe control').toContain('Friend')
    // Praxis is the default segment.
    expect(text, 'praxis card').toContain('Map a hidden gap')
    expect(text, 'tasks tab present').toContain('Tasks')
  })

  it('still renders the desktop body on a wide viewport', () => {
    const html = renderBody({ faction_slug: 'na' })
    // The laptop has the section heading; the phone swaps it for the toggle.
    expect(html, 'desktop na copy').toContain(i18n.t('common:profile.proposedTasksHeading'))
    expect(html, 'no phone toggle on a laptop').not.toContain('aria-pressed')
  })
})

describe('wow profile serves both form factors from WowProfileBody', () => {
  // The pavilion is retired (#2996): both widths reach the same crested dress.
  it.each(['desktop', 'mobile'] as const)(
    'reaches the crested page at %s width, and no second skin',
    (formFactor) => {
      mocks.formFactor = formFactor
      const html = renderBody({ faction_slug: 'wow' })
      // The gilt rope ring; the heading is the shared 'Badges' (#1909).
      expect(html, 'the crested page').toContain('--faction-wow-avatar-ring')
      expect(html, 'the kit heading').toContain('Badges')
      // Any of the pavilion's three marks back means the skin is back.
      expect(html, 'the pavilion page').not.toContain('data-skin="wow"')
      expect(html, 'the pavilion header wash').not.toContain('--faction-wow-avatar-field')
      expect(html, 'the level track the tally replaced').toContain('380 / 500 pts this level')
    },
  )
})

describe('a faction with no mobile twin reaches its OWN skin on a phone', () => {
  it('renders the Coven body, not the na spectrum one', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody({ faction_slug: 'coven' })
    expect(html).not.toContain('data-testid="mobile-profile"')
    expect(html, 'coven kit copy').toContain('Coven')
  })

  // Fixed-px columns that can't fit 375px beside the 266px card.
  it.each(['coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua'])(
    'drops the fixed-px badge rail and identity floor for %s',
    (slug) => {
      mocks.formFactor = 'mobile'
      const html = renderBody({ faction_slug: slug })
      expect(html, 'badge rail stacks').not.toContain('minmax(0, 1fr) 300px')
      expect(html, 'identity column stacks').not.toContain('min-width:300px')
    },
  )

  it('keeps both fixed columns on a laptop', () => {
    const html = renderBody({ faction_slug: 'coven' })
    expect(html).toContain('minmax(0, 1fr) 300px')
    expect(html).toContain('min-width:300px')
  })
})
