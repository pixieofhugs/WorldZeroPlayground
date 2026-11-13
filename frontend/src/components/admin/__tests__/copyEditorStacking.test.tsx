/**
 * The copy editor's panel is the top layer of the app (#3094): it must portal
 * to the root (see `ui/drawAtRoot.ts`) and out-rank every declared z-index.
 * Node-only: paint order is not measurable; the rendered z-index, the source's
 * z-indexes, and the portal (the server renderer throws on one) are.
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
  // A `//` right after a colon is a URL, not a comment (unlike `stripComments`).
  // ponytail: a protocol-relative `'//host'` literal still reads as a comment;
  // a tokenizer is the fix if one shares a line with a z-index.
  return isCss ? blockless : blockless.replace(/(?<!:)\/\/[^\n]*/g, '')
}

/**
 * Every literal z-index a file declares: `zIndex: 5` / `zIndex={5}` /
 * `z-index: 5`, and Tailwind's `z-50` / `z-[60]`.
 *
 * ponytail: literals only; non-literal values fail loudly via
 * `unreadableLayersIn` unless listed in `READ_BY_HAND` (#3136).
 */
function layersIn(raw: string, isCss: boolean): number[] {
  const source = uncommented(raw, isCss)
  return [
    ...source.matchAll(/z-?index["']?\s*[:=]\s*\{?\s*["']?(\d+)/gi),
    ...source.matchAll(/(?<![\w-])z-\[?(\d+)\]?(?![\w-])/g),
  ].map(([, layer]) => Number(layer))
}

/** z-index values `layersIn` cannot read, as written (`auto` and negatives excluded). */
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

/** `src`-relative path → the highest layer that file declares. */
const LAYERS_BY_FILE: ReadonlyMap<string, number> = new Map(
  SCANNED.map(([file, raw, isCss]) => [file, layersIn(raw, isCss)] as const)
    .filter(([, layers]) => layers.length > 0)
    .map(([file, layers]) => [file, Math.max(...layers)]),
)

/** `file: value` for every z-index in `src` the scan has no number for. */
const UNREADABLE: readonly string[] = SCANNED.flatMap(([file, raw, isCss]) =>
  unreadableLayersIn(raw, isCss).map((value) => `${file}: ${value}`),
)

/** Unreadable z-indexes resolved by hand, keyed `file: value`. */
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
  // Tripwire: one named file per spelling, so a dead regex cannot pass vacuously.
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
    vi.stubGlobal('document', { body: { nodeType: 1 } })
    expect(() => renderToStaticMarkup(<CopyEditor />)).toThrow(/[Pp]ortal/)
  })
})

/** A layer the scan cannot read fails until somebody resolves it by hand. */
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

/** At the root the panel also covers the phone tab bar; checks the rendered `bottom`. */
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
 * At full width the phone panel covered bottom-pinned controls (#3136). Idle is
 * read off markup; editing from `panelStyle`, since this harness cannot click.
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
 * Escape in the panel must not close the popup underneath (#3094), but with no
 * string open it must (#3136). Tests the handler alone; this harness dispatches
 * no events.
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
