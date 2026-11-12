/**
 * Fixtures for the colour arm of the style ratchet (#1853).
 *
 * The seam is the rule AS WIRED: laundering holes live between "the pattern
 * matches" and "the visitor sees the node", so these lint through the real
 * `eslint.config.js`.
 */
import { existsSync, readFileSync } from 'node:fs'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-raw-colour-values'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

const lint = async (code: string, filePath = 'src/rawColourFixture.tsx'): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return result.messages.filter((m) => m.ruleId === RULE).map((m) => m.message)
}

const reports = async (code: string, filePath?: string): Promise<boolean> =>
  (await lint(code, filePath)).length > 0

/** The un-migrated paths on the shrink-only list, comments stripped. */
const legacyEntries = (): string[] =>
  readFileSync(new URL('../../.eslint-legacy-raw-colours.txt', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.split('#')[0].trim())
    .filter(Boolean)

describe('local/no-raw-colour-values reports raw colour', () => {
  it('flags a colour function inside a shadow string — the #1851 shape', async () => {
    expect(await reports("export const s = { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }")).toBe(
      true,
    )
  })

  it('flags a raw hex in an inline style', async () => {
    expect(await reports("export const A = () => <p style={{ color: '#dc2626' }} />")).toBe(true)
  })

  it('flags a stock Tailwind colour utility in a className', async () => {
    expect(await reports('export const A = () => <p className="font-body text-red-600" />')).toBe(
      true,
    )
  })

  it('flags hsl() and a directional border shorthand, not just rgba/boxShadow', async () => {
    expect(await reports("export const s = { borderBottom: '1px solid hsl(210 40% 96%)' }")).toBe(
      true,
    )
  })

  /**
   * #1912. Three-arg `rgba()` paints (CSS Color 4: alpha optional). The matcher
   * must not count arguments, or "hardening" it un-ratchets this shape.
   */
  it('flags a comma-form rgba() whether or not it carries the optional alpha', async () => {
    expect(await reports("export const s = { background: 'rgba(10,26,14)' }")).toBe(true)
    expect(await reports("export const s = { background: 'rgba(10,26,14,1)' }")).toBe(true)
  })

  /**
   * #2139. `filter` launders paint past a property-name rule. Accepted cost: the
   * value mixes geometry with paint, so the reviewer judges which half is at fault.
   */
  it('flags a colour laundered through filter: drop-shadow()', async () => {
    expect(
      await reports("export const s = { filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' }"),
    ).toBe(true)
  })

  it('flags a colour laundered through a ternary, as the px arm does', async () => {
    expect(
      await reports("export const s = (w: boolean) => ({ background: w ? 'rgba(234,179,8,0.08)' : 'transparent' })"),
    ).toBe(true)
  })
})

describe('local/no-raw-colour-values stays silent where colour is tokenized', () => {
  it('says nothing about a var(--color-*) reference', async () => {
    expect(
      await lint(
        "export const s = { color: 'var(--color-danger)', boxShadow: '0 4px 12px var(--color-shadow-soft)' }",
      ),
    ).toEqual([])
  })

  it('says nothing about a colour function that composes a token', async () => {
    // The `[\d.]` lookahead: a token doing alpha vs a hardcoded colour.
    expect(await lint("export const s = { background: 'rgb(var(--rgb-accent) / 0.4)' }")).toEqual([])
  })

  it("says nothing about the repo's own var()-backed Tailwind utilities", async () => {
    expect(await lint('export const A = () => <p className="text-ink bg-surface border-border" />')).toEqual(
      [],
    )
  })

  it('says nothing about a filter that carries no paint of its own', async () => {
    // Fires on paint only, or the arm discourages `filter` (needed for shadows
    // that follow a cut edge, e.g. `SnideProfileBody`).
    expect(
      await lint(
        "export const s = { filter: 'blur(4px) drop-shadow(2px 2px 0 var(--color-print-offset))' }",
      ),
    ).toEqual([])
  })

  it('says nothing about a raw length — that is the OTHER arm, on its own list', async () => {
    expect(await lint("export const s = { padding: 'var(--space-md)', opacity: 0.4 }")).toEqual([])
  })

  it('says nothing in a file on the legacy list', async () => {
    // Read from the list: a hardcoded path would break when that file migrates.
    expect(
      await lint("export const s = { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }", legacyEntries()[0]),
    ).toEqual([])
  })

  it('says nothing in the colour-math helper, which parses colour by definition', async () => {
    expect(await lint("export const s = { color: '#1c1c1a' }", 'src/utils/contrast.ts')).toEqual([])
  })
})

describe('the legacy list stays honest', () => {
  /**
   * #2139: the report undercounts by construction (module consts and colour-named
   * props are invisible), so the list must never be quoted as the extent.
   */
  it('warns, in both places a reader meets it, that the report is a floor', async () => {
    const header = readFileSync(
      new URL('../../.eslint-legacy-raw-colours.txt', import.meta.url),
      'utf8',
    )
    expect(header).toMatch(/FLOOR, NOT THE CLASS/)

    const results = await eslint.lintText("export const s = { color: '#dc2626' }", {
      filePath: 'src/rawColourFixture.tsx',
    })
    const description = eslint.getRulesMetaForResults(results)[RULE]?.docs?.description
    expect(description).toMatch(/FLOOR, NOT THE CLASS/)
  })

  it('is not empty, and every entry is a real path the rule can be turned off for', async () => {
    const entries = legacyEntries()

    expect(entries.length).toBeGreaterThan(0)
    // A dead path can never be migrated off, so the list would stop shrinking.
    expect(
      entries.filter((entry) => !existsSync(new URL(`../../${entry}`, import.meta.url))),
    ).toEqual([])
  })
})
