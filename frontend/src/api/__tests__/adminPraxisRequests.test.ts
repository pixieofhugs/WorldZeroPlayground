/**
 * #3061 — what the admin praxis finder puts on the wire.
 *
 * The seam is the `Request` handed to `fetch`. `tsc` proves the path templates;
 * what it cannot prove is that the finder reads the ADMIN list and not the
 * public one — both are well-typed, and only one of them returns the hidden
 * praxes the tab exists to find — nor that its filters reach the query string
 * (query keys on a variable escape the excess-property check, see
 * `praxisRequests.test.ts`).
 *
 * `vi.hoisted` because `openapi-fetch` binds `fetch` when the client loads.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

const wire = vi.hoisted(() => {
  const sent: Request[] = []
  globalThis.fetch = (async (input: Request) => {
    sent.push(input.clone())
    return new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
  return { sent }
})

afterEach(() => {
  wire.sent.length = 0
})

import { listAdminPraxes, moderatePraxis } from '../admin'

describe('listAdminPraxes', () => {
  it('reads /admin/praxes, with repeated faction keys and the page window', async () => {
    await listAdminPraxes({
      q: 'zebra',
      faction: ['ua', 'snide'],
      moderation_status: 'hidden',
      era_scope: 'all_eras',
      task_id: undefined,
      limit: 26,
      offset: 25,
    })

    const url = new URL(wire.sent[0].url)
    expect(wire.sent[0].method).toBe('GET')
    expect(url.pathname).toBe('/admin/praxes')
    expect(url.searchParams.get('q')).toBe('zebra')
    expect(url.searchParams.getAll('faction')).toEqual(['ua', 'snide'])
    expect(url.searchParams.get('moderation_status')).toBe('hidden')
    expect(url.searchParams.get('era_scope')).toBe('all_eras')
    expect(url.searchParams.get('limit')).toBe('26')
    expect(url.searchParams.get('offset')).toBe('25')
    // An unset axis is absent, not sent empty.
    expect(url.searchParams.has('task_id')).toBe(false)
  })
})

describe('moderatePraxis', () => {
  it('PATCHes the existing moderate route for the praxis it was given', async () => {
    await moderatePraxis(41, 'hidden')

    expect(wire.sent[0].method).toBe('PATCH')
    expect(new URL(wire.sent[0].url).pathname).toBe('/admin/praxes/41/moderate')
    expect(await wire.sent[0].json()).toEqual({ status: 'hidden', admin_note: null })
  })
})
