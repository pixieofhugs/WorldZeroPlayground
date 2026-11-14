// @vitest-environment jsdom
/** A vote control stays live while its cast is in flight (#3093): disabling would drop focus. */
import { renderHook, act } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import '../../../i18n'

vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../pendingCasts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../pendingCasts')>()),
  queueCast: vi.fn(),
  flushPendingCast: vi.fn(),
}))

import { useVote } from '../useVote'

it('useVote reports `saving` false before and after a cast is queued', () => {
  const { result } = renderHook(() => useVote(1))
  expect(result.current.saving).toBe(false)
  act(() => result.current.vote(3))
  expect(result.current.saving).toBe(false)
})
