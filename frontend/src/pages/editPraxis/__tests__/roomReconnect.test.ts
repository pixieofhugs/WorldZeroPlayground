/**
 * Retrying a praxis room's socket (#1804) — the pure seam.
 *
 * The production defect: `shouldReconnect` tested the close code for 1008, but
 * a handshake refused *before* the upgrade is an HTTP 403 with no close frame,
 * so the browser reports **1006**. `1006 !== 1008` returned `true` forever and
 * y-websocket re-tried every ~2.5s for as long as the tab was open.
 *
 * The rule that replaced it is "reconnect only if the socket ever opened",
 * which the four cases below pin from both sides. Case 3 is the storm itself;
 * case 4 is what a naive "never retry on 1006" fix would break — those are
 * queued offline edits (#1743) that must still sync.
 *
 * `attempts` is `provider.wsUnsuccessfulReconnects`, which y-websocket
 * increments *before* consulting the predicate, so the first failure arrives
 * here as 1.
 */
import { describe, it, expect } from 'vitest'
import {
  PRE_OPEN_RETRY_LIMIT,
  WS_POLICY_VIOLATION,
  WS_ROOM_FROZEN,
  isRoomSealedClose,
  shouldReconnectRoom,
} from '../roomReconnect'

/** A close with no frame behind it: the browser's abnormal-closure code. */
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
    // The storm. A pre-accept 403 reports 1006 and can never report anything
    // else, so nothing but a ceiling ends this.
    expect(
      shouldReconnectRoom(WS_ABNORMAL_CLOSURE, PRE_OPEN_RETRY_LIMIT, false),
    ).toBe(false)
  })

  it('retries an abnormal closure forever once the socket has opened', () => {
    // Unbounded on purpose: offline authoring holds the edits locally and they
    // only reach the praxis when the room comes back.
    expect(
      shouldReconnectRoom(
        WS_ABNORMAL_CLOSURE,
        PRE_OPEN_RETRY_LIMIT * 100,
        true,
      ),
    ).toBe(true)
  })

  it('still gives up on a policy violation after the socket opened', () => {
    // Door two: a member kicked mid-session. Permanent, and re-asking cannot
    // change the answer.
    expect(shouldReconnectRoom(WS_POLICY_VIOLATION, 1, true)).toBe(false)
  })

  it('reconnects after the room is sealed, so the sealed text can be read back', () => {
    // 4001 is NOT 1008 on purpose (#1808/#1923): the member is still a member
    // and the server still answers their `SYNC_STEP1`, so the room must come
    // back or the write-up they just sealed is off their screen for good.
    // Unbounded like any other post-open close — the seal is told to them by
    // `isRoomSealedClose` below, not by refusing to reconnect.
    expect(shouldReconnectRoom(WS_ROOM_FROZEN, 1, true)).toBe(true)
    expect(
      shouldReconnectRoom(WS_ROOM_FROZEN, PRE_OPEN_RETRY_LIMIT * 100, true),
    ).toBe(true)
  })
})

describe('isRoomSealedClose', () => {
  it('recognises the code the room hangs up with when a praxis freezes', () => {
    // The wire contract: `_WS_ROOM_FROZEN` in `backend/services/praxis_room.py`,
    // where a backend test pins the literal as well as the constant.
    expect(WS_ROOM_FROZEN).toBe(4001)
    expect(isRoomSealedClose(WS_ROOM_FROZEN)).toBe(true)
  })

  it('reads nothing into the codes that mean something else', () => {
    // A drop and a kick are not a seal. Only 4001 says "the praxis froze under
    // you"; anything else that reached this would freeze an editor that is
    // still perfectly writable.
    expect(isRoomSealedClose(WS_ABNORMAL_CLOSURE)).toBe(false)
    expect(isRoomSealedClose(WS_POLICY_VIOLATION)).toBe(false)
    expect(isRoomSealedClose(1000)).toBe(false)
  })
})
