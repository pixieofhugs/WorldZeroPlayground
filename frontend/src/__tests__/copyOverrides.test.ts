/**
 * Live copy overrides — the three pieces of this feature that are invisible to
 * the type checker and silent when they break.
 *
 * 1. THE POSTPROCESSOR'S NAMESPACE. Nothing in the types says which file a key
 *    belongs to. A wrong answer writes an override to a namespace no reader
 *    consults, and the save reports success while the words never change.
 * 2. THE CLICK. Resolving "this text on screen" to "this catalog key" is the
 *    whole mechanism, and it is a string lookup with no compile-time surface.
 * 3. THE PLACEHOLDER GUARD. A dropped `{{max}}` does not throw; the sentence
 *    just renders with a hole in it, for every visitor, until someone notices.
 *
 * The panel itself is not rendered here: this suite runs in vitest's `node`
 * environment (no jsdom in this repo — see `vite.config.ts`), so the DOM walk is
 * exercised against minimal element stubs, which is what `copyTargetForElement`
 * actually reads.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCopyOverrides, putCopyOverride } from '../api/copy'
import i18n, { loadCopyOverrides } from '../i18n'
import {
  COPY_ANCESTOR_LIMIT,
  copyTargetForElement,
  copyTargetForText,
  missingPlaceholders,
  setCopyRecording,
} from '../utils/copyRegistry'

/**
 * `openapi-fetch` binds `globalThis.fetch` when the client is CREATED, at
 * `api/client`'s module scope — i.e. during this file's imports. A later
 * `vi.stubGlobal` is never consulted and the suite would issue real requests to
 * localhost:8000. Same reasoning, same shape as `api/__tests__/client.test.ts`.
 */
const wire = vi.hoisted(() => {
  const empty = () =>
    Promise.resolve(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
    )
  const sent: Request[] = []
  let reply: () => Promise<Response> = empty

  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return reply()
  }) as unknown as typeof globalThis.fetch

  return {
    sent,
    reset() {
      sent.length = 0
      reply = empty
    },
    replyWith(next: () => Promise<Response>) {
      reply = next
    },
  }
})

const json = (body: unknown) => () =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )

/** The minimum `copyTargetForElement` reads: some text, and a parent. */
const stub = (textContent: string, parentElement: Element | null = null): Element =>
  ({ textContent, parentElement }) as unknown as Element

beforeEach(() => {
  wire.reset()
  setCopyRecording(false)
})

describe('the copyRegistry postProcessor', () => {
  it('records the namespace when the key carries it', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:copyEdit.armedHint')
    expect(copyTargetForText(rendered)).toEqual({ ns: 'admin', key: 'copyEdit.armedHint' })
  })

  it('records the namespace when it arrives in options, as useTranslation passes it', () => {
    setCopyRecording(true)
    const rendered = i18n.t('copyEdit.textareaLabel', { ns: 'admin' })
    expect(copyTargetForText(rendered)).toEqual({ ns: 'admin', key: 'copyEdit.textareaLabel' })
  })

  it('falls back to the default namespace for a bare key', () => {
    setCopyRecording(true)
    const rendered = i18n.t('loading')
    expect(copyTargetForText(rendered)).toEqual({ ns: 'common', key: 'loading' })
  })

  it('indexes the INTERPOLATED text, so filled-in copy resolves too', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:accounts.idLabel', { id: 41 })
    expect(rendered).toContain('41')
    expect(copyTargetForText(rendered)).toEqual({ ns: 'admin', key: 'accounts.idLabel' })
  })

  it('records nothing while disarmed, so a normal visit pays no Map', () => {
    const rendered = i18n.t('admin:copyEdit.save')
    expect(copyTargetForText(rendered)).toBeNull()
  })

  it('drops the index on disarm', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:copyEdit.cancel')
    setCopyRecording(false)
    expect(copyTargetForText(rendered)).toBeNull()
  })
})

describe('resolving a click to a key', () => {
  it('walks up from the clicked node to the element whose whole text is copy', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:copyEdit.revert')
    // The click lands on an inner span that is not itself a copy string.
    const label = stub(rendered)
    const icon = stub('*', label)
    expect(copyTargetForElement(icon)).toEqual({ ns: 'admin', key: 'copyEdit.revert' })
  })

  it('gives up rather than matching a distant ancestor', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:copyEdit.disarm')
    let node = stub(rendered)
    for (let i = 0; i <= COPY_ANCESTOR_LIMIT; i += 1) node = stub('...', node)
    expect(copyTargetForElement(node)).toBeNull()
  })

  it('answers null for text no key rendered', () => {
    setCopyRecording(true)
    expect(copyTargetForElement(stub("a character's own words"))).toBeNull()
  })
})

describe('saving an override', () => {
  it('PUTs ns, key and value, and the new wording renders', async () => {
    const override = { ns: 'admin', key: 'copyEdit.save', value: 'commit it' }
    wire.replyWith(json(override))

    await putCopyOverride(override)

    const [request] = wire.sent
    expect(request.method).toBe('PUT')
    expect(new URL(request.url).pathname).toBe('/copy-overrides')
    await expect(request.json()).resolves.toEqual(override)

    i18n.addResource('en', override.ns, override.key, override.value)
    expect(i18n.t('admin:copyEdit.save')).toBe('commit it')
  })

  it('refuses a replacement that drops a placeholder, and names it', () => {
    // The template as the editor prefills it: `getResource`, not `t` — the raw
    // `{{…}}` form rather than an interpolated render.
    const template = i18n.getResource('en', 'admin', 'copyEdit.missingPlaceholder') as string
    expect(template).toContain('{{placeholders}}')
    expect(missingPlaceholders(template, 'put it back')).toEqual(['{{placeholders}}'])
    expect(missingPlaceholders(template, 'you dropped {{placeholders}}')).toEqual([])
  })
})

describe('the boot load', () => {
  it('reads the overrides once and applies them over the shipped catalog', async () => {
    wire.replyWith(json([{ ns: 'admin', key: 'copyEdit.cancel', value: 'never mind' }]))

    await loadCopyOverrides()

    const [request] = wire.sent
    expect(request.method).toBe('GET')
    expect(new URL(request.url).pathname).toBe('/copy-overrides')
    expect(i18n.t('admin:copyEdit.cancel')).toBe('never mind')
  })

  it('leaves the shipped catalog standing when the fetch fails', async () => {
    wire.replyWith(() => Promise.reject(new Error('offline')))
    await expect(loadCopyOverrides()).resolves.toBeUndefined()
    expect(i18n.t('admin:copyEdit.arm')).toBe('edit copy')
  })

  it('asks for the overrides without auth params — the list is public', async () => {
    await listCopyOverrides()
    expect(new URL(wire.sent[0].url).search).toBe('')
  })
})
