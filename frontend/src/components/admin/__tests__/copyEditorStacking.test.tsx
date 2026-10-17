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
import CopyEditor, { keepEscapeInPanel, panelStyle } from '../CopyEditor'

const formFactorMock = vi.fn(() => 'desktop')
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => formFactorMock(),
}))

const EDITOR = 'components/admin/CopyEditor.tsx'

/** A file with its comments gone, so prose naming a z-index is not a declaration. */
function uncommented(raw: string, isCss: boolean): string {
  const blockless = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  // CSS has no `//` comment. In TS a `//` straight after a colon is a URL
  // (`url(https://…)`), not a comment — `sourceScan.stripComments` eats the
  // rest of that line, and a z-index declared later on it with it.
  // ponytail: a protocol-relative `'//host/…'` literal is still read as a
  // comment; none shares a line with a z-index today. A tokenizer is the fix.
  return isCss ? blockless : blockless.replace(/(?<!:)\/\/[^\n]*/g, '')
}

/**
 * Every literal z-index a file declares: `zIndex: 5` / `zIndex={5}` /
 * `z-index: 5`, and Tailwind's `z-50` / `z-[60]`.
 *
 * ponytail: literals only. A z-index set from an identifier, a `var()` or a
 * conditional has no number this can read. A handful exist in `src`
 * (`READ_BY_HAND` below), so the blind spot is made loud rather than the regex
 * widened: `unreadableLayersIn` collects them and the suite fails on any that
 * is not named there (#3136).
 */
function layersIn(raw: string, isCss: boolean): number[] {
  const source = uncommented(raw, isCss)
  return [
    ...source.matchAll(/z-?index["']?\s*[:=]\s*\{?\s*["']?(\d+)/gi),
    ...source.matchAll(/(?<![\w-])z-\[?(\d+)\]?(?![\w-])/g),
  ].map(([, layer]) => Number(layer))
}

/**
 * Every z-index a file declares whose value `layersIn` cannot read: the text of
 * the value, as written. `auto` and a negative literal are read fine — neither
 * can be above anything — so they are never returned.
 */
function unreadableLayersIn(raw: string, isCss: boolean): string[] {
  const source = uncommented(raw, isCss)
  return [
    ...source.matchAll(/z-?index["']?\s*[:=]\s*\{?\s*([^,;}\n]+)/gi),
    // Tailwind's arbitrary forms: `z-[var(--layer)]`, `z-(--layer)`.
    ...source.matchAll(/(?<![\w-])z-\[([^\]\s]+)\]/g),
    ...source.matchAll(/(?<![\w-])z-\(([^)\s]+)\)/g),
  ]
    .map(([, value]) => value.trim())
    .filter((value) => !/^["']?(-?\d+|auto)["']?(\s*!important)?$/.test(value))
}

const SCANNED: readonly (readonly [file: string, raw: string, isCss: boolean])[] = sourceFiles({
  match: /\.(tsx?|css)$/,
}).map((path) => [toRelative(path), readFileSync(path, 'utf8'), path.endsWith('.css')])

/** `src`-relative path → the highest layer that file declares. Walked once:
 *  the tree does not change between tests. */
const LAYERS_BY_FILE: ReadonlyMap<string, number> = new Map(
  SCANNED.map(([file, raw, isCss]) => [file, layersIn(raw, isCss)] as const)
    .filter(([, layers]) => layers.length > 0)
    .map(([file, layers]) => [file, Math.max(...layers)]),
)

/** `file: value` for every z-index in `src` the scan has no number for. */
const UNREADABLE: readonly string[] = SCANNED.flatMap(([file, raw, isCss]) =>
  unreadableLayersIn(raw, isCss).map((value) => `${file}: ${value}`),
)

/**
 * The unreadable z-indexes somebody has resolved by reading the code, each with
 * what it resolves to. Keyed `file: value`, so a second unreadable value in the
 * same file is still a finding.
 */
const BYLINE_DISC_STACK =
  'the index of an overlapping byline author disc: a handful of small integers, and the parent span is not a stacking context'
const READ_BY_HAND: Readonly<Record<string, string>> = {
  'pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx: index': BYLINE_DISC_STACK,
  'pages/praxisDetail/archetypes/CovenPraxisDetail.tsx: index': BYLINE_DISC_STACK,
  'pages/praxisDetail/archetypes/WowPraxisDetail.tsx: index': BYLINE_DISC_STACK,
  'pages/praxisDetail/archetypes/UaPraxisDetail.tsx: index': BYLINE_DISC_STACK,
}

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

/**
 * "Strictly above every other layer" is only true of the layers the scan can
 * read. One it cannot read is not assumed harmless: it fails here until
 * somebody resolves it and says what it resolves to.
 */
describe('no layer is hidden from the scan (#3136)', () => {
  it('reports a var(), a conditional and an identifier as unreadable', () => {
    expect(unreadableLayersIn('.a { z-index: var(--layer-modal); }', true)).toEqual(['var(--layer-modal)'])
    expect(unreadableLayersIn('const S = { zIndex: open ? 2000 : 1 }', false)).toEqual(['open ? 2000 : 1'])
    expect(unreadableLayersIn('<div style={{ zIndex: index }} className="z-[var(--top)]" />', false)).toEqual([
      'index',
      'var(--top)',
    ])
  })

  it('reads a literal, a negative literal and `auto` without complaint', () => {
    expect(unreadableLayersIn('.a { z-index: 5 } .b { z-index: -1; } .c { z-index: auto; }', true)).toEqual([])
    expect(unreadableLayersIn('<i style={{ zIndex: 1100 }} className="z-50 z-[60]" />', false)).toEqual([])
  })

  it('finds none in src that has not been resolved by hand', () => {
    expect(
      UNREADABLE.filter((site) => !(site in READ_BY_HAND)),
      'A z-index here is set from something other than a number, so this suite cannot tell ' +
        'whether it is above the copy editor. Work out what it resolves to: if it can reach the ' +
        'editor\'s layer, raise PANEL in components/admin/CopyEditor.tsx; then add the site to ' +
        'READ_BY_HAND in this file with what it resolves to.',
    ).toEqual([])
  })

  it('carries no entry for a site that is gone', () => {
    expect(Object.keys(READ_BY_HAND).filter((site) => !UNREADABLE.includes(site))).toEqual([])
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
 * On a phone the panel shares its strip with the controls pinned to the bottom
 * of the screen: the faction join bar, the filter sheet's Done row, the
 * character switcher's last row. At full width it covered them for as long as
 * admin mode was on (#3136). Owner ruling: same corner, but while no string is
 * open it is only as wide as its "edit copy" control.
 *
 * SEAM: the style the panel is given. Idle is read off the rendered markup;
 * the editing style is read from `panelStyle`, because opening a string takes a
 * click and this harness dispatches none. Whether a control underneath is
 * really tappable is layout, which is not measurable here.
 */
describe('the phone panel hugs its control until a string is open (#3136)', () => {
  const FULL = 'min(22rem, calc(100vw - var(--space-xl)))'
  const renderedWidth = () =>
    /^<div[^>]*style="[^"]*(?<=[";])width:([^;"]*)/.exec(renderToStaticMarkup(<CopyEditor />))?.[1]

  it('is not full width while idle on a phone', () => {
    formFactorMock.mockReturnValue('mobile')
    expect(renderedWidth()).toBe('min-content')
    expect(panelStyle(true, false).width).toBe('min-content')
  })

  it('takes the full width once a string is open', () => {
    expect(panelStyle(true, true).width).toBe(FULL)
  })

  it('never grows past the full width, however long a key it has to list', () => {
    expect(panelStyle(true, false).maxWidth).toBe(FULL)
  })

  it('does not change on desktop, idle or editing', () => {
    expect(renderedWidth()).toBe(FULL)
    expect(panelStyle(false, false)).toEqual(panelStyle(false, true))
  })
})

/**
 * Every popup closes on Escape, from a bubble-phase `keydown` listener on
 * `document` or `window`. With the panel reachable over an open popup, Escape
 * pressed in the editor's textarea closed the popup underneath it (#3094).
 *
 * The first fix stopped Escape from anywhere in the panel. Clicking "edit copy"
 * leaves focus on that button, so Escape then stopped closing the popup at all
 * until focus left the panel (#3136). Only the textarea keeps it.
 *
 * SEAM: the handler alone, handed a target. This harness dispatches no events,
 * so that the panel's `onKeyDown` really stops the native event short of
 * `document` is read from react-dom (it delegates a portal's events from the
 * portal's container), not exercised here.
 */
describe('Escape stays in the panel while a string is open (#3094, #3136, #3245)', () => {
  const press = (key: string, stringOpen: boolean) => {
    const event = { key, stopPropagation: vi.fn() }
    keepEscapeInPanel(event, stringOpen)
    return event.stopPropagation
  }

  it('stops Escape with a string open, wherever focus sits in the panel', () => {
    expect(press('Escape', true)).toHaveBeenCalledOnce()
  })

  it('lets Escape through with no string open, so the popup beneath still closes', () => {
    expect(press('Escape', false)).not.toHaveBeenCalled()
  })

  it('leaves every other key alone', () => {
    expect(press('a', true)).not.toHaveBeenCalled()
    expect(press('Enter', true)).not.toHaveBeenCalled()
  })
})
