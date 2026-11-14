/**
 * Admin moderation refreshes the card, not the document (#1524). `displayedTask`
 * is the pure choice the render consumes (no clicks under SSR).
 */
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
    // Anything else the write moved must land too.
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
    expect(retired).not.toContain('>retire<')
  })

  it('shows no moderation controls to a non-admin', () => {
    mocks.isAdmin = false
    expect(card(TASK)).not.toContain('retire')
    mocks.isAdmin = true
  })
})

/**
 * The moderation cluster is a normal-flow sibling after the frame, never an
 * overlay that could meet the centred sign-up button (#2049). No layout under
 * SSR, so the SHAPE is asserted.
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
    expect(out.indexOf('>retire<')).toBeGreaterThan(out.lastIndexOf('</article>'))
  })

  it('leaves the wrapper the plain positioned box the equal-height row needs', () => {
    // An inline `display` would beat `.task-card-row > *` (#1945).
    const out = card(TASK)
    expect(out.slice(0, out.indexOf('>') + 1)).toBe('<div style="position:relative">')
  })
})
