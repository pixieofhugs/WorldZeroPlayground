// @vitest-environment jsdom
/** #3611 — publish carries the browser's room state, so the seal can't miss offline edits. */
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { aPraxis } from '../../../test/fixtures'

const submit = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => () => undefined,
}))
vi.mock('../../../api/praxis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/praxis')>()),
  takeJustCreatedPraxis: () => null,
  getPraxis: vi.fn(async () => aPraxis({ status: 'in_progress' })),
  submitPraxis: submit,
}))
vi.mock('../../../api/tasks', () => ({ getTask: vi.fn(async () => ({})) }))
vi.mock('../../../api/metatasks', () => ({ listMetatasks: vi.fn(async () => []) }))
vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: { id: 3 } }, loading: false, refetch: async () => undefined }),
}))

import { useEditPraxis } from '../useEditPraxis'
import { trackRoomState } from '../roomStore'

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

let untrack = () => {}
afterEach(() => {
  untrack()
  submit.mockClear()
})

it('sends the open room state with the submit', async () => {
  untrack = trackRoomState(1, () => 'c3RhdGU=')
  const { result } = renderHook(() => useEditPraxis('1'), { wrapper })
  await waitFor(() => expect(result.current.praxis).not.toBeNull())
  void act(async () => {
    void result.current.publish()
  })
  await waitFor(() => expect(submit).toHaveBeenCalled())
  expect(submit).toHaveBeenCalledWith(1, 'c3RhdGU=')
})
