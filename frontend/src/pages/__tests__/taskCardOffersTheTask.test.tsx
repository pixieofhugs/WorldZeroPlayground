/**
 * #2188: does the `onSignup` handed to `FactionProfileBody` and the
 * `factionBody` surface reach the `<TaskCard>` they mount? (The helper itself
 * is pinned in `signupAffordance.test.ts`.) Per slug: claim, refusal reason,
 * or nothing for an anonymous viewer.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import '../../i18n'
import i18n from '../../i18n'
import type { CharacterOut } from '../../api/auth'
import type { TaskOut } from '../../api/tasks'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

import FactionProfileBody, {
  type ProfileBodyProps,
} from '../characterProfile/FactionProfileBody'
import type { FactionDetailState } from '../factionDetail/useFactionDetail'
import { FACTION_MANIFESTS, surfaceMap } from '../../factions'
import { resolveVariant } from '../../utils/factionDispatch'

const SIGNUP = i18n.t('feed:taskCard.signup')
const BELOW_LEVEL = i18n.t('tasks:detail.signup.denied.belowLevel', { level: 9 })

const SLUGS = ['na', ...FACTION_MANIFESTS.map((m) => m.slug)]

function makeTask(overrides: Partial<TaskOut> = {}): TaskOut {
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
    ...overrides,
  }
}

const REFUSED = makeTask({
  can_sign_up: false,
  signup_reason: 'below_level',
  level_required: 9,
})

function makeCharacter(faction_slug: string): CharacterOut {
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
    faction_slug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
  } as unknown as CharacterOut
}

function html(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}
const strip = (markup: string) => markup.replace(/<[^>]*>/g, '')

function profile(slug: string, tasks: TaskOut[], onSignup?: (id: number) => void): string {
  const props: ProfileBodyProps = {
    character: makeCharacter(slug),
    submissions: [],
    proposedTasks: tasks,
    progression: null,
    identityActions: null,
    onSignup,
  }
  return html(<FactionProfileBody {...props} />)
}

function factionPage(slug: string, tasks: TaskOut[], onSignup?: (id: number) => void): string {
  const state = {
    slug,
    loading: false,
    faction: { slug },
    fetchError: null,
    members: [],
    tasks,
    recentPraxis: [],
    onSignup,
    signupMsg: null,
    membership: {
      state: 'none',
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState
  const Body = resolveVariant(surfaceMap('factionBody'), slug)
  return html(<Body state={state} />)
}

const FAMILIES = [
  { name: 'character profile', render: profile },
  { name: 'faction page', render: factionPage },
] as const

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe.each(FAMILIES)('a task card offers the task on a $name (#2188)', ({ render }) => {
  it.each(SLUGS)('offers the claim to a signed-in viewer — %s', (slug) => {
    const text = strip(render(slug, [makeTask()], () => {}))
    expect(text, slug).toContain(SIGNUP)
  })

  it.each(SLUGS)('states the reason instead when the server refuses — %s', (slug) => {
    const markup = render(slug, [REFUSED], () => {})
    expect(strip(markup), slug).toContain(BELOW_LEVEL)
    expect(markup, `${slug}: and it is not pressable`).toContain('aria-disabled="true"')
  })

  it.each(SLUGS)('offers an anonymous viewer nothing at all — %s', (slug) => {
    const text = strip(render(slug, [makeTask()]))
    expect(text, slug).not.toContain(SIGNUP)
    expect(text, `${slug}: nor a refusal`).not.toContain(BELOW_LEVEL)
  })
})

/*
 * Not covered: the profile at phone width, whose tasks sit behind a toggle
 * that opens on 'praxis' and needs a press SSR can't make. Same `onSignup`
 * destructure as desktop (#2996).
 */

describe("Everymen's fists-and-lightning ride with the CTA", () => {
  // `FistAndBolt` sits inside the CTA block.
  it.each
(FAMILIES)('$name', ({ render }) => {
    const withCta = render('everymen', [makeTask({ primary_faction_slug: 'everymen' })], () => {})
    const without = render('everymen', [makeTask({ primary_faction_slug: 'everymen' })])
    expect(withCta, 'the mark comes back with the button').toContain('data-evm-bolt')
    expect(without, 'and is absent without it').not.toContain('data-evm-bolt')
  })
})
