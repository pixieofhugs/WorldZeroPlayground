/**
 * Admin moderation on a task card refreshes the card, not the document (#1524).
 *
 * `handleStatusChange` used to end in `window.location.reload()`. One field
 * changed and the whole page paid: scroll position, in-flight requests and every
 * cached fetch on the surface were discarded, and the card's own fetch waterfall
 * re-ran, all to redraw two buttons.
 *
 * SEAM. `updateTaskStatus` answers with the updated `TaskOut`, so the card keeps
 * the moderator's own echo of their last change and draws THAT instead of the
 * prop the list handed down. `displayedTask` is that choice, and it is the
 * function the component's render calls — a click cannot be simulated here
 * (`renderToStaticMarkup`, no DOM, effects never run), so the pure choice plus
 * the render that consumes it is as far as the harness reaches. The third test
 * pins the half neither can see: that the reload is gone from the source.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { TaskOut } from '../../../api/tasks'

const mocks = vi.hoisted(() => ({ isAdmin: true, adminMode: true }))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { is_admin: mocks.isAdmin } }),
}))
vi.mock('../../../auth/AdminModeContext', () => ({
  useAdminMode: () => ({ adminMode: mocks.adminMode }),
}))

// Imported after the mocks are registered.
import TaskCard, { displayedTask } from '../TaskCard'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
})

function card(task: TaskOut): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TaskCard task={task} basePoints={task.point_value} />
    </MemoryRouter>,
  )
}

describe('displayedTask — the moderator sees their own change (#1524)', () => {
  it('prefers the moderated echo over the prop the list handed down', () => {
    const retired: TaskOut = { ...TASK, status: 'retired' }
    expect(displayedTask(TASK, retired).status).toBe('retired')
  })

  it('takes the WHOLE server task, not just its status', () => {
    // `updateTaskStatus` answers with a full TaskOut. Anything else the write
    // moved must land too, or the in-place path shows less than the reload did.
    const moderated: TaskOut = { ...TASK, status: 'retired', title: 'Photosynthesis (retired)' }
    expect(displayedTask(TASK, moderated).title).toBe('Photosynthesis (retired)')
  })

  it('falls back to the prop with no echo, and ignores an echo of another task', () => {
    expect(displayedTask(TASK, null)).toBe(TASK)
    expect(displayedTask(TASK, { ...TASK, id: 99, status: 'retired' })).toBe(TASK)
  })
})

describe('the admin control set follows the displayed status', () => {
  it('offers retire on an active task and activate on a retired one', () => {
    expect(card(TASK)).toContain('retire')
    expect(card(TASK)).not.toContain('activate')

    const retired = card({ ...TASK, status: 'retired' })
    expect(retired).toContain('activate')
    // `retire` is a substring of nothing here; the retired card offers one control.
    expect(retired).not.toContain('>retire<')
  })

  it('shows no moderation controls to a non-admin', () => {
    mocks.isAdmin = false
    expect(card(TASK)).not.toContain('retire')
    mocks.isAdmin = true
  })
})

describe('no full-document reload behind a one-field write', () => {
  it('is gone from TaskCard', () => {
    const source = readFileSync(fileURLToPath(new URL('../TaskCard.tsx', import.meta.url)), 'utf8')
    expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('window.location.reload')
  })
})

/**
 * The moderation cluster is part of the card's foot, not an overlay on it
 * (#2049).
 *
 * SEAM: the dispatcher's own markup — specifically the box that holds the
 * retire/activate buttons. It used to be `position:absolute; bottom:4; right:4;
 * z-index:10`, which was survivable while the sign-up affordance was a
 * full-bleed footer BAR: the cluster covered it edge to edge, predictably.
 * #2030 made that affordance a discrete, inset, CENTRED button, so a
 * bottom-right overlay and a centred control can now collide at narrow widths —
 * the overlapping hit boxes `docs/agents/design-fidelity.md` names as a failure.
 *
 * NOTHING HERE MEASURES A BOX. `renderToStaticMarkup` runs no layout, so no
 * test in this repo can prove two rectangles stop overlapping. What is
 * assertable is the SHAPE that makes overlap impossible: the cluster is a
 * normal-flow sibling below the card's frame rather than an absolutely
 * positioned overlay, and the wrapper stays the plain positioned box the
 * equal-height row lays out (`pages/tasks/__tests__/equalHeightRow.test.tsx`).
 * VISUAL QA IS OUTSTANDING and stated as such on the PR.
 */
describe('the moderation cluster sits in the foot, not over it (#2049)', () => {
  it('is a normal-flow box: no absolute positioning, no stacking context', () => {
    const out = card(TASK)
    const at = out.indexOf('>retire<')
    const open = out.lastIndexOf('<div', at)
    const tag = out.slice(open, out.indexOf('>', open) + 1)
    expect(tag, 'the cluster is laid out, not floated over the card').not.toContain(
      'position:absolute',
    )
    expect(tag, 'nothing to raise it above the sign-up button').not.toContain('z-index')
  })

  it('follows the card frame instead of sitting inside it', () => {
    const out = card(TASK)
    // The skin owns everything up to its </article>; the dispatcher appends the
    // cluster after it. Putting it INSIDE the frame would need a slot prop on
    // all nine skins — see the PR for why that was not the fix taken.
    expect(out.indexOf('>retire<')).toBeGreaterThan(out.lastIndexOf('</article>'))
  })

  it('leaves the wrapper the plain positioned box the equal-height row needs', () => {
    // An inline `display` here would beat `.task-card-row > *` in index.css and
    // silently stop every card on the board from stretching (#1945).
    const out = card(TASK)
    expect(out.slice(0, out.indexOf('>') + 1)).toBe('<div style="position:relative">')
  })
})
