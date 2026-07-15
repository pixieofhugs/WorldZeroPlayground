/**
 * #491 — the read-once fetch state machine. Tests the extracted pure
 * orchestration (`runResource`): loading→data and loading→error transitions,
 * error-cleared-first on every run (the "clears on refetch" guarantee), and
 * the cancel guard that drops a resolved/rejected result mid-flight.
 */
import { describe, it, expect, vi } from 'vitest'
import { runResource } from '../useResource'

function handlers() {
  const calls: string[] = []
  return {
    calls,
    onStart: vi.fn(() => calls.push('start')),
    onData: vi.fn((d: unknown) => calls.push(`data:${d}`)),
    onError: vi.fn((e: Error) => calls.push(`error:${e.message}`)),
    onSettle: vi.fn(() => calls.push('settle')),
  }
}

describe('runResource', () => {
  it('success: start → data → settle, in order', async () => {
    const h = handlers()
    await runResource(() => Promise.resolve(42), h)
    expect(h.calls).toEqual(['start', 'data:42', 'settle'])
    expect(h.onError).not.toHaveBeenCalled()
  })

  it('failure: start → error → settle, and onStart runs first so a prior error is cleared before the new attempt', async () => {
    const h = handlers()
    await runResource(() => Promise.reject(new Error('boom')), h)
    expect(h.calls).toEqual(['start', 'error:boom', 'settle'])
    expect(h.onData).not.toHaveBeenCalled()
  })

  it('normalizes a non-Error rejection into an Error', async () => {
    const h = handlers()
    await runResource(() => Promise.reject('nope'), h)
    expect(h.onError).toHaveBeenCalledOnce()
    expect(h.onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(h.onError.mock.calls[0][0].message).toBe('nope')
  })

  it('cancel guard: onStart still fires, but onData/onSettle are skipped once cancelled', async () => {
    const h = handlers()
    await runResource(() => Promise.resolve(1), h, () => true)
    expect(h.calls).toEqual(['start'])
    expect(h.onData).not.toHaveBeenCalled()
    expect(h.onSettle).not.toHaveBeenCalled()
  })
})
