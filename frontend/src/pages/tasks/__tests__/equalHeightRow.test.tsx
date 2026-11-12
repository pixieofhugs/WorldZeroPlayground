/**
 * The equal-height task-card row (#1945) and the DOM chain `.task-card-row`
 * hands its height down, shared by all nine skins:
 *
 *   TaskCard's positioned wrapper > skin root ([data-form-factor]) > <article>
 *
 * with exactly one growing anchor per card. A skin breaking this only stops
 * stretching in a browser; nothing here measures layout.
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

import Tasks from '../../Tasks'
import TaskCard from '../../../components/taskCard/TaskCard'
import { surfaceMap } from '../../../factions'
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
  is_owner: false,
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
  can_vote: true,
  vote_level_required: 1,
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

// Partial: `TaskFilterBar` reads the real defaults and param helpers.
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
    // An inline `align-items` would silently beat the class. Read the row's own
    // tag only: cards legitimately use `align-items` inside.
    const row = out.slice(out.indexOf('<div class="task-card-row"'))
    expect(row.slice(0, row.indexOf('>') + 1), 'the row carries gap and nothing else').toBe(
      '<div class="task-card-row" style="gap:var(--space-lg)">',
    )
  })
})

/** Every skin, read off the registry (#2815) so a new kit is held automatically. */
const SKINS: [string, ComponentType<CardProps>][] = Object.entries(surfaceMap('taskCard'))

describe('every skin honours the chain the row hands its height down', () => {
  it.each(SKINS)('%s: the frame is the skin root\'s own <article>', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
    )
    // `[data-form-factor] > article` is a direct-child selector in index.css.
    expect(out, 'the <article> is the skin root\'s direct child').toMatch(
      /<div[^>]*data-form-factor="desktop"[^>]*>\s*<article/,
    )
  })

  it.each(SKINS)('%s: exactly one GROWING anchor, and it is inside the frame', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
    )
    // A second growing anchor would split the slack. Other anchors (the
    // masthead, #2167) pin flex-grow to 0.
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
    // An inline `display` beats index.css and freezes the box (#1783). Anchors'
    // `display:block` is fine.
    const roots = out.match(/<(?:div[^>]*data-form-factor|article)[^>]*>/g) ?? []
    for (const tag of roots) {
      expect(tag, 'no inline display on the skin root or its frame').not.toMatch(
        /display:/,
      )
    }
  })
})

/**
 * #2380: the chain selector in `index.css` must key on the card's own reading
 * link, not any anchor. A draft CTA link (#2359) matching `a[href]` flipped its
 * row to a column. Asserts selector and markup name the same single anchor.
 */
const CSS = readIndexCss()

/**
 * The anchor attributes the two chain rules key on, read from the stylesheet so
 * rule and guard can't drift together.
 *
 * ponytail: reads `a[attr]` compounds only, ignoring values/combinators; a
 * value-matched key reads as `href` (and fails, rightly). Upgrade: a selector parser.
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
    // Masthead, reading link, draft link: the chain must end at the middle one.
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
    // `.task-card-row > *`: must be free to become a column.
    expect(out.slice(0, out.indexOf('>') + 1)).toBe('<div style="position:relative">')
  })
})
