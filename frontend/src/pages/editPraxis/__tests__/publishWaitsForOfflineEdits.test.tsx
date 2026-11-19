// @vitest-environment jsdom
/**
 * #3579 — publish seals the server's document, so it must wait until the
 * server holds this browser's offline edits (`trackRoomDelivery`), not post at once.
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
import { trackRoomDelivery } from '../roomStore'

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

let untrack = () => {}
afterEach(() => {
  untrack()
  submit.mockClear()
})

it('holds the submit until delivery is proven, and refuses when it is not', async () => {
  let prove!: (ok: boolean) => void
  untrack = trackRoomDelivery(1, () => new Promise<boolean>((r) => { prove = r }))
  const { result } = renderHook(() => useEditPraxis('1'), { wrapper })
  await waitFor(() => expect(result.current.praxis).not.toBeNull())

  let done!: Promise<void>
  void act(async () => {
    done = result.current.publish()
  })
  await new Promise((r) => setTimeout(r, 50))
  expect(submit).not.toHaveBeenCalled()
  await act(async () => { prove(false); await done })
  expect(submit).not.toHaveBeenCalled()

  void act(async () => {
    done = result.current.publish()
  })
  await act(async () => { prove(true); await done })
  expect(submit).toHaveBeenCalledTimes(1)
})
