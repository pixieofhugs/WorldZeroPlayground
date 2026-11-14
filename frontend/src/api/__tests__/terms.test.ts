/**
 * #1861 — the accept action's wire shape. A wrong target 201s unseen (the card
 * navigates on regardless), and the body must stay empty: the version is the
 * server's constant, so a client can't claim wording it wasn't shown. Hoisted
 * fetch stub: see `client.test.ts`.
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
})
