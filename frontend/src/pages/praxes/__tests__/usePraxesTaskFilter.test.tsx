// @vitest-environment jsdom
/** #1050: usePraxes sends the `?task_id=` it reads, refetches when cleared, and counts it as a filter. */
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../api/praxis', () => ({ listPraxes: vi.fn(async () => []) }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }))
vi.mock('../../../hooks/useFactions', () => ({ useFactions: () => [] }))

import { listPraxes } from '../../../api/praxis'
import { usePraxes } from '../usePraxes'

const at = (entry: string) => ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
)

describe('usePraxes task filter', () => {
  it('sends task_id, reads as filtered when empty, and refetches unfiltered once cleared', async () => {
    const { result } = renderHook(() => usePraxes(), { wrapper: at('/praxis?task_id=7') })
    await waitFor(() =>
      expect(listPraxes).toHaveBeenLastCalledWith(expect.objectContaining({ task_id: 7 })),
    )
    await waitFor(() => expect(result.current.isEmpty).toBe(true))
    expect(result.current.taskId).toBe(7)
    expect(result.current.emptyState).toBe('filtered')

    act(() => result.current.clearTaskFilter())
    await waitFor(() =>
      expect(listPraxes).toHaveBeenLastCalledWith(expect.objectContaining({ task_id: undefined })),
    )
    expect(result.current.taskId).toBeNull()
  })
})
