/**
 * Tasks form-factor dispatch — useFormFactor mocked 'mobile' selects the Default
 * mobile browse skin; 'desktop' keeps the existing flex-wrap list. Mirrors the
 * TaskDetail dispatch seam (#494/#496). useTasks is mocked to a canned state so
 * the branch under test renders without hitting the network.
 *
 * The second half covers the ADR-0056 rewire (#1022): mobile browse renders the
 * SHARED <TaskCard>, so both branches must now show the same card and the same
 * signup CTA, gated identically on `can_sign_up`. Before the rewire mobile
 * had no CTA at all, so "the button is there on mobile" is the regression this
 * pins.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { TaskOut } from '../../../api/tasks'
import type { TasksState } from '../useTasks'

// Mutable form factor the mocked hook reports; each test sets it before render.
const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => dispatch.formFactor,
}))

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
  in_progress_count: 6,
})

const VIEWER: CurrentUser = {
  account_id: 1,
  email: 'wz_pilgrim@example.com',
  provider: 'google',
  // Carries a character: the eligibility rail is gated on a LIFE, not on a
  // session (#1972), and the browse's signed-in cases are all played by a
  // player. An account between characters is `metataskFilterGate`'s viewer.
  character: { id: 3, level: 2, faction_slug: 'na' } as never,
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
  second_character_level_required: 5,
  era_name: 'Era 1',
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
}

// Canned task-browse state. Tests that only exercise the dispatch branch leave
// the list empty and hit each branch's own empty state.
const CANNED: TasksState = {
  user: null,
  tasks: [],
  loading: false,
  error: null,
  factions: [{ slug: 'everymen', status: 'visible' }],
  factionConfigs: [],
  statusFilters: ['All', 'active'],
  taskType: 'standard',
  setTaskType: () => {},
  sort: 'level',
  setSort: () => {},
  status: 'All',
  setStatus: () => {},
  selectedFactions: [],
  setSelectedFactions: () => {},
  canSignUp: false,
  setCanSignUp: () => {},
  query: '',
  setQuery: () => {},
  clearFilters: () => {},
  hasMore: false,
  loadMore: () => {},
  signupMsg: null,
  handleSignup: async () => {},
  displayPointsFor: () => 0,
  displayMultiplierFor: () => 1,
}

// What the mocked hook hands back; each test replaces it before rendering.
const state: { current: TasksState } = { current: CANNED }

// PARTIAL: only the hook is canned. The module also exports the filter defaults
// and the pure param helpers, which `TaskFilterBar` reads for real.
vi.mock('../useTasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useTasks')>()),
  useTasks: () => state.current,
}))

import Tasks from '../../Tasks'
import { aTask } from '../../../test/fixtures'

function html(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  )
}

function text(): string {
  return html().replace(/<[^>]*>/g, '')
}

const SIGNUP = i18n.t('feed:taskCard.signup')
const COUNT = i18n.t('tasks:listPage.count', { count: 0 })

describe('Tasks form-factor dispatch', () => {
  it('renders the Default mobile browse skin on mobile', () => {
    dispatch.formFactor = 'mobile'
    state.current = CANNED
    expect(html()).toContain('mobile-tasks-browse')
  })

  it('renders the existing desktop list on desktop', () => {
    dispatch.formFactor = 'desktop'
    state.current = CANNED
    const out = html()
    expect(out, 'no mobile skin').not.toContain('mobile-tasks-browse')
    // The desktop page title; the filter bar itself is now shared chrome and so
    // is no longer a form-factor discriminator (#1367).
    //
    // Asserted on `PageTitle`'s per-letter underline, not the word "Tasks": the
    // title is drawn as per-letter spans (Style Guide §7), so it never appears
    // contiguously in the markup. This line used to read `toContain('Tasks')`
    // and was in fact matching the type rail's "Tasks" SEGMENT — which #1973
    // then hid from this logged-out viewer, exposing the false positive. It then
    // read the eyebrow, which #2262 moved into the shared bar, so it stopped
    // discriminating too.
    expect(out, 'desktop page title').toContain(
      'border-bottom:4px solid var(--faction-default-stop-1)',
    )
  })

  it.each(['mobile', 'desktop'] as const)(
    'states the count in the bar, once, on %s (#2262)',
    (formFactor) => {
      dispatch.formFactor = formFactor
      state.current = CANNED
      const out = html()
      expect(out, 'the bar states it').toContain(
        `class="filter-bar__summary">${COUNT}<`,
      )
      // The header eyebrow (desktop) and the header caption (mobile) both
      // carried this number; neither does now, so one copy is on screen.
      expect(
        out.replace(/<[^>]*>/g, '').split(COUNT),
        'exactly one count on screen',
      ).toHaveLength(2)
    },
  )

  it('mounts the shared filter bar on BOTH form factors (#1367)', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = CANNED
      const out = html()
      expect(out, formFactor).toContain('filter-bar')
      expect(out, `${formFactor}: search moved into the bar`).toContain(
        'filter-bar__search',
      )
    }
  })
})

describe('task-browse card + CTA parity (ADR-0056)', () => {
  it('renders the shared card at its mobile size on mobile', () => {
    dispatch.formFactor = 'mobile'
    state.current = { ...CANNED, user: VIEWER, tasks: [TASK] }
    const out = html()
    expect(out, 'shared TaskCard, sized for the phone').toContain(
      'data-form-factor="mobile"',
    )
    expect(out, 'task link').toContain('href="/tasks/7"')
    expect(out.replace(/<[^>]*>/g, ''), 'title').toContain('Photosynthesis')
  })

  it('shows the inline signup CTA on BOTH form factors when the viewer may sign up', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [TASK] }
      expect(text(), formFactor).toContain(SIGNUP)
    }
  })

  it('hides the CTA on both when the task refuses the viewer without saying why', () => {
    // `can_sign_up: false` with no `signup_reason` is a shape the server does
    // not send to a signed-in viewer, but it is the shape a sixth backend gate
    // would arrive in before this build has copy for it — and the answer then
    // is silence, never a button the server will refuse (#1976).
    const barred: TaskOut = { ...TASK, can_sign_up: false }
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [barred] }
      expect(text(), formFactor).not.toContain(SIGNUP)
    }
  })

  // #1976 — the owner-reported surface. This list used to withhold `onSignup`
  // whenever `can_sign_up` was false, so a task the browse was still SHOWING
  // said nothing at all about why it could not be taken, while the detail page
  // for that same task had read `signup_reason` since #1497.
  it('states the reason on both when the task names why it refuses', () => {
    const barred: TaskOut = {
      ...TASK,
      can_sign_up: false,
      signup_reason: 'below_level',
      level_required: 4,
    }
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [barred] }
      expect(text(), formFactor).toContain(
        i18n.t('tasks:detail.signup.denied.belowLevel', { level: 4 }),
      )
      expect(text(), `${formFactor}: no longer calls it a sign-up`).not.toContain(SIGNUP)
      expect(html(), `${formFactor}: and it is not pressable`).toContain('aria-disabled="true"')
    }
  })

  it('hides the CTA on both for a logged-out viewer', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: null, tasks: [TASK] }
      expect(text(), formFactor).not.toContain(SIGNUP)
    }
  })

  it('surfaces the signup outcome message on mobile, where the CTA now lives', () => {
    dispatch.formFactor = 'mobile'
    state.current = {
      ...CANNED,
      user: VIEWER,
      tasks: [TASK],
      signupMsg: 'Could not sign up.',
    }
    expect(text()).toContain('Could not sign up.')
  })
})

/**
 * The "tasks I can sign up for" filter (#1130), which replaced the level filter.
 * The decision worth pinning here is that the control is HIDDEN from a viewer
 * with no character (the server answers `[]` for an anonymous viewer, so it
 * could only ever empty the page) — `eligibilityRailGate.test.tsx` holds the
 * account-with-no-character half of that gate.
 *
 * It defaults ON for a level-0 character and OFF for anyone past that (#1972,
 * narrowed by #2025); which viewer gets which default is `readTaskFilters`'
 * call and is pinned in `taskFilterParams.test.ts`. This page takes `canSignUp`
 * as a given — VIEWER here is level 2, and the tests that want the filter on
 * say so.
 */
describe('can-sign-up filter (#1130)', () => {
  const CAN_SIGN_UP = i18n.t('tasks:browse.canSignUp')

  it('offers the rail when signed in', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: VIEWER }
    expect(text().toLowerCase()).toContain(CAN_SIGN_UP.toLowerCase())
  })

  it('hides the rail on both form factors when logged out', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: null }
      expect(text().toLowerCase(), formFactor).not.toContain(CAN_SIGN_UP.toLowerCase())
    }
  })

  it('names the eligible-empty case instead of blaming the filters', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, canSignUp: true, tasks: [] }
      const out = text()
      expect(out, formFactor).toContain(i18n.t('tasks:listPage.emptyEligible'))
      expect(out, formFactor).not.toContain(i18n.t('tasks:listPage.empty'))
    }
  })

  it('keeps the generic empty state when the filter is off', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: VIEWER, canSignUp: false, tasks: [] }
    expect(text()).toContain(i18n.t('tasks:listPage.empty'))
  })
})

/**
 * The two rails the bar mount had to get right (#1367).
 *
 * The status rail is a PERMISSION boundary, not decoration: `retired` and
 * `pending` are the viewer's to see or not, so the rail takes a variable
 * segment count rather than a fixed four. And the sort rail defaults to
 * `level` — the ordering the page already had by sending no `sort` at all —
 * so it must sit on its default and raise no chip on a fresh load.
 */
describe('the task rails', () => {
  /** How many rail segments the page drew, across every rail it mounted. */
  const segmentCount = (markup: string) =>
    markup.split('filter-rail__segment').length - 1

  const SEES_EVERYTHING: CurrentUser = {
    ...VIEWER,
    can_see_retired_tasks: true,
    can_see_pending_tasks: true,
  }

  it('gives a logged-out viewer two status segments, not four', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: null, statusFilters: ['All', 'active'] }
    const out = html()
    expect(out, 'no retired segment').not.toContain(
      `>${i18n.t('tasks:browse.status.retired')}<`,
    )
    expect(out, 'no pending segment').not.toContain(
      `>${i18n.t('tasks:browse.status.pending')}<`,
    )
    // sort (3) + status (2). No eligibility rail logged out, and no TYPE rail
    // either since #1973 — a logged-out viewer cannot apply a metatask, so the
    // rail that offers them is hidden rather than shown dead.
    expect(segmentCount(out), 'five segments across two rails').toBe(5)
  })

  it('widens the status rail to four for a viewer allowed the extra states', () => {
    dispatch.formFactor = 'desktop'
    state.current = {
      ...CANNED,
      user: SEES_EVERYTHING,
      statusFilters: ['All', 'active', 'retired', 'pending'],
    }
    const out = html()
    // The segment shows the localized label; the VALUE stays the raw status
    // the API expects, which is what `statusFilters` above carries.
    expect(out).toContain(`>${i18n.t('tasks:browse.status.retired')}<`)
    expect(out).toContain(`>${i18n.t('tasks:browse.status.pending')}<`)
    // sort (3) + status (4) + eligibility (2). Still no type rail: seeing
    // retired/pending and applying a metatask are different gates, and this
    // viewer holds only the first (#1973). `metataskFilterGate.test.tsx` covers
    // the viewer who holds the second.
    expect(segmentCount(out), 'the status rail grew by two').toBe(9)
    // The thumb is a measured rect since #1726 and this harness runs no
    // effects, so its placement is not observable here — see
    // components/ui/FilterBar/__tests__ for the half that is.
  })

  it('opens on `level`, raising no applied chip', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: VIEWER }
    const out = html()
    expect(out, 'the level segment is the selected one').toContain(
      `aria-pressed="true">${i18n.t('common:filters.bar.sort.level')}<`,
    )
    expect(out, 'a default rail is not an applied filter').not.toContain(
      'filter-bar__applied',
    )
  })
})

/**
 * #2763, which REVERSES #1964 on the phone — the mobile results column is the
 * seam for both.
 *
 * #1964's reading was that a task card owns its width (`size.cardWidth`, 340 on
 * the phone), §10 forbids regularizing that, and so the column had to yield:
 * `items-center`, because a stretched item made the card's wrapper full-bleed
 * and left the narrower card pinned to the left edge, visibly narrower than the
 * filter bar above it. The owner reversed the premise rather than the fix —
 * below 768px a card FILLS its column, and every archetype now asks for
 * `width: 100%` at that form factor.
 *
 * Which makes centring actively wrong here: `align-items: center` sizes an item
 * to its content, so a card asking for the whole line gets shrunk back to what
 * it holds. The column stretches, on BOTH branches — the metatask arm was
 * already excluded from the centring for the same reason (a seal has no width
 * of its own), so the two arms have simply converged, and both are pinned here
 * so a re-centring of either one fails.
 */
describe('the mobile results column stretches its cards (#2763)', () => {
  function resultsColumnClass(): string {
    const m = /class="([^"]*)"[^>]*data-testid="mobile-tasks-results"/.exec(html())
    if (m === null) throw new Error('mobile results column was not rendered')
    return m[1]
  }

  it('lets a task card fill the column instead of centring it', () => {
    dispatch.formFactor = 'mobile'
    state.current = { ...CANNED, user: VIEWER, tasks: [TASK] }
    expect(resultsColumnClass()).not.toContain('items-center')
  })

  it('leaves the metatask seal stack full-bleed', () => {
    dispatch.formFactor = 'mobile'
    state.current = {
      ...CANNED,
      user: VIEWER,
      taskType: 'metatask',
      tasks: [aTask({ id: 91, task_type: 'metatask', metatask_faction_slug: 'coven' })],
    }
    expect(resultsColumnClass()).not.toContain('items-center')
  })
})
