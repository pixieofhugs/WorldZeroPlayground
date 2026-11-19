// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { scrollNeeded } from './fitStage'
import Beat5 from './beats/Beat5'

vi.mock('../../components/praxisCard/PraxisCard', () => ({ default: () => null }))

describe('scrollNeeded', () => {
  it('is 0 when the control already sits above the box', () => {
    expect(scrollNeeded(300, 500)).toBe(0)
  })
  it('scrolls by the overlap plus the gap when the box covers the control', () => {
    expect(scrollNeeded(520, 500)).toBe(32)
  })
})

describe('Beat5 reveal timing', () => {
  const rect = (bottom: number, top = bottom) => ({ bottom, top }) as DOMRect

  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<div class="ob-stage"><button aria-pressed="false"></button></div><div class="ob-box"></div>'
    document.querySelector('button')!.getBoundingClientRect = () => rect(520)
    document.querySelector('.ob-box')!.getBoundingClientRect = () => rect(500)
    window.scrollBy = vi.fn() as unknown as typeof window.scrollBy
  })
  afterEach(() => vi.useRealTimers())

  it('does not scroll until the last judge has landed, then scrolls once', () => {
    const { unmount } = render(<Beat5 confidence={0.5} />)
    vi.advanceTimersByTime(3200)
    expect(window.scrollBy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(window.scrollBy).toHaveBeenCalledTimes(1)
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 32, behavior: 'smooth' })
    vi.advanceTimersByTime(10000)
    expect(window.scrollBy).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('clears the timer on unmount', () => {
    render(<Beat5 confidence={0.5} />).unmount()
    vi.advanceTimersByTime(10000)
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('scrolls at once, without smoothing, when motion is off', () => {
    document.documentElement.dataset.motion = 'off'
    render(<Beat5 confidence={0.5} />)
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 32, behavior: 'auto' })
    delete document.documentElement.dataset.motion
  })
})
