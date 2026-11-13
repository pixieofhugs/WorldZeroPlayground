/**
 * #2889 — the lint half of #1780: which rules actually REACH `e2e/**`.
 *
 * The seam is flat-config `files` scope: a directory can be linted yet reached
 * by no rule, and the exit code stays green. Fixtures lint through the real
 * `eslint.config.js` at an `e2e/` path (same shape as `rawColourRule.test.ts`).
 *
 * Deliberately off: `i18next/no-literal-string` for `e2e/**` (selectors, not
 * copy), and the full rule set for `.ds-kit/**` (only axios) — widening that is
 * a human's call; the cases below pin the current state.
 */
import { relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

import { sourceFiles } from '../test/sourceScan'

const ANY_RULE = 'no-restricted-syntax'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

const rulesFor = async (code: string, filePath: string): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return result.messages.map((m) => m.ruleId ?? '(fatal)')
}

const reports = async (rule: string, code: string, filePath: string): Promise<boolean> =>
  (await rulesFor(code, filePath)).includes(rule)

/** Every module under `e2e/` as `e2e/...` paths (rejoined on `sep` for Windows). */
const E2E_DIR = fileURLToPath(new URL('../../e2e', import.meta.url))

const e2eSources = (): string[] =>
  sourceFiles({ dir: E2E_DIR }).map((path) => `e2e/${relative(E2E_DIR, path).split(sep).join('/')}`)

describe('`any` is banned in e2e/', () => {
  it('flags an `any` annotation in a spec — the collaboration.spec.ts shape', async () => {
    expect(
      await reports(
        ANY_RULE,
        'export const first = (rows: unknown[]) => rows.find((t: any) => t.level === 0)',
        'e2e/anyFixture.spec.ts',
      ),
    ).toBe(true)
  })

  it('flags `as any[]`, not just a bare annotation', async () => {
    expect(
      await reports(
        ANY_RULE,
        'export const all = (rows: unknown) => [...(rows as any[])]',
        'e2e/castFixture.spec.ts',
      ),
    ).toBe(true)
  })

  it('flags a helper module too, not only `.spec.ts` — duel.helpers.ts is one', async () => {
    expect(
      await reports(ANY_RULE, 'export const pick = (t: any) => t', 'e2e/someFixture.helpers.ts'),
    ).toBe(true)
  })

  it('leaves a typed spec alone', async () => {
    expect(
      await reports(
        ANY_RULE,
        'export const first = (rows: { level: number }[]) => rows.find((t) => t.level === 0)',
        'e2e/typedFixture.spec.ts',
      ),
    ).toBe(false)
  })
})

describe('the ban is unconditional', () => {
  /**
   * No allowlist. The fixtures above can't see a later `'off'` block (in flat
   * config the later block wins), so check the RESOLVED config of every real file.
   */
  it('resolves to error for every real file under e2e/', async () => {
    const sources = e2eSources()
    expect(sources.length).toBeGreaterThan(4)

    for (const file of sources) {
      const config = await eslint.calculateConfigForFile(file)
      // Severity is normalised to numeric: 2 = 'error'.
      const [severity] = config.rules[ANY_RULE] ?? []
      expect(`${file}: ${severity}`).toBe(`${file}: 2`)
    }
  })
})

describe('the rules that were missing from e2e/ now reach it', () => {
  it('judges raw colour in a spec', async () => {
    expect(
      await reports(
        'local/no-raw-colour-values',
        "export const s = { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }",
        'e2e/colourFixture.spec.ts',
      ),
    ).toBe(true)
  })

  it('judges raw style values in a spec', async () => {
    expect(
      await reports(
        'local/no-raw-style-values',
        "export const s = { padding: '12px' }",
        'e2e/styleFixture.spec.ts',
      ),
    ).toBe(true)
  })

  it('judges duplicated helpers in a spec', async () => {
    const twice = `
      export const a = (n: number) => {
        const doubled = n * 2
        const shifted = doubled + 1
        return shifted * shifted
      }
      export const b = (n: number) => {
        const doubled = n * 2
        const shifted = doubled + 1
        return shifted * shifted
      }
    `
    expect(await reports('sonarjs/no-identical-functions', twice, 'e2e/dupFixture.spec.ts')).toBe(
      true,
    )
  })

  it('still bans the axios import it already banned (#1400)', async () => {
    expect(
      await reports('no-restricted-imports', "import axios from 'axios'", 'e2e/axiosFixture.spec.ts'),
    ).toBe(true)
  })
})

describe('what stays off', () => {
  it('leaves literal strings in a spec alone — they are selectors, not copy', async () => {
    expect(
      await reports(
        'i18next/no-literal-string',
        'export const A = () => <p>Seal the duel?</p>',
        'e2e/literalFixture.spec.tsx',
      ),
    ).toBe(false)
  })

  it('does not widen the `any` ban to .ds-kit/ — that call is a human’s (#2889)', async () => {
    expect(await reports(ANY_RULE, 'export const pick = (t: any) => t', '.ds-kit/fixture.tsx')).toBe(
      false,
    )
  })

  it('keeps the axios ban on .ds-kit/, which is why that block exists', async () => {
    expect(await reports('no-restricted-imports', "import axios from 'axios'", '.ds-kit/fixture.tsx')).toBe(
      true,
    )
  })
})
