/**
 * The seam: the one-slot handoff between `createPraxis` and the composer it
 * navigates to (#1379).
 *
 * Every signup does `createPraxis(...)` then `navigate('/praxis/{id}/edit')`,
 * and the composer opened by reading the same row straight back. `POST /praxes`
 * and `GET /praxes/{id}` both return `build_praxis_out(praxis, viewer=...)`, so
 * that read was a round trip for a payload the client already held — the first
 * link of the deepest waterfall in the app.
 *
 * What this file proves is the slot's contract, which is where the danger is: a
 * carried payload that outlives its navigation would be shown as if it were
 * fresh. It cannot prove request counts — there is no DOM here and effects
 * never run (see `docs/spec/SPEC-testing.md`); `composerWaterfall.test.ts`
 * carries that part as a source ratchet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPraxis, takeJustCreatedPraxis, type PraxisOut } from '../praxis'

const post = vi.fn()

// Hoisted above the import above by vitest's transform, so `praxis.ts` binds
// this instead of the real client. No server, no DOM — the slot is the subject.
vi.mock('../axios', () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
  },
}))

/** Only the id is read by the slot; the rest of the row travels untouched. */
function praxisRow(id: number): PraxisOut {
  return { id, title: `praxis ${id}` } as unknown as PraxisOut
}

beforeEach(() => {
  post.mockReset()
  // Drain anything a previous test parked, so each case starts empty.
  takeJustCreatedPraxis(-1)
})

describe('takeJustCreatedPraxis', () => {
  it('hands the composer the row the signup just created', async () => {
    post.mockResolvedValueOnce({ data: praxisRow(7) })
    const created = await createPraxis({ task_id: 1, type: 'solo' })

    expect(takeJustCreatedPraxis(7)).toBe(created)
  })

  it('is empty when nothing was created — the composer falls back to the read', () => {
    expect(takeJustCreatedPraxis(7)).toBeNull()
  })

  it('gives the row away once and only once', async () => {
    post.mockResolvedValueOnce({ data: praxisRow(7) })
    await createPraxis({ task_id: 1, type: 'solo' })

    expect(takeJustCreatedPraxis(7)).not.toBeNull()
    // A remount, or a return to this composer after editing elsewhere, must
    // re-read the server rather than replay a payload that has had time to rot.
    expect(takeJustCreatedPraxis(7)).toBeNull()
  })

  it('refuses to hand one praxis row to a different praxis', async () => {
    post.mockResolvedValueOnce({ data: praxisRow(7) })
    await createPraxis({ task_id: 1, type: 'solo' })

    expect(takeJustCreatedPraxis(8)).toBeNull()
  })

  it('clears the slot on a miss, so a later id can never collect a stale row', async () => {
    post.mockResolvedValueOnce({ data: praxisRow(7) })
    await createPraxis({ task_id: 1, type: 'solo' })

    takeJustCreatedPraxis(8)
    expect(takeJustCreatedPraxis(7)).toBeNull()
  })

  it('keeps only the latest create — two signups in a row cannot cross', async () => {
    post.mockResolvedValueOnce({ data: praxisRow(7) })
    await createPraxis({ task_id: 1, type: 'solo' })
    post.mockResolvedValueOnce({ data: praxisRow(9) })
    await createPraxis({ task_id: 2, type: 'solo' })

    expect(takeJustCreatedPraxis(7)).toBeNull()
  })
})
