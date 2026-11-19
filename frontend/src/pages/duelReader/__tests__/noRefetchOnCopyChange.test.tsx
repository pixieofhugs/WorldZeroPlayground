// @vitest-environment jsdom
/** Seam: `languageChanged` (copy overrides loading, the copy editor arming) must not refetch. */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { getDuelDetail } from '../../../api/duel'
import i18n from '../../../i18n'
import { useDuelReader } from '../useDuelReader'

vi.mock('../../../api/duel', () => ({ getDuelDetail: vi.fn(async () => new Promise(() => {})) }))
vi.mock('../../../api/praxis', () => ({ getPraxis: vi.fn() }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

describe('useDuelReader', () => {
  it('fetches once, not again when the copy re-renders', async () => {
    renderHook(() => useDuelReader('7'), { wrapper })
    await waitFor(() => expect(getDuelDetail).toHaveBeenCalledTimes(1))

    act(() => {
      i18n.emit('languageChanged', i18n.language)
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(getDuelDetail).toHaveBeenCalledTimes(1)
  })
})
