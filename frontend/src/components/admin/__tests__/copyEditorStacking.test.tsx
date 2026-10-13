/**
 * The copy editor's panel is the top layer of the app (#3094).
 *
 * WHAT THE DEFECT WAS
 * -------------------
 * The panel and a popup locked each other out. Two separate things kept the
 * panel underneath, and either alone is enough:
 *
 *   1. It was mounted from `App.tsx` as a child of `Layout`, i.e. inside
 *      `ShellContent`'s `z-index: 5` stacking context. Whatever z-index it
 *      declared, it composited at 5 — under every overlay drawn at the root
 *      (`ui/drawAtRoot.ts` carries the whole argument).
 *   2. It declared `50`, the same as `ConfirmDialog`'s backdrop and far below
 *      the full-screen modals.
 *
 * So a click on "edit copy" landed on the popup's backdrop, which dismissed the
 * popup. This file holds both halves.
 *
 * SEAM, AND WHAT IT CANNOT PROVE
 * ------------------------------
 * Same as `composerOverlaysEscapeShell.test.tsx`: `renderToStaticMarkup` in
 * node, no DOM. "Is the panel painted above the dialog" is not measurable
 * here. What is: the z-index the panel actually renders, every z-index the
 * source declares, and whether the panel portals when a document exists (the
 * server renderer refuses a portal, so that reads as a throw).
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '../../../i18n'
import { sourceFiles, toRelative } from '../../../test/sourceScan'
import CopyEditor, { keepEscapeInPanel } from '../CopyEditor'

const formFactorMock = vi.fn(() => 'desktop')
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => formFactorMock(),
}))

const EDITOR = 'components/admin/CopyEditor.tsx'

/**
 * Every literal z-index a file declares: `zIndex: 5` / `zIndex={5}` /
 * `z-index: 5`, and Tailwind's `z-50` / `z-[60]`.
 *
 * ponytail: literals only. A z-index computed at runtime, or read from a CSS
 * variable, is invisible to this — none exists in `src` today. If one appears
 * above the editor, resolve it here rather than widening the regex.
 */
function layersIn(raw: string, isCss: boolean): number[] {
  const blockless = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  // CSS has no `//` comment. In TS a `//` straight after a colon is a URL
  // (`url(https://…)`), not a comment — `sourceScan.stripComments` eats the
  // rest of that line, and a z-index declared later on it with it.
  // ponytail: a protocol-relative `'//host/…'` literal is still read as a
  // comment; none shares a line with a z-index today. A tokenizer is the fix.
  const source = isCss ? blockless : blockless.replace(/(?<!:)\/\/[^\n]*/g, '')
  return [
    ...source.matchAll(/z-?index["']?\s*[:=]\s*\{?\s*["']?(\d+)/gi),
    ...source.matchAll(/(?<![\w-])z-\[?(\d+)\]?(?![\w-])/g),
  ].map(([, layer]) => Number(layer))
}

/** `src`-relative path → the highest layer that file declares. Walked once:
 *  the tree does not change between tests. */
const LAYERS_BY_FILE: ReadonlyMap<string, number> = new Map(
  sourceFiles({ match: /\.(tsx?|css)$/ })
    .map((path) => [toRelative(path), layersIn(readFileSync(path, 'utf8'), path.endsWith('.css'))] as const)
    .filter(([, layers]) => layers.length > 0)
    .map(([file, layers]) => [file, Math.max(...layers)]),
)

/** The z-index the panel really renders with, read off its own markup. */
function editorLayer(): number {
  const found = /^<div[^>]*style="[^"]*z-index:(\d+)/.exec(renderToStaticMarkup(<CopyEditor />))
  return Number(found?.[1])
}

afterEach(() => {
  vi.unstubAllGlobals()
  formFactorMock.mockReturnValue('desktop')
})

describe('the copy editor panel is the top layer (#3094)', () => {
  // The tripwire, anchored on named files rather than a count or a number: one
  // file per spelling the scan reads. A regex that stopped matching would
  // otherwise report "nothing is above the editor" forever.
  it('still sees an overlay in each spelling, so it cannot pass by matching nothing', () => {
    const files = [...LAYERS_BY_FILE.keys()]
    expect(files).toContain('components/confirm/ConfirmDialog.tsx') // Tailwind `z-50`
    expect(files).toContain('components/feed/FeedBankFullModal.tsx') // inline `zIndex`
    expect(files).toContain('css/07-layout-filter-bar.css') // CSS `z-index`
    expect(files).toContain(EDITOR)
  })

  it('declares a layer strictly above every other one in src', () => {
    const others = [...LAYERS_BY_FILE].filter(([file]) => file !== EDITOR)
    const [file, highest] = others.reduce((top, entry) => (entry[1] > top[1] ? entry : top))
    expect(
      editorLayer(),
      `${file} declares z-index ${highest}. The copy editor has to sit above every overlay, ` +
        'or its "edit copy" button lands on that overlay\'s backdrop and dismisses it. ' +
        'Raise the PANEL z-index in components/admin/CopyEditor.tsx above it.',
    ).toBeGreaterThan(highest)
  })

  it('portals to the document root, where that layer means something', () => {
    // Mounted under `Layout`, the panel is inside `ShellContent`'s `z-index: 5`
    // stacking context: without the portal the number above is fiction.
    vi.stubGlobal('document', { body: { nodeType: 1 } })
    expect(() => renderToStaticMarkup(<CopyEditor />)).toThrow(/[Pp]ortal/)
  })
})

describe('the scan reads past a URL (#3094)', () => {
  it('does not take the `//` in a URL for a comment and lose the rest of the line', () => {
    const line = "const S = { background: 'url(https://example.test/a.png)', zIndex: 2000 } // z-index: 9"
    expect(layersIn(line, false)).toEqual([2000])
  })
})

/**
 * Out at the root the panel is above the chrome too, and on a phone the chrome
 * at the bottom-left is the tab bar: `fixed bottom-0`, exactly where the panel
 * sat. An admin in admin mode could not tap it.
 *
 * SEAM: the `bottom` the panel renders per form factor. Whether the two boxes
 * overlap is layout, which this harness has none of.
 */
describe('the panel does not sit on the mobile tab bar (#3094)', () => {
  const bottom = () =>
    /^<div[^>]*style="[^"]*(?<=[";])bottom:([^;"]*)/.exec(renderToStaticMarkup(<CopyEditor />))?.[1]

  it('rests above the tab bar on a phone, by the shared clearance token', () => {
    formFactorMock.mockReturnValue('mobile')
    expect(bottom()).toBe('calc(var(--space-md) + var(--tab-bar-clearance))')
  })

  it('keeps its corner on desktop, where there is no bar', () => {
    expect(bottom()).toBe('var(--space-md)')
  })
})

/**
 * Every popup closes on Escape, from a bubble-phase `keydown` listener on
 * `document` or `window`. With the panel reachable over an open popup, Escape
 * pressed in the editor's textarea closed the popup underneath it.
 *
 * SEAM: the handler alone. This harness dispatches no events, so that the
 * panel's `onKeyDown` really stops the native event short of `document` is
 * read from react-dom (it delegates a portal's events from the portal's
 * container), not exercised here.
 */
describe('Escape pressed inside the panel stays there (#3094)', () => {
  const press = (key: string) => {
    const event = { key, stopPropagation: vi.fn() }
    keepEscapeInPanel(event)
    return event.stopPropagation
  }

  it('stops Escape from bubbling on to the popup listeners', () => {
    expect(press('Escape')).toHaveBeenCalledOnce()
  })

  it('leaves every other key alone', () => {
    expect(press('a')).not.toHaveBeenCalled()
    expect(press('Enter')).not.toHaveBeenCalled()
  })
})
