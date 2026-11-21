// @vitest-environment jsdom
/** Seam: the console's backdoor ladder (#3848): pure stage text, and TheArray's gate. */
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getBackdoors = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({ faction: 'singularity' }))
vi.mock('../../api/tasks', () => ({ getBackdoors }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: { faction_slug: state.faction } } }),
}))
vi.mock('../../hooks/useGameConfig', () => ({
  useGameConfig: () => ({
    backdoor_hint_stage_days: [30, 60],
    factions: [
      { slug: 'singularity', reads_the_array: true },
      { slug: 'coven', reads_the_array: false },
    ],
    level_thresholds: [],
    level_profiles: [],
  }),
}))

import TheArray, { backdoorHint } from '../TheArray'

const DAY = 86_400_000
const opens = '2026-01-01T00:00:00Z'
const door = { id: 123, title: 'Title', point_value: 20, level_required: 2, backdoor_opens_at: opens }
const at = (days: number) => Date.parse(opens) + days * DAY

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  state.faction = 'singularity'
})

describe('backdoorHint', () => {
  it('is the cipher alone before day 30, and atob gives the task path', () => {
    const lines = backdoorHint(door, at(29), [30, 60])
    expect(lines).toHaveLength(1)
    expect(atob(lines[0].split(' ')[1])).toBe('/tasks/123')
  })

  it('adds the nudge from day 30', () => {
    expect(backdoorHint(door, at(30), [30, 60]).slice(1)).toEqual([
      'the array speaks base64. atob() is listening.',
    ])
  })

  it('adds the plain path from day 60', () => {
    const lines = backdoorHint(door, at(60), [30, 60])
    expect(lines).toHaveLength(3)
    expect(lines[2]).toBe('backdoor open → /tasks/123 "Title" (20 pts)')
  })
})

describe('TheArray backdoor lookup', () => {
  it('prints each open door for a faction that reads the array', async () => {
    getBackdoors.mockResolvedValue([door])
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'table').mockImplementation(() => {})
    render(<TheArray />)
    await waitFor(() => expect(log).toHaveBeenCalledTimes(2))
  })

  it('prints nothing more for an empty list', async () => {
    getBackdoors.mockResolvedValue([])
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'table').mockImplementation(() => {})
    render(<TheArray />)
    await waitFor(() => expect(getBackdoors).toHaveBeenCalled())
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('never asks for another faction', () => {
    state.faction = 'coven'
    render(<TheArray />)
    expect(getBackdoors).not.toHaveBeenCalled()
  })
})
