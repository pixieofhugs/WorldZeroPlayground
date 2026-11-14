/**
 * #1400 — what `praxis.ts` and `duel.ts` put on the wire, beyond what tsc
 * proves: multipart bodies, which id fills which path slot, and filters
 * reaching the query at all. Fetch stub is hoisted: see `client.test.ts`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { deletePraxisMedia, uploadPraxisMedia, uploadPraxisMediaBatch } from '../praxis'
import { getDuelDetail } from '../duel'
import { __resetCastTallies } from '../../utils/castTallies'

const wire = vi.hoisted(() => {
  const sent: Request[] = []
  let body = '[]'
  let status = 200

  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    // A `Response` refuses a body with a 204.
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
  it('sends the FormData itself, not a JSON rendering of it', async () => {
    wire.replyWith(201, MEDIA_ITEM)

    await uploadPraxisMedia(7, file('proof.png'))

    const request = sent[0]
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/praxes/7/media')
    // A stringified FormData arrives as `{}`.
    expect(request.headers.get('content-type')).not.toContain('application/json')
    expect(request.headers.get('content-type')).toContain('multipart/form-data')
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
  /** A transposition type-checks fine. */
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
