/**
 * The client's half of the freeze (#1931) — the pure seam.
 *
 * #1808's server half (PR #1923) hangs up every socket on a praxis the moment
 * it freezes, with close code 4001. The client reconnected and carried on as
 * if nothing had happened: `documentFrozen` is derived from the *fetched*
 * praxis and nothing refetched it, so the holdout kept typing into a room the
 * server was dropping every update from. The text was on screen, so they
 * believed it was saved. **It was not, and it cannot be recovered** — Yjs
 * merges additively, the server never accepted the update, and it exists only
 * in that tab's memory.
 *
 * These three functions are that gap closed, extracted the way #1804 extracted
 * `shouldReconnectRoom`: the composer's harness is `renderToStaticMarkup`, no
 * DOM and no effects, so the rule has to be callable to be provable.
 *
 * The chain each test walks is the production one:
 *   a 4001 close → `documentIsFrozen` → `composerWritable` → the editor.
 */
import { describe, it, expect, vi } from 'vitest'
import { WS_ROOM_FROZEN, isRoomSealedClose } from '../roomReconnect'
import { applyRoomSeal, composerWritable, documentIsFrozen } from '../roomSeal'
import type { PraxisOut } from '../../../api/praxis'

const drafting = { id: 7, status: 'in_progress' } as unknown as PraxisOut
const sealed = { id: 7, status: 'submitted' } as unknown as PraxisOut

describe('documentIsFrozen', () => {
  it('freezes on a seal close before any refetch can land', () => {
    // The whole point. The praxis in hand still says `in_progress` — it is the
    // row that was fetched at mount, and the freeze happened after it. The
    // close code is the newer fact, so it wins, and it wins IMMEDIATELY: every
    // keystroke between the hang-up and the response would be lost silently.
    expect(isRoomSealedClose(WS_ROOM_FROZEN), 'the trigger').toBe(true)
    expect(documentIsFrozen(drafting, true)).toBe(true)
  })

  it('keeps the freeze when the refetch never arrives', () => {
    // Failure-safe on purpose. A refetch that 500s or times out leaves the
    // stale `in_progress` row in hand, and deriving the freeze from that alone
    // would hand the editor back to a member whose typing goes nowhere — the
    // exact loss this issue exists to end.
    expect(documentIsFrozen(null, true)).toBe(true)
  })

  it('freezes on the fetched status, seal close or not', () => {
    // The pre-existing rule (#1745), unchanged: the server's own predicate,
    // reached by a member who loads an already-frozen praxis and never saw a
    // close at all.
    expect(documentIsFrozen(sealed, false)).toBe(true)
  })

  it('leaves a live draft writable', () => {
    expect(documentIsFrozen(drafting, false)).toBe(false)
    // Nothing loaded yet is not frozen — it is not anything. The composer is
    // held shut by `seeded` until the document arrives.
    expect(documentIsFrozen(null, false)).toBe(false)
  })
})

describe('composerWritable', () => {
  it('refuses the keystroke once the document is frozen', () => {
    expect(composerWritable(true, documentIsFrozen(drafting, true))).toBe(false)
  })

  it('takes text from a seeded, unfrozen room', () => {
    expect(composerWritable(true, documentIsFrozen(drafting, false))).toBe(true)
  })

  it('refuses until the document has arrived, frozen or not', () => {
    // "Not yet" and "not now" are different refusals (see `controls.tsx`), and
    // neither may be mistaken for permission.
    expect(composerWritable(false, false)).toBe(false)
    expect(composerWritable(false, true)).toBe(false)
  })
})

describe('applyRoomSeal', () => {
  it('reads the praxis back so the rest of the composer catches up', async () => {
    // The freeze is already on by the time this runs. What the refetch buys is
    // everything else the sealed row carries — the status the footer reads, and
    // the way back in.
    const fetchPraxis = vi.fn().mockResolvedValue(sealed)
    const setPraxis = vi.fn()
    await applyRoomSeal(7, fetchPraxis, setPraxis)
    expect(fetchPraxis).toHaveBeenCalledWith(7)
    expect(setPraxis).toHaveBeenCalledWith(sealed)
  })

  it('swallows a failed read rather than letting it surface as an error', async () => {
    // Nothing the member did failed, so there is nothing to report to them —
    // and the freeze does not depend on this call succeeding.
    const setPraxis = vi.fn()
    await expect(
      applyRoomSeal(7, vi.fn().mockRejectedValue(new Error('offline')), setPraxis),
    ).resolves.toBeUndefined()
    expect(setPraxis).not.toHaveBeenCalled()
  })
})
