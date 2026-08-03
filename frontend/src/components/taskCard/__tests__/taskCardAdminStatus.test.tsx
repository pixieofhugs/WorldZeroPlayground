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

const TASK: TaskOut = {
  id: 7,
  title: 'Photosynthesis',
  description: 'Leave something small and honest where a stranger will find it.',
  point_value: 18,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: 3,
  primary_faction_slug: 'na',
  metatask_faction_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  created_by_display_name: '',
  created_by_avatar_url: '',
  created_by_faction_slug: null,
  created_by_level: 0,
  signup_reason: null,
  in_progress_count: 0,
  can_sign_up: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
}

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
