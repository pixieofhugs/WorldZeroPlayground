// @vitest-environment jsdom
/** #1390: `/auth/me` mints a new user object per refetch; a fetch keyed on it re-requests each time. */
import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ user: { character: { id: 3 } } as unknown }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../api/praxis', () => ({ listPraxes: vi.fn(async () => []) }))

import { listPraxes } from '../../api/praxis'
import { notifyRequestsChanged } from '../../utils/requestsBus'
import { useMyActiveTasks } from '../useMyActiveTasks'

it('refetches on the bus and on a new character, never on a new user object', async () => {
  const { rerender } = renderHook(() => useMyActiveTasks())
  await act(async () => {})
  expect(listPraxes).toHaveBeenCalledTimes(1)

  auth.user = { character: { id: 3 } }
  rerender()
  await act(async () => {})
  expect(listPraxes).toHaveBeenCalledTimes(1)

  await act(async () => notifyRequestsChanged())
  expect(listPraxes).toHaveBeenCalledTimes(2)

  auth.user = { character: { id: 4 } }
  rerender()
  await act(async () => {})
  expect(listPraxes).toHaveBeenCalledTimes(3)
})
