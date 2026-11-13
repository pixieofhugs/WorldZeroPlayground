/**
 * #1400 — avatar upload is multipart (see `adminCsvImport.test.ts`). Asserts
 * the body is still the FormData and Content-Type is left for the platform's
 * boundary; a hand-set one without a boundary is unparseable.
 */
import { describe, it, expect, vi } from 'vitest'

import { uploadCharacterAvatar } from '../characters'

/** Hoisted fetch stub: see `client.test.ts`. */
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
