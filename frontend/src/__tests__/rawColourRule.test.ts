/**
 * Fixtures for the colour arm of the style ratchet (#1853).
 *
 * The seam is the RULE AS WIRED, not the regex: every one of the six laundering
 * patterns the px arm has been hardened against (#750, #763, #770, #789, #1233)
 * was a hole between "the pattern matches" and "the visitor ever sees the node".
 * So these lint real source text through the real `eslint.config.js` — same
 * plugin registration, same legacy list, same exemptions CI runs — and assert on
 * what comes back.
 *
 * A rule with no fixtures is a rule that can be quietly weakened: delete the
 * `[\d.]` lookahead and nothing else in the repo goes red.
 */
import { existsSync, readFileSync } from 'node:fs'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-raw-colour-values'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

/** Rule ids reported for `code`, judged as if it lived at `filePath`. */
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
   * #1912. `background: 'rgba(10,26,14)'` sat in `FactionCard.tsx` and was read
   * as a no-op — "rgba() takes four arguments, so the browser drops the
   * declaration". It does not. The legacy COMMA grammar makes the alpha
   * optional in both spellings:
   *
   *   rgba() = rgba( <number>#{3} , <alpha-value>? ) | …
   *
   * (mdn-data `css/syntaxes.json`, mirroring CSS Color 4, where `rgba()` is a
   * full alias of `rgb()`.) So the declaration was PAINTING all along, and
   * tokenizing it repainted nothing.
   *
   * What the episode is really about is ARITY: the `[\d.]` lookahead matches on
   * the first argument and never counts them, which is the only reason this arm
   * caught the line at all. Pinned here so that "hardening" the regex into a
   * four-argument shape cannot silently un-ratchet the three-argument one.
   */
  it('flags a comma-form rgba() whether or not it carries the optional alpha', async () => {
    expect(await reports("export const s = { background: 'rgba(10,26,14)' }")).toBe(true)
    expect(await reports("export const s = { background: 'rgba(10,26,14,1)' }")).toBe(true)
  })

  /**
   * #2139. `filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25))` launders paint past
   * a rule that reads property NAMES: `filter` was not a `COLOUR_PROP` and does
   * not end in `Color`, so four sites went unreported and two of them sat in
   * files on no list at all. A cast shadow is precisely where a non-flipping
   * colour goes wrong, which is why #2007 had to mint `--color-cast-shadow`.
   *
   * The accepted cost, pinned here so nobody argues it back out: the value
   * carries GEOMETRY (blur, offset) beside the paint, so the rule flags a string
   * it can only partly judge. That does not contradict this repo's three rulings
   * that geometry is not paint's business — those are about where a VALUE lives,
   * and this is about what a MATCHER reads. The rule reports the declaration; a
   * reviewer resolves which half is at fault.
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
    // The `[\d.]` lookahead is what separates these two: `rgb(var(--x) / .4)` is
    // a token doing alpha, `rgba(0,0,0,.4)` is a hardcoded colour.
    expect(await lint("export const s = { background: 'rgb(var(--rgb-accent) / 0.4)' }")).toEqual([])
  })

  it("says nothing about the repo's own var()-backed Tailwind utilities", async () => {
    expect(await lint('export const A = () => <p className="text-ink bg-surface border-border" />')).toEqual(
      [],
    )
  })

  it('says nothing about a filter that carries no paint of its own', async () => {
    // The other half of #2139's widening. `filter` is a geometry-AND-paint
    // property, and the report only ever fires on the paint: a blur, or a
    // drop-shadow struck from a token, must stay silent. Otherwise the arm
    // becomes a reason to stop reaching for `filter`, which is the shape
    // `SnideProfileBody`'s credential frame needs — a shadow that follows the
    // card's cut edge rather than its box.
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
    // Read from the LIST rather than naming a file. A hardcoded path here is a
    // fixture that goes red the day someone migrates that file — which is the
    // one thing this list is for, so the check would be punishing the work it
    // exists to track. (#1609 hit exactly that: the fixture named
    // `AlbescentInvitation.tsx`, and burning group 2 down broke it.)
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
   * #2139's actual finding, and the one thing on this file that is not about a
   * regex: the report is a FLOOR, not the class. Two shapes stay invisible to
   * this rule ON PURPOSE — a module constant read as an `Identifier`, and a
   * component's own colour-named prop — so any "N files remaining" figure taken
   * from the list below undercounts, silently, by construction.
   *
   * Pinned because a warning that lives only in a comment is one refactor from
   * gone, and the failure it prevents is somebody quoting the list as an extent.
   * The assertion is on the WORD, not the sentence: rewording is fine, deleting
   * the framing is not.
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
    // A path that no longer exists is a line nobody can delete by migrating it,
    // so the list would stop shrinking without anyone noticing (#750's lesson,
    // wearing a filename).
    expect(
      entries.filter((entry) => !existsSync(new URL(`../../${entry}`, import.meta.url))),
    ).toEqual([])
  })
})
