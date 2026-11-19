// @vitest-environment jsdom
/**
 * Loading copy overrides and arming the copy editor both emit `languageChanged`.
 * With `t` in its deps the fetch re-ran and blanked the page each time.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { listCharacters } from '../../../api/characters'
import i18n from '../../../i18n'
import { useFactionDetail } from '../useFactionDetail'

vi.mock('../../../api/characters', () => ({ listCharacters: vi.fn(async () => []) }))
vi.mock('../../../api/tasks', () => ({ listTasks: vi.fn(async () => []) }))
vi.mock('../../../api/praxis', () => ({ listPraxes: vi.fn(async () => []) }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: null, applyUser: () => {} }) }))
vi.mock('../../../hooks/useFactions', () => ({ useFactions: () => [] }))
vi.mock('../../../hooks/useTaskSignup', () => ({
  useTaskSignup: () => ({ signupMsg: null, handleSignup: undefined }),
}))
vi.mock('../../../components/backdrop/BackdropContext', () => ({ useFactionBackdrop: () => {} }))

describe('useFactionDetail', () => {
  it('fetches once, not again when the copy re-renders', async () => {
    renderHook(() => useFactionDetail('everymen'))
    await waitFor(() => expect(listCharacters).toHaveBeenCalledTimes(1))

    act(() => {
      i18n.emit('languageChanged', i18n.language)
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(listCharacters).toHaveBeenCalledTimes(1)
  })
})
