// @vitest-environment jsdom
/**
 * #1379 — two mount-time claims, rendered: the seal list does not wait on the
 * praxis, and the archetype chunk warms from the praxis before `getTask` lands
 * without changing which archetype renders.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'

import { aPraxis, aTask } from '../../../test/fixtures'

const pending = vi.hoisted(() => ({
  praxis: undefined as undefined | ((value: unknown) => void),
  task: undefined as undefined | ((value: unknown) => void),
}))
const Coven = () => 'COVEN'
const Snide = () => 'SNIDE'

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: { id: 3 } }, loading: false, refetch: async () => {} }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../../api/metatasks', () => ({ listMetatasks: vi.fn(async () => []) }))
vi.mock('../../../api/tasks', () => ({
  getTask: vi.fn(() => new Promise((resolve) => (pending.task = resolve))),
}))
vi.mock('../../../api/praxis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/praxis')>()),
  takeJustCreatedPraxis: () => null,
  getPraxis: vi.fn(() => new Promise((resolve) => (pending.praxis = resolve))),
}))
vi.mock('../../../factions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../factions')>()),
  surfaceMap: () => ({ coven: Coven, snide: Snide, na: () => 'NA' }),
}))
vi.mock('../../../factions/lazyArchetype', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../factions/lazyArchetype')>()),
  preloadArchetype: vi.fn(),
}))
vi.mock('../praxisRoom', () => ({
  PraxisRoomProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import EditPraxis from '../../EditPraxis'
import { listMetatasks } from '../../../api/metatasks'
import { preloadArchetype } from '../../../factions/lazyArchetype'

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/praxis/1/edit']}>
      <Routes>
        <Route path="/praxis/:id/edit" element={<EditPraxis />} />
      </Routes>
    </MemoryRouter>,
  )
const settle = () => act(async () => {})

afterEach(cleanup)
beforeEach(() => {
  vi.mocked(listMetatasks).mockClear()
  vi.mocked(preloadArchetype).mockClear()
})

describe('the composer mount does not serialise its reads', () => {
  it('fetches the seal list before the praxis answers', async () => {
    mount()
    await settle()
    expect(listMetatasks).toHaveBeenCalledTimes(1)
  })

  it('warms the praxis-slug archetype while getTask is pending, then renders the task-slug one', async () => {
    mount()
    await settle()
    await act(async () =>
      pending.praxis!(
        aPraxis({ id: 1, task_faction_slug: 'coven', status: 'in_progress', members: [{ character_id: 3 }] as never }),
      ),
    )
    expect(preloadArchetype).toHaveBeenLastCalledWith(Coven)
    expect(screen.queryByText('COVEN')).toBeNull()

    await act(async () => pending.task!(aTask({ primary_faction_slug: 'snide' })))
    await settle()
    expect(await screen.findByText('SNIDE')).toBeTruthy()
  })
})
