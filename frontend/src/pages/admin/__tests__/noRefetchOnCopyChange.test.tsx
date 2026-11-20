// @vitest-environment jsdom
/** Seam: `languageChanged` (copy overrides loading, the copy editor arming) must not refetch. */
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '../../../i18n'

const api = vi.hoisted(() => ({
  getEras: vi.fn(async () => []),
  rollIntoEra: vi.fn(),
}))
vi.mock('../../../api/admin', () => api)

import EraTab from '../EraTab'

afterEach(cleanup)

describe.each([['EraTab', EraTab, api.getEras]])('%s', (_name, Tab, fetcher) => {
  it('fetches once, not again when the copy re-renders', async () => {
    render(<Tab />)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    act(() => {
      i18n.emit('languageChanged', i18n.language)
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
