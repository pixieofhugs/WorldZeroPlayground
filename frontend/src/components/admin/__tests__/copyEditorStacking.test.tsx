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
import { sourceFiles, stripComments, toRelative } from '../../../test/sourceScan'
import CopyEditor from '../CopyEditor'

const EDITOR = 'components/admin/CopyEditor.tsx'

/**
 * Every literal z-index a file declares: `zIndex: 5` / `zIndex={5}` /
 * `z-index: 5`, and Tailwind's `z-50` / `z-[60]`.
 *
 * ponytail: literals only. A z-index computed at runtime, or read from a CSS
 * variable, is invisible to this — none exists in `src` today. If one appears
 * above the editor, resolve it here rather than widening the regex.
 */
function declaredLayers(path: string): number[] {
  const raw = readFileSync(path, 'utf8')
  // CSS keeps its `//` (a `url(https://…)` is not a comment); TS loses both.
  const source = path.endsWith('.css') ? raw.replace(/\/\*[\s\S]*?\*\//g, '') : stripComments(raw)
  return [
    ...source.matchAll(/z-?index["']?\s*[:=]\s*\{?\s*["']?(\d+)/gi),
    ...source.matchAll(/(?<![\w-])z-\[?(\d+)\]?(?![\w-])/g),
  ].map(([, layer]) => Number(layer))
}

/** `src`-relative path → the highest layer that file declares. */
const layersByFile = (): Map<string, number> =>
  new Map(
    sourceFiles({ match: /\.(tsx?|css)$/ })
      .map((path) => [toRelative(path), declaredLayers(path)] as const)
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
})

describe('the copy editor panel is the top layer (#3094)', () => {
  // The tripwire, anchored on named files rather than a count or a number: one
  // file per spelling the scan reads. A regex that stopped matching would
  // otherwise report "nothing is above the editor" forever.
  it('still sees an overlay in each spelling, so it cannot pass by matching nothing', () => {
    const files = [...layersByFile().keys()]
    expect(files).toContain('components/confirm/ConfirmDialog.tsx') // Tailwind `z-50`
    expect(files).toContain('components/feed/FeedBankFullModal.tsx') // inline `zIndex`
    expect(files).toContain('css/07-layout-filter-bar.css') // CSS `z-index`
    expect(files).toContain(EDITOR)
  })

  it('declares a layer strictly above every other one in src', () => {
    const others = [...layersByFile()].filter(([file]) => file !== EDITOR)
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
