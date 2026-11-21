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
    expect(screen.getByRole('link', { name: /Open in admin/ }).getAttribute('href')).toBe('/admin/tasks?task=7')
    fireEvent.click(screen.getByRole('button', { name: 'retire' }))
    fireEvent.click(screen.getByRole('button', { name: 'retire it' }))
    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledWith(7, 'retired', undefined))
  })
})

describe('TaskStatusControl backdoor', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'backdoor' }))

  it.each(['pending', 'active', 'retired'])('offers Backdoor on %s and sends the window', async (status) => {
    const onChange = vi.fn(async () => {})
    render(<TaskStatusControl status={status} variant="panel" onChange={onChange} />)
    open()
    fireEvent.change(screen.getByLabelText('Closes (optional)'), { target: { value: '2030-01-02T03:04' } })
    fireEvent.click(screen.getByRole('button', { name: 'schedule backdoor' }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const [next, window] = onChange.mock.calls[0] as unknown as [string, { opens?: string; closes?: string }]
    expect(next).toBe('backdoor')
    expect(window.closes).toBe(new Date('2030-01-02T03:04').toISOString())
    expect(window.opens).toBeTruthy()
  })

  it('shows a coded refusal readably', async () => {
    const { ApiError } = await import('../../../api/apiError')
    const onChange = vi.fn(async () => {
      throw new ApiError(new Response(null, { status: 422 }), { detail: { code: 'BACKDOOR_WINDOW_INVALID' } })
    })
    render(<TaskStatusControl status="active" variant="panel" onChange={onChange} />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'schedule backdoor' }))
    expect((await screen.findByRole('alert')).textContent).toBe('A backdoor must close after it opens.')
  })

  it('from a backdoor offers activate and retire, not another backdoor', () => {
    render(<TaskStatusControl status="backdoor" variant="panel" opensAt="2999-01-01T00:00:00Z" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'backdoor' })).toBeNull()
    expect(screen.getByRole('button', { name: 'activate' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'retire' })).toBeTruthy()
    expect(screen.getByText(/Door opens/)).toBeTruthy()
  })
})
