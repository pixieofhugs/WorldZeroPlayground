/**
 * #1400 — what `praxis.ts` and `duel.ts` actually put on the wire, now that they
 * issue through the typed `client.ts` instead of axios.
 *
 * The seam is the `Request` these modules hand to `fetch`. `tsc` proves the
 * path template, the param names and the payload shape; it says nothing about
 * the three things that can still be silently wrong after a transport swap:
 *
 *   1. **A multipart body.** `openapi-fetch`'s default serializer is written for
 *      JSON. If it stringified a `FormData` the upload would reach the server as
 *      `{}` — a runtime failure with no type, no test and no log to catch it.
 *      `schema.d.ts` cannot help: it renders a binary field as `string`, so the
 *      types are cast at this call site by necessity.
 *   2. **Which id lands in which slot.** `/praxes/{praxis_id}/media/{media_id}`
 *      takes two numbers, and swapping them is well-typed and wrong.
 *   3. **Filters reaching the query string at all.** `client.test.ts` proves how
 *      an array param is *serialized*; this proves `listPraxes` hands its
 *      filters over as `params.query` rather than dropping or misplacing them.
 *
 * The fetch stub goes in via `vi.hoisted` because `openapi-fetch` binds
 * `globalThis.fetch` when the client is CREATED, at `../client`'s top level —
 * i.e. during this file's imports. A `beforeEach` stub is never consulted and
 * the suite quietly issues REAL requests to localhost:8000 (see
 * `client.test.ts`).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { listPraxes, deletePraxisMedia, uploadPraxisMedia, uploadPraxisMediaBatch } from '../praxis'
import { getDuelDetail } from '../duel'
import { __resetCastTallies } from '../../utils/castTallies'

const wire = vi.hoisted(() => {
  const sent: Request[] = []
  let body = '[]'
  let status = 200

  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    // A 204 is the honest answer for the deletes, and a `Response` refuses to
    // carry a body with one.
    return new Response(status === 204 ? null : body, {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch

  return {
    sent,
    reset() {
      sent.length = 0
      body = '[]'
      status = 200
    },
    replyWith(nextStatus: number, nextBody: string) {
      status = nextStatus
      body = nextBody
    },
  }
})

const sent = wire.sent

beforeEach(() => {
  wire.reset()
  __resetCastTallies()
})

const file = (name: string) => new File(['proof'], name, { type: 'image/png' })

const MEDIA_ITEM =
  '{"id":1,"praxis_id":7,"type":"image","file_path":"a.png","display_order":0,"created_at":"2026-01-01T00:00:00Z"}'

describe('multipart uploads', () => {
  /**
   * The hazard this file exists for. `openapi-fetch` returns a `FormData` from
   * its default serializer untouched AND leaves `Content-Type` unset so the
   * browser writes the boundary — but "the library happens to do the right
   * thing" is a claim until something asserts it.
   */
  it('sends the FormData itself, not a JSON rendering of it', async () => {
    wire.replyWith(201, MEDIA_ITEM)

    await uploadPraxisMedia(7, file('proof.png'))

    const request = sent[0]
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/praxes/7/media')
    // The killer: a stringified FormData arrives as `{}` and the upload fails
    // server-side with nothing failing in CI.
    expect(request.headers.get('content-type')).not.toContain('application/json')
    expect(request.headers.get('content-type')).toContain('multipart/form-data')
    // …and the boundary is the one the platform picked, which is only possible
    // because nothing preset the header.
    expect(request.headers.get('content-type')).toContain('boundary=')

    const form = await request.formData()
    expect((form.get('file') as File).name).toBe('proof.png')
  })

  it('sends every file of a batch under the repeated `files` key', async () => {
    wire.replyWith(201, '[]')

    await uploadPraxisMediaBatch(7, [file('one.png'), file('two.png')])

    const form = await sent[0].formData()
    expect(new URL(sent[0].url).pathname).toBe('/praxes/7/media/batch')
    expect(form.getAll('files').map((entry) => (entry as File).name)).toEqual([
      'one.png',
      'two.png',
    ])
  })
})

describe('path slots', () => {
  /**
   * Two numbers, one template, and a transposition that type-checks perfectly.
   * `DELETE /praxes/3/media/7` deletes a different praxis' media or 404s.
   */
  it('fills praxis_id and media_id in the order the route declares them', async () => {
    wire.replyWith(204, '')

    await deletePraxisMedia(7, 3)

    expect(sent[0].method).toBe('DELETE')
    expect(new URL(sent[0].url).pathname).toBe('/praxes/7/media/3')
  })

  it('reads a duel detail from the duel id, not the praxis id', async () => {
    wire.replyWith(
      200,
      JSON.stringify({
        id: 5,
        task_id: 2,
        status: 'settled',
        forfeited_by_character_id: null,
        challenger: { praxis_id: null },
        opponent: { praxis_id: null },
        winner_character_id: null,
        challenger_final_points: null,
        opponent_final_points: null,
      }),
    )

    await getDuelDetail(5)

    expect(new URL(sent[0].url).pathname).toBe('/duels/5/detail')
  })
})

describe('list filters', () => {
  /**
   * `client.test.ts` owns HOW an array param is written; this owns that
   * `listPraxes` hands its filters over as a query at all. A filter posted as a
   * body, or dropped, answers 200 with a completely unfiltered feed (#1366).
   */
  it('forwards every filter into the query string', async () => {
    await listPraxes({ faction: ['ua', 'wow'], sort: 'newest', limit: 20 })

    const url = new URL(sent[0].url)
    expect(url.pathname).toBe('/praxes')
    expect(url.searchParams.getAll('faction')).toEqual(['ua', 'wow'])
    expect(url.searchParams.get('sort')).toBe('newest')
    expect(url.searchParams.get('limit')).toBe('20')
  })

  it('sends no query at all when there is nothing to filter by', async () => {
    await listPraxes()

    expect(new URL(sent[0].url).search).toBe('')
  })
})
