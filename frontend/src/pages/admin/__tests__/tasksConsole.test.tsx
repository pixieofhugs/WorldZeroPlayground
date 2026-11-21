// @vitest-environment jsdom
/** Seam: TasksTab with the admin API mocked — segments, the proposal countdown, the panel, the deep link. */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import { aTask } from '../../../test/fixtures'

const NOW = Date.parse('2026-06-10T12:00:00Z')
const api = vi.hoisted(() => ({
  getAllTasks: vi.fn(),
  getPendingTasks: vi.fn(),
  getTaskIdsWithHistory: vi.fn(),
  adminPatchTask: vi.fn(async () => ({})),
  updateTaskStatus: vi.fn(async () => ({})),
  deleteTask: vi.fn(async () => undefined),
  importTasksCsv: vi.fn(),
  taskImportRowErrors: vi.fn(() => []),
}))
vi.mock('../../../api/admin', () => api)
// Odd numbers on purpose: a literal 48 or 3 in the page would show up as the wrong text.
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => ({
    pending_task_admin_review_hours: 36,
    level_thresholds: [0, 10, 20, 30],
    level_to_see_pending_tasks: 4,
    factions: [{ slug: 'na' }, { slug: 'coven' }],
  }),
}))

import TasksTab from '../TasksTab'

const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const active = aTask({ id: 1, title: 'Walk Barefoot', status: 'active' })
const retired = aTask({ id: 2, title: 'Old Chore', status: 'retired' })
const proposal = aTask({ id: 3, title: 'Learn a Bird’s Name', status: 'pending', created_at: hoursAgo(5) })

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TasksTab />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  api.getAllTasks.mockResolvedValue([active, retired, proposal])
  api.getTaskIdsWithHistory.mockResolvedValue([])
  api.getPendingTasks.mockResolvedValue([{ ...proposal, created_by_name: 'Ada Quill', notes: 'Birds are everywhere.' }])
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('Tasks segments', () => {
  it('/admin/tasks opens on Active, each segment carrying its count', async () => {
    at('/admin/tasks')
    expect(await screen.findByText('Walk Barefoot')).toBeTruthy()
    expect(screen.queryByText('Old Chore')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Proposals 1' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: 'Active 1' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: 'Retired 1' }))
    expect(screen.getByText('Old Chore')).toBeTruthy()
  })

  it('shows a metatask in Active, tagged, and the count includes it', async () => {
    api.getAllTasks.mockResolvedValue([active, aTask({ id: 4, title: 'Do It Backwards', status: 'active', task_type: 'metatask' })])
    at('/admin/tasks')
    expect(await screen.findByText('Do It Backwards')).toBeTruthy()
    expect(screen.getByText('Metatask')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Active 2' })).toBeTruthy()
  })

  it('/admin/proposals opens on Proposals with hours left from era config', async () => {
    at('/admin/proposals')
    expect(await screen.findByText('Learn a Bird’s Name')).toBeTruthy()
    expect(screen.getByText('Ada Quill')).toBeTruthy()
    // 36h window, 5h elapsed.
    expect(screen.getByText('in 31h')).toBeTruthy()
    expect(screen.queryByText('Walk Barefoot')).toBeNull()
  })
})

describe('the task panel', () => {
  it('offers Delete only to a task with no history (#3667)', async () => {
    api.getTaskIdsWithHistory.mockResolvedValue([1])
    const first = at('/admin/tasks')
    fireEvent.click(await screen.findByRole('button', { name: 'Walk Barefoot' }))
    expect(screen.queryByRole('button', { name: /^delete$/i })).toBeNull()
    first.unmount()
    api.getTaskIdsWithHistory.mockResolvedValue([])
    at('/admin/tasks')
    fireEvent.click(await screen.findByRole('button', { name: 'Walk Barefoot' }))
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeTruthy()
  })

  it('opens from a row, warns with the era level and hours, shows the note', async () => {
    at('/admin/proposals')
    fireEvent.click(await screen.findByRole('button', { name: 'Learn a Bird’s Name' }))
    const panel = screen.getByRole('complementary', { name: 'Task' })
    expect(within(panel).getByText('Unreviewed, this goes public to level 4+ players in 31 hours.')).toBeTruthy()
    expect((within(panel).getByLabelText('Their note to you') as HTMLTextAreaElement).value).toBe('Birds are everywhere.')
    expect(within(panel).getByRole('link', { name: /View on site/ }).getAttribute('href')).toBe('/tasks/3')
  })

  it('saves edits with Activate: patch, then status', async () => {
    at('/admin/tasks?task=3')
    const panel = await screen.findByRole('complementary', { name: 'Task' })
    fireEvent.change(within(panel).getByLabelText('Title'), { target: { value: 'Learn a Bird Name' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'activate' }))
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(3, 'active'))
    expect(api.adminPatchTask).toHaveBeenCalledWith(3, expect.objectContaining({ title: 'Learn a Bird Name' }))
    expect(api.adminPatchTask.mock.invocationCallOrder[0]).toBeLessThan(api.updateTaskStatus.mock.invocationCallOrder[0])
  })

  it('shows an active task read-only with no save, and retire sends only the status', async () => {
    at('/admin/tasks?task=1')
    const panel = await screen.findByRole('complementary', { name: 'Task' })
    for (const label of ['Title', 'Description', 'Level']) {
      expect((within(panel).getByLabelText(label) as HTMLInputElement).disabled).toBe(true)
    }
    expect(within(panel).queryByRole('button', { name: /^save$/i })).toBeNull()
    expect(within(panel).getByText(/Retire it to edit/)).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'retire' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'retire it' }))
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'retired'))
    expect(api.adminPatchTask).not.toHaveBeenCalled()
  })

  it('retire asks first', async () => {
    at('/admin/tasks?task=1')
    const panel = await screen.findByRole('complementary', { name: 'Task' })
    fireEvent.click(within(panel).getByRole('button', { name: 'retire' }))
    expect(api.updateTaskStatus).not.toHaveBeenCalled()
    fireEvent.click(within(panel).getByRole('button', { name: 'retire it' }))
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledWith(1, 'retired'))
  })
})

describe('the deep link', () => {
  it('/admin/tasks?task=<id> opens that panel and switches to the task’s segment', async () => {
    at('/admin/tasks?task=2')
    const panel = await screen.findByRole('complementary', { name: 'Task' })
    expect((within(panel).getByLabelText('Title') as HTMLInputElement).value).toBe('Old Chore')
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Retired 1' }).getAttribute('aria-selected')).toBe('true'),
    )
  })
})
