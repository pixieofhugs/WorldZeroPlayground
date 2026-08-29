/**
 * The equal-height task-card row (#1945) — and the DOM chain it is built on.
 *
 * THE SEAM: the flex-wrap row that lists `<TaskCard>`s, and the path the row's
 * height travels down to the element each skin actually paints. The row itself
 * is one class (`.task-card-row`, declared in index.css); the reason the class
 * can be one class is that all nine skins share a shape:
 *
 *   TaskCard's positioned wrapper > skin root ([data-form-factor]) > <article>
 *
 * with exactly one GROWING anchor per card marking the region a player reads —
 * the masthead's faction link (#2167) is a second anchor that pins its own
 * flex-grow to 0 precisely so this chain still ends in one place. The CSS
 * hands the height down that chain, so a skin that quietly stops honouring it
 * would not fail to compile, would not fail a snapshot, and would simply stop
 * stretching — a bug that only shows up in a browser nobody here has. These
 * assertions are that contract written down where a redraw trips over it.
 *
 * This repo has no jsdom, so nothing here measures a height: `renderToStaticMarkup`
 * runs no layout. VISUAL QA IS OUTSTANDING and stated as such on the PR.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { SIGNUP_REASON_ALREADY_ACTIVE_MEMBER } from '../../taskDetail/signupCta'
import type { CurrentUser } from '../../../api/auth'
import type { CardProps } from '../../../components/taskCard/TaskCard'
import type { TasksState } from '../useTasks'

const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => dispatch.formFactor,
}))

// Imported after the mock is registered.
import Tasks from '../../Tasks'
import TaskCard from '../../../components/taskCard/TaskCard'
import AlbescentTaskCard from '../../../components/taskCard/AlbescentTaskCard'
import CovenTaskCard from '../../../components/taskCard/CovenTaskCard'
import DefaultTaskCard from '../../../components/taskCard/DefaultTaskCard'
import EphemeristsTaskCard from '../../../components/taskCard/EphemeristsTaskCard'
import EverymenTaskCard from '../../../components/taskCard/EverymenTaskCard'
import SingularityTaskCard from '../../../components/taskCard/SingularityTaskCard'
import SnideTaskCard from '../../../components/taskCard/SnideTaskCard'
import UaTaskCard from '../../../components/taskCard/UaTaskCard'
import WowTaskCard from '../../../components/taskCard/WowTaskCard'
import { aTask } from '../../../test/fixtures'
import { readIndexCss } from '../../../test/indexCss'

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
  character: null,
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

const CANNED: TasksState = {
  user: VIEWER,
  tasks: [TASK],
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

// PARTIAL: only the hook is canned — `TaskFilterBar` reads the module's real
// filter defaults and param helpers.
vi.mock('../useTasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useTasks')>()),
  useTasks: () => CANNED,
}))

function markup(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

describe('the tasks board mounts the equal-height row (#1945)', () => {
  it('carries .task-card-row and no flex-start on the card container', () => {
    dispatch.formFactor = 'desktop'
    const out = markup(<Tasks />)
    expect(out, 'the row wears the class that owns the stretch').toContain(
      'class="task-card-row"',
    )
    // The inline `align-items: flex-start` this replaced would beat the class,
    // and would beat it silently — the row would still be a flex-wrap row of
    // cards, just the ragged one. Read the ROW's own tag: `align-items` is a
    // fine and common thing to find inside a card's hero.
    const row = out.slice(out.indexOf('<div class="task-card-row"'))
    expect(row.slice(0, row.indexOf('>') + 1), 'the row carries gap and nothing else').toBe(
      '<div class="task-card-row" style="gap:var(--space-lg)">',
    )
  })
})

/**
 * Nine skins, one shape. Albescent is deliberately in the table twice over:
 * once as itself, where the assertions must still pass THROUGH its extra
 * wrapper, and by inheritance because it renders the na card verbatim.
 */
const SKINS: [string, ComponentType<CardProps>][] = [
  ['default (na)', DefaultTaskCard],
  ['albescent', AlbescentTaskCard],
  ['coven', CovenTaskCard],
  ['ephemerists', EphemeristsTaskCard],
  ['everymen', EverymenTaskCard],
  ['singularity', SingularityTaskCard],
  ['snide', SnideTaskCard],
  ['ua', UaTaskCard],
  ['wow', WowTaskCard],
]

describe('every skin honours the chain the row hands its height down', () => {
  it.each(SKINS)('%s: the frame is the skin root\'s own <article>', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
    )
    // `[data-form-factor] > article` is a direct-child selector in index.css. A
    // skin that grows a <div> in between keeps rendering and stops stretching.
    expect(out, 'the <article> is the skin root\'s direct child').toMatch(
      /<div[^>]*data-form-factor="desktop"[^>]*>\s*<article/,
    )
  })

  it.each(SKINS)('%s: exactly one GROWING anchor, and it is inside the frame', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
    )
    // The slack stops at the box holding this link (`:has(a[href])`), which is
    // what keeps a full-width CTA bar flush with the bottom edge. A second
    // anchor that GROWS would split the slack in two.
    //
    // Since #2167 the seven faction cards carry a second anchor — the masthead,
    // which reads the faction page — so the count alone no longer says this.
    // What does is the flex-grow: every anchor but the reading link pins its
    // own to 0 and takes no slack, whatever else it is or does.
    const anchors = [...out.matchAll(/<a\s[^>]*>/g)].map((m) => m[0])
    const growing = anchors.filter((tag) => !/flex-grow:\s*0/.test(tag))
    expect(growing, 'one reading link per card').toHaveLength(1)
    expect(growing[0], 'and it is the one that reads the task').toContain(
      `href="/tasks/${TASK.id}"`,
    )
    const frame = out.slice(out.indexOf('<article'), out.lastIndexOf('</article>'))
    expect(frame, 'the link sits inside the frame, not beside it').toContain(
      `href="/tasks/${TASK.id}"`,
    )
  })

  it.each(SKINS)('%s: nothing pins display inline, which would beat the row', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
    )
    // An inline style wins over every rule in index.css, so a skin root or its
    // frame that restates `display` freezes itself at its content height —
    // #1783's restatement hazard, in a second costume. The anchors' own
    // `display:block` is fine and expected: the chain gives them `flex`, never
    // `display`.
    const roots = out.match(/<(?:div[^>]*data-form-factor|article)[^>]*>/g) ?? []
    for (const tag of roots) {
      expect(tag, 'no inline display on the skin root or its frame').not.toMatch(
        /display:/,
      )
    }
  })
})

/**
 * #2380 — THE CHAIN MUST KEY ON THE CARD'S OWN LINK, NOT ON "A LINK".
 *
 * THE SEAM: the selector in `index.css` that decides which boxes become
 * columns, read against the markup a card renders for a viewer holding a draft.
 * Both halves of the chain used to end in `a[href]`, which reads as *any*
 * descendant holding *any* anchor. That agreed with the comment above it by
 * accident, for exactly as long as the card-wide reading link was the only
 * anchor a card drew. #2167 added the masthead — which had to patch itself
 * twice with `flexGrow: 0` to get back off the chain — and #2359 gave
 * `CardCtaControl` a link branch for the `already_active_member` draft, a
 * SIBLING of the reading link. That sibling matched, its row flipped to a
 * column, and Everymen's two `flex: 0 1 96px` marks read their basis as a
 * HEIGHT with `width: 100%` behind it: hands the full width of the card.
 *
 * So the assertion is not "the row is still a row" — nothing here lays anything
 * out. It is that the selector and the markup name the SAME single anchor.
 */
const CSS = readIndexCss()

/**
 * The anchor attributes the two chain rules key on, read out of the stylesheet
 * rather than restated here — restating them is how a CSS rule and its guard
 * drift in the same direction and both stay green.
 *
 * ponytail: this reads `a[attr]`-shaped compounds only, ignoring values and
 * combinators. Ceiling: a chain rule keyed on `a[href^="/tasks/"]` would be
 * reported as keying on `href`, and this suite would call it broken — which is
 * the right answer for a value-matched guess anyway, since the CTA's own
 * `/praxis/…` href is one route rename away from matching it. Upgrade path if
 * that ever stops being true: a real selector parser (none is installed).
 */
function chainAnchorKeys(): string[] {
  const rules = CSS.split('\n').filter((line) => line.includes('[data-form-factor] > article :'))
  expect(rules, 'both halves of the chain — the column and the grow — are still here').toHaveLength(
    2,
  )
  return [...new Set([...rules.join('\n').matchAll(/\ba\[([\w-]+)/g)].map((m) => m[1]))]
}

const anchorTags = (out: string): string[] => [...out.matchAll(/<a\s[^>]*>/g)].map((m) => m[0])
const carries = (tag: string, attr: string): boolean =>
  new RegExp(`\\s${attr}(?=[=\\s>/])`).test(tag)

/** A viewer who already holds an open draft on this task — the #2359 branch. */
const DRAFT_TASK = aTask({
  description: TASK.description,
  signup_reason: SIGNUP_REASON_ALREADY_ACTIVE_MEMBER,
  in_progress_praxis_id: 77,
  can_sign_up: false,
})
const DRAFT_HREF = '/praxis/77/edit'

function draftCard(Card: ComponentType<CardProps>): string {
  dispatch.formFactor = 'desktop'
  return markup(
    <Card
      task={DRAFT_TASK}
      basePoints={DRAFT_TASK.point_value}
      multiplier={1}
      inProgressCount={2}
      onSignup={() => {}}
    />,
  )
}

describe('a sibling CTA row holding a link stays off the slack chain (#2380)', () => {
  it.each(SKINS)('%s: the draft link is not on the chain', (_name, Card) => {
    const cta = anchorTags(draftCard(Card)).find((tag) => tag.includes(`href="${DRAFT_HREF}"`))
    expect(cta, 'the draft branch renders a <Link>, so the premise still holds').toBeDefined()
    expect(
      chainAnchorKeys().filter((key) => carries(cta as string, key)),
      'the CTA link matches the chain selector, so its row is flipped to a column',
    ).toEqual([])
  })

  it.each(SKINS)('%s: exactly one anchor is on the chain, and it reads the task', (_name, Card) => {
    // Three anchors are in this card in this state — masthead, reading link,
    // draft link — and the chain must end at the middle one. The masthead's
    // `flexGrow: 0` and the CTA row's position outside the frame's column are
    // both defences; neither is what makes this true. The selector naming one
    // anchor is.
    const keys = chainAnchorKeys()
    const onChain = anchorTags(draftCard(Card)).filter((tag) =>
      keys.some((key) => carries(tag, key)),
    )
    expect(onChain, 'one anchor carries the chain hook').toHaveLength(1)
    expect(onChain[0], 'and it is the card-wide reading link').toContain(
      `href="/tasks/${DRAFT_TASK.id}"`,
    )
  })
})

describe('the dispatcher wrapper the row actually lays out', () => {
  it('is a plain positioned box with no display of its own', () => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <TaskCard task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={0} />,
    )
    // `.task-card-row > *` is this element. It must be free to become a column.
    expect(out.slice(0, out.indexOf('>') + 1)).toBe('<div style="position:relative">')
  })
})
