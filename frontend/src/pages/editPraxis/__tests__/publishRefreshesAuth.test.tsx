// @vitest-environment jsdom
/**
 * #3102 — publish awaits the `/auth/me` refetch after the submit and before the
 * solo exit, so a newcomer who just reached the vote level sees stars unreloaded.
 */
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { aPraxis } from '../../../test/fixtures'

const calls = vi.hoisted(() => [] as string[])
const praxis = vi.hoisted(() => ({ value: null as unknown }))
const navigate = vi.hoisted(() => (to: string) => void calls.push(`navigate ${to}`))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))
vi.mock('../../../api/praxis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/praxis')>()),
  takeJustCreatedPraxis: () => null,
  getPraxis: vi.fn(async () => praxis.value),
  submitPraxis: vi.fn(async () => void calls.push('submit')),
}))
vi.mock('../../../api/tasks', () => ({ getTask: vi.fn(async () => ({})) }))
vi.mock('../../../api/metatasks', () => ({ listMetatasks: vi.fn(async () => []) }))
vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
const auth = vi.hoisted(() => ({
  user: { character: { id: 3 } },
  loading: false,
  refetch: async () => void calls.push('refetch'),
}))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => auth }))

import { useEditPraxis } from '../useEditPraxis'

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

it('publish runs submit, then the auth refetch, then the exit', async () => {
  praxis.value = aPraxis({ status: 'in_progress' })
  const { result } = renderHook(() => useEditPraxis('1'), { wrapper })
  await waitFor(() => expect(result.current.praxis).not.toBeNull())

  await act(() => result.current.publish())

  expect(calls).toEqual(['submit', 'refetch', 'navigate /praxis/1'])
})
