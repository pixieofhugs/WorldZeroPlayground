/**
 * The seam: `FactionProfileBody` × `useFormFactor()` (#1319).
 *
 * Before this issue the character profile was TWO dispatches — a
 * `formFactor === 'mobile'` branch in `CharacterProfile.tsx` picking through a
 * `mobileProfile` manifest surface, and `FactionProfileBody` picking through
 * `profileBody` for desktop. The na and WOW mobile skins were reachable only
 * from the first branch, so `FactionProfileBody` itself rendered the desktop
 * markup on a phone.
 *
 * After the collapse (ADR-0056 / ADR-0067 shape) there is ONE responsive
 * component per faction and `FactionProfileBody` is the only dispatcher: a
 * phone-width viewport must reach the SAME two shipped mobile designs it always
 * did, through the `profileBody` surface. That is what this file pins — the
 * surface a caller uses, not the internals of either skin.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import '../../../i18n'
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
    bio: null,
    avatar_url: null,
    location: null,
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
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
    is_top_for_task: false,
    task_faction_slug: 'ephemerists',
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
    is_task_vision_eligible: false,
    created_at: '2026-01-01T00:00:00Z',
    can_submit_praxis: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
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
  it('reaches the shipped mobile skin on a phone', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody({ faction_slug: null })
    expect(html, 'the na mobile skin').toContain('data-testid="mobile-profile"')
  })

  // The content-slot invariant the retired `mobileArchetypes` test carried
  // (#517/#969), moved here whole rather than dropped with the file: the phone
  // skin renders the same #459 contract fields it always did.
  it('still renders every #459 contract slot on a phone', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody(
      {},
      { submissions: [makePraxis()], proposedTasks: [makeTask()] },
    )
    const text = html.replace(/<[^>]*>/g, '')
    expect(text, 'name (credential)').toContain('Reza')
    // #969: the mobile stats row was replaced by the redesign's progression
    // panel (level ring + points-into-level bar toward level+1).
    expect(text, 'progression next-level label').toContain('next · lvl 8')
    expect(text, 'progression points-into-level').toContain('380 / 500 pts this level')
    expect(text, 'badge').toContain('Sock Puppet')
    expect(text, 'friend/foe control').toContain('Friend')
    // Praxis is the default segment → the reused PraxisCard renders.
    expect(text, 'praxis card').toContain('Map a hidden gap')
    expect(text, 'tasks tab present').toContain('Tasks')
  })

  it('still renders the desktop body on a wide viewport', () => {
    const html = renderBody({ faction_slug: null })
    expect(html).not.toContain('data-testid="mobile-profile"')
    expect(html, 'desktop na copy').toContain('Unaffiliated · faction pending')
  })
})

describe('wow profile serves both form factors from WowProfileBody', () => {
  it('reaches the shipped WOW mobile skin on a phone, not the na one', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody({ faction_slug: 'wow' })
    expect(html, 'a mobile profile at all').toContain('data-testid="mobile-profile"')
    // The pavilion's own marks — `data-skin="wow"` and the kit's stat row —
    // prove WOW did not fall through to the na mobile skin.
    expect(html, 'the WOW pavilion').toContain('data-skin="wow"')
    expect(html, 'the tally of deeds').toContain('1880')
  })

  it('still renders the crested desktop page on a wide viewport', () => {
    const html = renderBody({ faction_slug: 'wow' })
    expect(html).not.toContain('data-testid="mobile-profile"')
    expect(html, 'the desktop kit heading').toContain('Honours &amp; Credentials')
  })
})

describe('a faction with no mobile twin reaches its OWN skin on a phone', () => {
  // Before the collapse every faction but WOW fell through to the na mobile
  // skin on a phone. Now a Coven player gets Coven dress at both widths — the
  // one rendered-output change the collapse makes, and the point of it.
  it('renders the Coven body, not the na spectrum one', () => {
    mocks.formFactor = 'mobile'
    const html = renderBody({ faction_slug: 'coven' })
    expect(html).not.toContain('data-testid="mobile-profile"')
    expect(html, 'coven kit copy').toContain('Coven')
  })

  // ...and the shared ProfileSkin stacks for it. Both of these are fixed pixel
  // columns that do not fit a 375px viewport beside the 266px credential card,
  // so a phone must not see either. This is the guard on the collapse's real
  // fallout: six factions now reach a layout that had only ever been sized for
  // a laptop.
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
