/**
 * Live copy overrides — the parts that are invisible to the type checker and
 * silent when they break.
 *
 * 1. THE POSTPROCESSOR'S NAMESPACE. Nothing in the types says which file a key
 *    belongs to. A wrong answer writes an override to a namespace no reader
 *    consults, and the save reports success while the words never change.
 * 2. THE CLICK. Resolving "this text on screen" to "this catalog key" is the
 *    whole mechanism, and it is a string lookup with no compile-time surface.
 *    It is also AMBIGUOUS — 133 catalog strings have more than one key — and a
 *    silent pick rewords a screen nobody was looking at.
 * 3. THE PLACEHOLDER GUARD. A dropped `{{max}}` does not throw; the sentence
 *    just renders with a hole in it, for every visitor, until someone notices.
 * 4. REVERT. It depends on one detail — that the exported `resources` is NOT the
 *    object the store mutates — and when that is wrong the DELETE still
 *    succeeds, the panel still says success, and the wording never comes back.
 *
 * WHY NOTHING HERE RENDERS THE COMPONENT
 * --------------------------------------
 * This repo has no DOM environment and no React Testing Library: `jsdom` and
 * `happy-dom` appear in `package-lock.json` only as vitest's OPTIONAL peers,
 * neither is installed, `vite.config.ts` says "renderToStaticMarkup needs no
 * DOM, so the default 'node' environment is fine", and no file under `src/`
 * carries a `@vitest-environment` docblock. Mounting this panel therefore needs
 * a new dependency, which this change is not allowed to add. So the DOM walk is
 * exercised against the minimal element shape `copyTargetsForElement` actually
 * reads, the revert path through its own helper, and the effect's dependency
 * list — which cannot be observed without a renderer — by reading the source.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCopyOverrides, putCopyOverride } from '../api/copy'
import { shippedValue } from '../components/admin/CopyEditor'
import i18n, { loadCopyOverrides, resources } from '../i18n'
import {
  COPY_ANCESTOR_LIMIT,
  copyTargetsForElement,
  copyTargetsForText,
  missingPlaceholders,
  recordRenderedCopy,
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

/** The minimum `copyTargetsForElement` reads: text, children, a parent. */
const stub = (
  textContent: string,
  parentElement: Element | null = null,
  children: Element[] = [],
): Element => ({ textContent, parentElement, children }) as unknown as Element

beforeEach(() => {
  wire.reset()
  setCopyRecording(false)
})

describe('the copyRegistry postProcessor', () => {
  it('records the namespace when the key carries it', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:accounts.empty')
    expect(copyTargetsForText(rendered)).toEqual([{ ns: 'admin', key: 'accounts.empty' }])
  })

  it('records the namespace when it arrives in options, as useTranslation passes it', () => {
    setCopyRecording(true)
    const rendered = i18n.t('accounts.searchPlaceholder', { ns: 'admin' })
    expect(copyTargetsForText(rendered)).toEqual([
      { ns: 'admin', key: 'accounts.searchPlaceholder' },
    ])
  })

  it('falls back to the default namespace for a bare key', () => {
    setCopyRecording(true)
    const rendered = i18n.t('loading')
    expect(copyTargetsForText(rendered)).toEqual([{ ns: 'common', key: 'loading' }])
  })

  it('indexes the INTERPOLATED text, so filled-in copy resolves too', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:accounts.idLabel', { id: 41 })
    expect(rendered).toContain('41')
    expect(copyTargetsForText(rendered)).toEqual([{ ns: 'admin', key: 'accounts.idLabel' }])
  })

  it('records nothing while disarmed, so a normal visit pays no index', () => {
    const rendered = i18n.t('admin:tasks.loadError')
    expect(copyTargetsForText(rendered)).toEqual([])
  })

  it('drops the index on disarm', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:tasks.saveError')
    setCopyRecording(false)
    expect(copyTargetsForText(rendered)).toEqual([])
  })

  it("never indexes the editor panel's own copy, which would shadow a page's", () => {
    setCopyRecording(true)
    const own = i18n.t('admin:copyEdit.save')
    const elsewhere = 'a page of its own that happens to say the same'
    recordRenderedCopy(elsewhere, { ns: 'tasks', key: 'somewhere.save' })
    expect(copyTargetsForText(own)).toEqual([])
    expect(copyTargetsForText(elsewhere)).toEqual([{ ns: 'tasks', key: 'somewhere.save' }])
  })
})

describe('an ambiguous string', () => {
  it('keeps every key that renders it, instead of the last one to render', () => {
    setCopyRecording(true)
    // The real shape of the problem, with the real keys: 133 catalog strings
    // have several, and these three of "Faction"'s five sit in three files.
    recordRenderedCopy('Faction', { ns: 'forms', key: 'editCharacter.factionLabel' })
    recordRenderedCopy('Faction', { ns: 'admin', key: 'tasks.factionLabel' })
    recordRenderedCopy('Faction', { ns: 'factions', key: 'detail.eyebrow' })
    expect(copyTargetsForText('Faction')).toEqual([
      { ns: 'forms', key: 'editCharacter.factionLabel' },
      { ns: 'admin', key: 'tasks.factionLabel' },
      { ns: 'factions', key: 'detail.eyebrow' },
    ])
  })

  it('records one key once, however many times it renders', () => {
    setCopyRecording(true)
    recordRenderedCopy('Points', { ns: 'common', key: 'leaderboard.points' })
    recordRenderedCopy('Points', { ns: 'common', key: 'leaderboard.points' })
    expect(copyTargetsForText('Points')).toHaveLength(1)
  })
})

describe('resolving a click to a key', () => {
  it('walks up from the clicked node to the element whose whole text is copy', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:overview.loadError')
    const label = stub(rendered)
    const icon = stub('*', label)
    expect(copyTargetsForElement(icon)).toEqual([{ ns: 'admin', key: 'overview.loadError' }])
  })

  it('finds a label one level DOWN, which is where a click on a button lands', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:tasks.statusError')
    // `event.target` is the button itself when the click lands on its padding,
    // and a button's own textContent is its glyphs plus its label — no match.
    const glyph = stub('★')
    const label = stub(rendered)
    const button = stub(`★${rendered}`, null, [glyph, label])
    expect(copyTargetsForElement(button)).toEqual([{ ns: 'admin', key: 'tasks.statusError' }])
  })

  it('offers both when two child labels match, rather than picking one', () => {
    setCopyRecording(true)
    recordRenderedCopy('All', { ns: 'admin', key: 'moderation.queue.filter.all' })
    recordRenderedCopy('Done', { ns: 'common', key: 'filters.bar.done' })
    const row = stub('AllDone', null, [stub('All'), stub('Done')])
    expect(copyTargetsForElement(row)).toEqual([
      { ns: 'admin', key: 'moderation.queue.filter.all' },
      { ns: 'common', key: 'filters.bar.done' },
    ])
  })

  it('gives up rather than matching a distant ancestor', () => {
    setCopyRecording(true)
    const rendered = i18n.t('admin:accounts.banError')
    let node = stub(rendered)
    for (let i = 0; i <= COPY_ANCESTOR_LIMIT; i += 1) node = stub('...', node)
    expect(copyTargetsForElement(node)).toEqual([])
  })

  it('answers empty for text no key rendered', () => {
    setCopyRecording(true)
    expect(copyTargetsForElement(stub("a character's own words"))).toEqual([])
  })
})

describe('saving an override', () => {
  it('PUTs ns, key and value, and the new wording renders', async () => {
    const override = { ns: 'admin', key: 'accounts.suspendError', value: 'no dice' }
    wire.replyWith(json(override))

    await putCopyOverride(override)

    const [request] = wire.sent
    expect(request.method).toBe('PUT')
    expect(new URL(request.url).pathname).toBe('/copy-overrides')
    await expect(request.json()).resolves.toEqual(override)

    i18n.addResource('en', override.ns, override.key, override.value)
    expect(i18n.t('admin:accounts.suspendError')).toBe('no dice')
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

describe('reverting to the shipped wording', () => {
  it('reads the catalog as SHIPPED, not the store an override has already edited', () => {
    const shipped = shippedValue('admin', 'accounts.detailError')
    expect(shipped).toBe('Could not load account detail.')

    // Exactly what the boot load, or her own previous save, does first.
    i18n.addResource('en', 'admin', 'accounts.detailError', 'overridden wording')
    expect(i18n.t('admin:accounts.detailError')).toBe('overridden wording')

    // The assertion that fails if `init` is handed `resources` by reference:
    // i18next's ResourceStore mutates the object it is given, so revert would
    // read 'overridden wording' and write it straight back.
    expect(shippedValue('admin', 'accounts.detailError')).toBe(shipped)

    // And the round trip the panel performs after a successful DELETE.
    i18n.addResource('en', 'admin', 'accounts.detailError', shipped)
    expect(i18n.t('admin:accounts.detailError')).toBe('Could not load account detail.')
  })

  it('keeps the exported catalog free of every override applied so far', () => {
    i18n.addResource('en', 'admin', 'overview.loadError', 'nope')
    expect(resources.en.admin.overview.loadError).toBe("Couldn't load overview.")
  })
})

describe('the boot load', () => {
  it('reads the overrides once and applies them over the shipped catalog', async () => {
    wire.replyWith(json([{ ns: 'admin', key: 'tasks.filters.pending', value: 'waiting' }]))

    await loadCopyOverrides()

    const [request] = wire.sent
    expect(request.method).toBe('GET')
    expect(new URL(request.url).pathname).toBe('/copy-overrides')
    expect(i18n.t('admin:tasks.filters.pending')).toBe('waiting')
  })

  it('emits languageChanged so components that call i18n.t directly re-read', async () => {
    const heard: string[] = []
    const listen = (lng: string) => heard.push(lng)
    i18n.on('languageChanged', listen)
    try {
      wire.replyWith(json([{ ns: 'admin', key: 'tasks.filters.all', value: 'every one' }]))
      await loadCopyOverrides()
      expect(heard).toEqual([i18n.language])

      // Nothing applied, nothing to re-render.
      heard.length = 0
      wire.replyWith(json([]))
      await loadCopyOverrides()
      expect(heard).toEqual([])
    } finally {
      i18n.off('languageChanged', listen)
    }
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

/**
 * The arm effect's dependency list, read off the source.
 *
 * `t` in those deps is an unbounded loop, not an untidiness: react-i18next hands
 * back a new `t` on every store event and this effect EMITS one, so each emit
 * tears the armed session down — listener removed, whole index cleared — and
 * re-arms it, until React gives up with "Maximum update depth exceeded".
 * `bindI18nStore: 'added'` widens it to every `addResource`.
 *
 * A renderer would be the honest seam and this repo has none (see the header),
 * but the condition is a property of the source, so the source is what gets
 * read. It fails the moment `t` goes back in the list.
 */
describe('the armed listener is installed once per arm', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'components', 'admin', 'CopyEditor.tsx'),
    'utf8',
  )

  it('depends on nothing but `armed`', () => {
    const deps = [...source.matchAll(/\}, \[([^\]]*)\]\)/g)].map(([, inner]) => inner.trim())
    expect(deps).toEqual(['armed'])
  })

  it('reaches `t` through a ref instead, so a new `t` cannot re-arm it', () => {
    expect(source).toContain('const translate = useRef(t)')
    expect(source).toContain('translate.current(')
  })
})
