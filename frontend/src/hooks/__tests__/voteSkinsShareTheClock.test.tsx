// @vitest-environment jsdom
/** A private clock or OS query in a JS-driven vote skin would escape the motion switch (#2622). */
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../i18n'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, refetch: async () => {} }),
}))
vi.mock('../useMotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useMotion')>()
  return { ...actual, useMotionTick: vi.fn(actual.useMotionTick) }
})

import AlbescentVote from '../../components/vote/AlbescentVote'
import SingularityVote from '../../components/vote/SingularityVote'
import { MotionProvider, useMotionTick } from '../useMotion'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the two JS-driven vote skins read the shared clock', () => {
  for (const [name, Skin] of [
    ['AlbescentVote', AlbescentVote],
    ['SingularityVote', SingularityVote],
  ] as const) {
    it(`${name} runs exactly the shared tick: one timer, no matchMedia`, () => {
      vi.useFakeTimers()
      const matchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      vi.stubGlobal('matchMedia', matchMedia)
      render(<MotionProvider>{null}</MotionProvider>).unmount()
      const providerReads = matchMedia.mock.calls.length
      vi.mocked(useMotionTick).mockClear()

      const { unmount } = render(
        <MotionProvider>
          <Skin praxisId={7} points={16} totalVotes={4} />
        </MotionProvider>,
      )

      expect(useMotionTick).toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(1)
      expect(matchMedia.mock.calls.length - providerReads).toBe(providerReads)
      unmount()
    })
  }
})
