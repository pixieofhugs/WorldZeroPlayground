// @vitest-environment jsdom
/**
 * #3579 — publish seals the server's document, so it must wait until the
 * server holds this browser's offline edits (`setRoomUnsent`), not post at once.
 */
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
import { setRoomUnsent } from '../roomStore'

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

afterEach(() => {
  setRoomUnsent(1, false)
  submit.mockClear()
})

it('holds the submit while offline edits are unsent, then posts once they reach the server', async () => {
  const { result } = renderHook(() => useEditPraxis('1'), { wrapper })
  await waitFor(() => expect(result.current.praxis).not.toBeNull())

  setRoomUnsent(1, true)
  let done!: Promise<void>
  void act(async () => {
    done = result.current.publish()
  })
  await new Promise((r) => setTimeout(r, 250))
  expect(submit).not.toHaveBeenCalled()

  setRoomUnsent(1, false)
  await act(async () => { await done })
  expect(submit).toHaveBeenCalledTimes(1)
})
