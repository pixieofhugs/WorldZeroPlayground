// @vitest-environment jsdom
/** #1390: `/auth/me` mints a new user object per refetch; a fetch keyed on it re-requests each time. */
import type { ReactNode } from 'react'
import { act, render, renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  user: { character: { id: 3 } } as unknown,
  loading: false,
  refetch: async () => {},
}))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../api/sidebar', () => ({ getSidebar: vi.fn(async () => ({})) }))
vi.mock('../../api/relationships', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/relationships')>()),
  listRelationships: vi.fn(async () => []),
  listBlocks: vi.fn(async () => []),
}))
vi.mock('../../api/metatasks', () => ({ listMetatasks: vi.fn(async () => []) }))
vi.mock('../../api/characters', () => ({
  getCharacter: vi.fn(() => new Promise(() => {})),
  listCharacters: vi.fn(async () => []),
}))
vi.mock('../../api/tasks', () => ({ getTask: vi.fn(async () => ({})), listTasks: vi.fn(async () => []) }))
vi.mock('../../api/comments', () => ({ listComments: vi.fn(async () => []) }))
vi.mock('../../api/praxis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/praxis')>()),
  takeJustCreatedPraxis: () => null,
  getPraxis: vi.fn(async () => ({ members: [{ character_id: 3 }], media_items: [], task_id: 1 })),
  listPraxes: vi.fn(async () => []),
}))

import { getSidebar } from '../../api/sidebar'
import { listBlocks, listRelationships } from '../../api/relationships'
import { listMetatasks } from '../../api/metatasks'
import { getPraxis, listPraxes } from '../../api/praxis'
import CharacterProfile from '../../pages/CharacterProfile'
import { useComposerRoster } from '../../pages/editPraxis/useComposerRoster'
import { useEditPraxis } from '../../pages/editPraxis/useEditPraxis'
import { useTaskDetail } from '../../pages/taskDetail/useTaskDetail'
import { notifyRequestsChanged } from '../../utils/requestsBus'
import { SidebarProvider } from '../useSidebarPanels'
import { useMyActiveTasks } from '../useMyActiveTasks'

const router = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>
const settle = () => act(async () => {})

/** Same character, new object: what every `/auth/me` refetch produces. */
async function refetchSameCharacter(rerender: () => void) {
  auth.user = { character: { id: (auth.user as { character: { id: number } }).character.id } }
  rerender()
  await settle()
}

it('useMyActiveTasks refetches on the bus and on a new character, never on a new user object', async () => {
  auth.user = { character: { id: 3 } }
  vi.mocked(listPraxes).mockClear()
  const { rerender } = renderHook(() => useMyActiveTasks())
  await settle()
  expect(listPraxes).toHaveBeenCalledTimes(1)

  await refetchSameCharacter(rerender)
  expect(listPraxes).toHaveBeenCalledTimes(1)

  await act(async () => notifyRequestsChanged())
  expect(listPraxes).toHaveBeenCalledTimes(2)

  auth.user = { character: { id: 4 } }
  rerender()
  await settle()
  expect(listPraxes).toHaveBeenCalledTimes(3)
})

describe('useSidebarPanels settles on a value a refetch cannot disturb', () => {
  const mount = () => {
    auth.user = { character: { id: 3 } }
    auth.loading = false
    vi.mocked(getSidebar).mockClear()
    return renderHook(() => null, { wrapper: ({ children }) => <SidebarProvider>{children}</SidebarProvider> })
  }

  it('does not refetch for a new user object, nor double-fetch on the first settle', async () => {
    const { rerender } = mount()
    await settle()
    expect(getSidebar).toHaveBeenCalledTimes(1)
    await refetchSameCharacter(rerender)
    expect(getSidebar).toHaveBeenCalledTimes(1)
  })

  it('refetches once the session genuinely changes after settling', async () => {
    const { rerender } = mount()
    await settle()
    auth.user = { character: { id: 4 } }
    rerender()
    await settle()
    expect(getSidebar).toHaveBeenCalledTimes(2)
  })

  it('does not treat the first resolution after auth loading as a change', async () => {
    const { rerender } = mount()
    auth.loading = true
    rerender()
    await settle()
    auth.loading = false
    rerender()
    await settle()
    expect(getSidebar).toHaveBeenCalledTimes(1)
  })
})

it('CharacterProfile reads the viewer-keyed relationship and blocks once per character, not per user object', async () => {
  auth.user = { character: { id: 3 } }
  vi.mocked(listRelationships).mockClear()
  vi.mocked(listBlocks).mockClear()
  const tree = () => (
    <MemoryRouter initialEntries={['/characters/9']}>
      <Routes>
        <Route path="/characters/:id" element={<CharacterProfile />} />
      </Routes>
    </MemoryRouter>
  )
  const { rerender } = render(tree())
  await settle()
  expect(listRelationships).toHaveBeenCalledTimes(1)
  await refetchSameCharacter(() => rerender(tree()))
  expect(listRelationships).toHaveBeenCalledTimes(1)
  expect(listBlocks).toHaveBeenCalledTimes(1)
})

it('useEditPraxis loads the praxis and seals once, not once per user object', async () => {
  auth.user = { character: { id: 3 } }
  vi.mocked(getPraxis).mockClear()
  vi.mocked(listMetatasks).mockClear()
  const { rerender } = renderHook(() => useEditPraxis('1'), { wrapper: router })
  await settle()
  expect(getPraxis).toHaveBeenCalledTimes(1)
  expect(listMetatasks).toHaveBeenCalledTimes(1)
  await refetchSameCharacter(rerender)
  expect(getPraxis).toHaveBeenCalledTimes(1)
  expect(listMetatasks).toHaveBeenCalledTimes(1)
})

it('useComposerRoster reads foes once, not once per user object', async () => {
  auth.user = { character: { id: 3 } }
  vi.mocked(listRelationships).mockClear()
  const { rerender } = renderHook(
    () => useComposerRoster({ praxis: null, duelPane: { duel: null, paneOpen: false } }),
  )
  await settle()
  expect(listRelationships).toHaveBeenCalledTimes(1)
  await refetchSameCharacter(rerender)
  expect(listRelationships).toHaveBeenCalledTimes(1)
})

describe('useTaskDetail asks for relationships once', () => {
  it('makes a single unfiltered listRelationships call, and not again for a new user object', async () => {
    auth.user = { character: { id: 3 } }
    vi.mocked(listRelationships).mockReset().mockResolvedValue([])
    const { rerender } = renderHook(() => useTaskDetail('5'), { wrapper: router })
    await settle()
    expect(listRelationships).toHaveBeenCalledTimes(1)
    expect(vi.mocked(listRelationships).mock.calls[0]).toEqual([])
    await refetchSameCharacter(rerender)
    expect(listRelationships).toHaveBeenCalledTimes(1)
  })

  it('still separates friends from foes, active only', async () => {
    auth.user = { character: { id: 3 } }
    const edge = (to: number, type: string, status: string) => ({ to_character_id: to, type, status })
    vi.mocked(listRelationships).mockReset().mockResolvedValue([
      edge(1, 'friend', 'active'),
      edge(2, 'foe', 'active'),
      edge(3, 'foe', 'pending'),
    ] as never)
    const { result } = renderHook(() => useTaskDetail('5'), { wrapper: router })
    await settle()
    expect([...result.current.friends]).toEqual([1])
    expect([...result.current.foes]).toEqual([2])
  })
})
