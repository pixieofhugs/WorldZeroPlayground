// @vitest-environment jsdom
/** Seam: the one status control, in both of its mounts — the card's mod strip and the panel. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import { aTask } from '../../../test/fixtures'

const updateTaskStatus = vi.hoisted(() => vi.fn(async (_id: number, status: string) => ({ status })))
vi.mock('../../../api/admin', () => ({ updateTaskStatus }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: { is_admin: true } }) }))
vi.mock('../../../auth/AdminModeContext', () => ({ useAdminMode: () => ({ adminMode: true }) }))

import TaskStatusControl from '../TaskStatusControl'
import TaskCard from '../../taskCard/TaskCard'

window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TaskStatusControl', () => {
  it.each(['strip', 'panel'] as const)('%s: pending offers both, retire confirms', (variant) => {
    const onChange = vi.fn()
    render(<TaskStatusControl status="pending" variant={variant} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'activate' }))
    expect(onChange).toHaveBeenLastCalledWith('active')
    fireEvent.click(screen.getByRole('button', { name: 'retire' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'keep' }))
    fireEvent.click(screen.getByRole('button', { name: 'retire' }))
    fireEvent.click(screen.getByRole('button', { name: 'retire it' }))
    expect(onChange).toHaveBeenLastCalledWith('retired')
  })

  it('renders nothing for a deleted task', () => {
    const { container } = render(<TaskStatusControl status="deleted" variant="panel" onChange={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('TaskCard in mod mode', () => {
  it('mounts the control and links to the task’s admin panel', async () => {
    render(
      <MemoryRouter>
        <TaskCard task={aTask({ id: 7 })} basePoints={18} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Open in admin ↗' }).getAttribute('href')).toBe('/admin/tasks?task=7')
    fireEvent.click(screen.getByRole('button', { name: 'retire' }))
    fireEvent.click(screen.getByRole('button', { name: 'retire it' }))
    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith(7, 'retired'))
  })
})
