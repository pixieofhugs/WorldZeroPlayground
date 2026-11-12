/**
 * Room socket retry (#1804). A pre-upgrade 403 has no close frame, so the
 * browser reports 1006, never 1008; the rule is "unbounded only once opened"
 * (queued offline edits, #1743). `attempts` is incremented by y-websocket before
 * the predicate, so the first failure is 1.
 */
import { describe, it, expect } from 'vitest'
import {
  PRE_OPEN_RETRY_LIMIT,
  WS_POLICY_VIOLATION,
  shouldReconnectRoom,
} from '../roomReconnect'

const WS_ABNORMAL_CLOSURE = 1006

describe('shouldReconnectRoom', () => {
  it('gives up on a policy violation the socket never opened for', () => {
    expect(shouldReconnectRoom(WS_POLICY_VIOLATION, 1, false)).toBe(false)
  })

  it('retries an abnormal closure under the pre-open limit', () => {
    expect(
      shouldReconnectRoom(WS_ABNORMAL_CLOSURE, PRE_OPEN_RETRY_LIMIT - 1, false),
    ).toBe(true)
  })

  it('stops retrying an abnormal closure at the pre-open limit', () => {
    expect(
      shouldReconnectRoom(WS_ABNORMAL_CLOSURE, PRE_OPEN_RETRY_LIMIT, false),
    ).toBe(false)
  })

  it('retries an abnormal closure forever once the socket has opened', () => {
    expect(
      shouldReconnectRoom(
        WS_ABNORMAL_CLOSURE,
        PRE_OPEN_RETRY_LIMIT * 100,
        true,
      ),
    ).toBe(true)
  })

  it('still gives up on a policy violation after the socket opened', () => {
    // A member kicked mid-session.
    expect(shouldReconnectRoom(WS_POLICY_VIOLATION, 1, true)).toBe(false)
  })

  it('reconnects after any other post-open close, unbounded', () => {
    // 1008 is the only code the room sends (ADR-0079).
    expect(shouldReconnectRoom(WS_ABNORMAL_CLOSURE, 1, true)).toBe(true)
    expect(
      shouldReconnectRoom(WS_ABNORMAL_CLOSURE, PRE_OPEN_RETRY_LIMIT * 100, true),
    ).toBe(true)
  })
})
