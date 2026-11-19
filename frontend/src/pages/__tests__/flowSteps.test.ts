import { describe, it, expect } from 'vitest'
import { back, initialFlow, next, skip, toSignIn, type Flow } from '../onboarding/flowSteps'

const times = (f: Flow, n: number) => Array.from({ length: n }).reduce<Flow>((acc) => next(acc), f)

describe('flowSteps', () => {
  it('walks title, 1 to 7, then the contract', () => {
    expect(times(initialFlow(false), 1).step).toBe(1)
    expect(times(initialFlow(false), 7).step).toBe(7)
    expect(times(initialFlow(false), 8).step).toBe('contract')
    expect(next(times(initialFlow(false), 8)).step).toBe('contract')
  })

  it('Back retraces the same path to the title', () => {
    let f = times(initialFlow(false), 8)
    const seen = [f.step]
    for (let i = 0; i < 8; i++) seen.push((f = back(f)).step)
    expect(seen).toEqual(['contract', 7, 6, 5, 4, 3, 2, 1, 'title'])
    expect(back(f)).toBe(f)
  })

  it('Back after Skip returns to the beat it was pressed on', () => {
    const f = skip(times(initialFlow(false), 3))
    expect(f.step).toBe('contract')
    expect(back(f).step).toBe(3)
  })

  it('Back after the header Sign in returns to where the player was', () => {
    expect(back(toSignIn(times(initialFlow(false), 2))).step).toBe(2)
  })

  it('an OAuth resume starts at the contract', () => {
    expect(initialFlow(true).step).toBe('contract')
  })
})
