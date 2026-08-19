/**
 * The seam: the two body DISPATCHERS — `FactionProfileBody` (character
 * profiles) and the `factionBody` surface (faction pages) — and whether the
 * `onSignup` they are handed reaches the `<TaskCard>` they mount (#2188).
 *
 * Not the card, and not `taskCardSignupCta`: both of those were already right.
 * `components/taskCard/__tests__/signupAffordance.test.ts` pins the helper, and
 * the helper's answer for a pressable task has always been a button. What was
 * broken is that twelve mounts never passed the prop, so the helper returned
 * `null` before it could answer — a level-1 player was offered nothing on a
 * profile or a faction page and had to go find the task on `/tasks`.
 *
 * So this walks the dispatchers, once per slug, and asks the only question the
 * page family owns: did the prop arrive. Three states per body —
 *
 *   - signed-in viewer + pressable task  → the claim
 *   - signed-in viewer + refused task    → the REASON, and not pressable
 *   - anonymous viewer (`onSignup` undefined) → nothing at all, because the
 *     server sends no `signup_reason` to a viewer it cannot explain anything to
 *
 * Everymen gets one extra assertion: its `FistAndBolt` sits INSIDE the CTA
 * block, so on these surfaces the fists-and-lightning disappeared along with
 * the button and must come back with it.
 *
 * `renderToStaticMarkup` only — no DOM, no effects (SPEC-testing.md). Nothing
 * here presses anything; the press path is the helper's test.
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
import DefaultFactionBody from '../factionDetail/archetypes/DefaultFactionBody'
import type { FactionDetailState } from '../factionDetail/useFactionDetail'
import { FACTION_MANIFESTS, surfaceMap } from '../../factions'
import { pickVariant } from '../../utils/factionDispatch'

const SIGNUP = i18n.t('feed:taskCard.signup')
const BELOW_LEVEL = i18n.t('tasks:detail.signup.denied.belowLevel', { level: 9 })

/** Every slug that can reach either page family, plus unaffiliated. */
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
    can_sign_up: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
    start_here: false,
    ...overrides,
  }
}

/** The same task, shut by the server with a reason it has copy for. */
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

// ── the two families, each reduced to "render this slug's body with these
//    tasks and this onSignup" ────────────────────────────────────────────────

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
    viewerFactionSlug: null,
    gameFactions: [],
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
  const Body = pickVariant(surfaceMap('factionBody'), slug, DefaultFactionBody)
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
 * NOT COVERED HERE, AND WHY: the two PHONE mounts —
 * `DefaultProfileBody`'s `MobileProfile` and `WowProfileBody`'s. Both stack
 * praxis and tasks behind a segmented toggle whose `useState` opens on
 * 'praxis', so the task column is only reachable through a press. The harness
 * is `renderToStaticMarkup` — no DOM, no effects, no press — so a phone-width
 * render of either body returns the praxis segment and can prove nothing about
 * the mount below it. They take the same `onSignup` off the same destructure
 * as the desktop halves; the PR's eyeball list carries them.
 */

describe("Everymen's fists-and-lightning ride with the CTA", () => {
  // `FistAndBolt` is drawn inside the CTA block, so withholding `onSignup` took
  // the mark down with the button. Both surfaces mount the Everymen card.
  it.each(FAMILIES)('$name', ({ render }) => {
    const withCta = render('everymen', [makeTask({ primary_faction_slug: 'everymen' })], () => {})
    const without = render('everymen', [makeTask({ primary_faction_slug: 'everymen' })])
    expect(withCta, 'the mark comes back with the button').toContain('data-evm-bolt')
    expect(without, 'and is absent without it').not.toContain('data-evm-bolt')
  })
})
