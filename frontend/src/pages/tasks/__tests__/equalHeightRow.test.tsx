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
 * with exactly one anchor per card marking the region a player reads. The CSS
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

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
  in_progress_count: 6,
})

const VIEWER: CurrentUser = {
  account_id: 1,
  character: null,
  is_admin: false,
  can_create_additional_character: false,
  can_start_as_albescent: false,
  albescent_revealed: false,
  can_propose_task: true,
  can_propose_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
  second_character_level_required: 5,
  era_name: 'Era 1',
  level_jump_reach: 0,
  level_jump_available: false,
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

  it.each(SKINS)('%s: exactly one anchor, and it is inside the frame', (_name, Card) => {
    dispatch.formFactor = 'desktop'
    const out = markup(
      <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} />,
    )
    // The slack stops at the box holding this link (`:has(a[href])`), which is
    // what keeps a full-width CTA bar flush with the bottom edge. A SECOND
    // anchor elsewhere in the card would grow a second box and split the slack.
    expect(out.match(/<a\s/g) ?? [], 'one reading link per card').toHaveLength(1)
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
