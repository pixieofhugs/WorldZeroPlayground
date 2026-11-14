/**
 * #3061 — the finder must read the ADMIN list (only it returns hidden praxes)
 * and its filters must reach the query; tsc proves neither. Hoisted fetch stub:
 * see `client.test.ts`.
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
