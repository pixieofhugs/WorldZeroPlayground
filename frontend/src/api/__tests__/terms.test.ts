/**
 * What the terms card's accept action actually puts on the wire (#1861).
 *
 * The seam is the `Request` handed to `fetch`. `tsc` proves the path exists in
 * the generated schema; it says nothing about the two things that would be
 * silently wrong here:
 *
 *   1. **The method and the path.** A consent log that never gets written is a
 *      201 nobody sees — the card navigates on to character creation either
 *      way, so a wrong target looks exactly like a working one.
 *   2. **The absence of a body.** The route takes none on purpose: the version
 *      is the server's constant, so a client cannot claim to have agreed to
 *      wording it was never shown. Sending one back would be the first step to
 *      the client owning a version it has no business owning.
 *
 * The fetch stub goes in via `vi.hoisted` for the reason `praxisRequests.test`
 * documents: `openapi-fetch` binds `globalThis.fetch` when the client is
 * CREATED, at `../client`'s top level — i.e. during this file's imports.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { acceptTerms } from '../terms'

const wire = vi.hoisted(() => {
  const sent: Request[] = []

  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return new Response(JSON.stringify({ version: 'v1', accepted_at: '2026-08-16T00:00:00Z' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch

  return { sent }
})

beforeEach(() => {
  wire.sent.length = 0
})

describe('acceptTerms', () => {
  it('POSTs the consent endpoint', async () => {
    await acceptTerms()

    expect(wire.sent).toHaveLength(1)
    expect(wire.sent[0].method).toBe('POST')
    expect(new URL(wire.sent[0].url).pathname).toBe('/terms/acceptance')
  })

  it('sends no body — the version is the server’s to state, not the client’s', async () => {
    await acceptTerms()

    expect(await wire.sent[0].text()).toBe('')
  })

  it('returns the receipt the server answers with', async () => {
    expect(await acceptTerms()).toEqual({ version: 'v1', accepted_at: '2026-08-16T00:00:00Z' })
  })
})
