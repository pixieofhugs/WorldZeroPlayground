/**
 * #1867 — both ends of `utils/requestsBus`.
 *
 * THE SEAM is the bus itself, not a rendered panel. A write fires
 * `notifyRequestsChanged()`; the surfaces that show the viewer's own in-flight
 * work subscribe with `onRequestsChanged(refetch)`. A gap at either end is
 * invisible: a notify nobody hears, or a listener nobody notifies.
 *
 * Signing up for a task went through `createPraxis`, which was the one write in
 * `api/praxis.ts` that never rang the bell, so the sidebar's "In progress"
 * panel — and the `{n} of {max}` slot counter derived from the same array —
 * kept the pre-signup list until a hard refresh.
 *
 * WHY HALF OF THIS IS A SOURCE TEST
 * ---------------------------------
 * Vitest runs in the `node` environment with no jsdom, so the harness is
 * `renderToStaticMarkup` and effects never run (`docs/spec/SPEC-testing.md`).
 * The notify half is real behaviour and asserted as such — a stubbed wire, the
 * real `createPraxis`, a real subscriber. The subscribe half cannot be observed
 * that way by anything in this repo, so it is pinned at the source, the same
 * posture as `hooks/__tests__/authDepNarrowing.test.ts`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * The stub goes in via `vi.hoisted`, not `beforeEach`: `openapi-fetch` binds
 * `globalThis.fetch` when the client is CREATED, at `api/client`'s top level,
 * which happens during this file's imports. A later stub is never consulted and
 * the suite silently posts to whatever is listening on localhost:8000 (see
 * `api/client.test.ts`).
 */
vi.hoisted(() => {
  globalThis.fetch = (async () =>
    new Response('{"id":7}', {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
})

import { createPraxis, kickMember, submitPraxis } from '../../api/praxis'
import { onRequestsChanged } from '../requestsBus'

describe('praxis writes that move the viewer’s own in-flight work ring the bus', () => {
  let heard = 0
  let unsubscribe: () => void

  beforeEach(() => {
    heard = 0
    unsubscribe = onRequestsChanged(() => {
      heard += 1
    })
  })

  afterEach(() => unsubscribe())

  it('createPraxis — a signup adds an in-progress praxis to the rail (#1867)', async () => {
    await createPraxis({ task_id: 1, type: 'solo' })
    expect(heard).toBe(1)
  })

  it('kickMember — a kick reopens the whole group, the kicker included (ADR-0013)', async () => {
    await kickMember(7, 9)
    expect(heard).toBe(1)
  })

  it('submitPraxis — the sibling that was always wired, as the control', async () => {
    await submitPraxis(7)
    expect(heard).toBe(1)
  })

  it('stops delivering once unsubscribed', async () => {
    unsubscribe()
    await createPraxis({ task_id: 1, type: 'solo' })
    expect(heard).toBe(0)
    // afterEach unsubscribes again; the Set makes that a no-op.
  })
})

describe('useMyActiveTasks listens as well as keys on the character', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../hooks/useMyActiveTasks.ts'),
    'utf8',
  )

  it('subscribes to the bus, in the shape useSidebarPanels already uses', () => {
    expect(source).toMatch(/return onRequestsChanged\(refetch\)/)
  })

  it('keeps the #1390 character keying — the bus is a SECOND trigger, not a swap', () => {
    // `/auth/me` mints a fresh `CurrentUser` on every refetch, so keying the
    // effect on the auth object would re-request on every unrelated refresh.
    expect(source).toMatch(/\}, \[characterId\]\)/)
    expect(source).toMatch(/user\?\.character\?\.id/)
  })
})
