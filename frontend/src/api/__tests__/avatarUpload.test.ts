/**
 * #1400 — one of the two calls in this app that do not send JSON (the other is
 * the admin CSV task import; see `adminCsvImport.test.ts`).
 *
 * `POST /characters/{id}/avatar` is multipart. `openapi-fetch`'s default body
 * serializer is written for JSON, and a `FormData` it decided to
 * `JSON.stringify` would reach the server as `{}`: the upload fails at runtime,
 * the request still 200s or 422s plausibly, and NOTHING in CI goes red — tsc
 * cannot see a serializer's behaviour, and the schema types this body as
 * `{ file: string }` either way.
 *
 * So the seam is the `Request` handed to `fetch`, and the two things asserted
 * are the two the serializer could get wrong: the body must still BE the
 * FormData, and Content-Type must be left unset so the browser writes the
 * multipart boundary itself. A hand-set `multipart/form-data` without a
 * boundary is unparseable server-side.
 */
import { describe, it, expect, vi } from 'vitest'

import { uploadCharacterAvatar } from '../characters'

/**
 * `vi.hoisted`, not `beforeEach`: `openapi-fetch` binds `globalThis.fetch` when
 * the client is created, at `../client`'s top level — during this file's
 * imports. See `./client.test.ts` for the full argument.
 */
const wire = vi.hoisted(() => {
  const sent: Request[] = []
  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return new Response('{"id":42}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
  return { sent }
})

describe('uploadCharacterAvatar', () => {
  it('sends the FormData itself, not a JSON rendering of it', async () => {
    const file = new File(['bytes'], 'face.png', { type: 'image/png' })

    await uploadCharacterAvatar(42, file)

    const request = wire.sent.at(-1)!
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/characters/42/avatar')

    // The assertion that a JSON-stringified FormData would fail: the field
    // survives with the file under it. `{}` is what stringifying would send.
    const body = await request.formData()
    const uploaded = body.get('file')
    expect(uploaded).toBeInstanceOf(File)
    expect((uploaded as File).name).toBe('face.png')
  })

  it("leaves Content-Type unset, so the boundary is the platform's own", async () => {
    await uploadCharacterAvatar(42, new File(['bytes'], 'face.png', { type: 'image/png' }))

    const contentType = wire.sent.at(-1)!.headers.get('content-type')
    expect(contentType).toContain('multipart/form-data')
    expect(contentType).toContain('boundary=')
    expect(contentType).not.toBe('application/json')
  })
})
