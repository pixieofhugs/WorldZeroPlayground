/**
 * #2889 — the lint half of #1780: which rules actually REACH `e2e/**`.
 *
 * THE SEAM
 * --------
 * Not any one rule's logic. The seam is flat-config rule SCOPE: which `files`
 * glob each block in `eslint.config.js` matches. `npm run lint` has been
 * `eslint src .ds-kit e2e` since #1400, so the spec files were always visited —
 * but every rule that matters was registered under `files: ['src/**\/*.{ts,tsx}']`
 * and reached none of them. A directory can be fully linted and fully
 * unjudged at the same time, and nothing about the command line shows it.
 *
 * That gap is invisible to a `npm run lint` exit code, which is why it survived
 * from #1780 to here: the run was green because the rules were absent, not
 * because the code was clean. So these fixtures lint real source text through
 * the real `eslint.config.js` — same plugin registration, same exemptions CI
 * runs — judged as if it lived at an `e2e/` path, and assert on what comes
 * back. Same shape as `rawColourRule.test.ts` and `factionInkRule.test.ts`.
 *
 * The `any` ban is UNCONDITIONAL and there is no legacy list. It shipped with a
 * two-file one, because #2888 was still in flight; #2888 merged (#2933) and
 * typed all five annotations away, so the list went with them. `the ban is
 * unconditional` below is what keeps it that way.
 *
 * WHAT IS DELIBERATELY *NOT* ENFORCED HERE
 * ----------------------------------------
 * `i18next/no-literal-string` stays off for `e2e/**`. A Playwright spec is made
 * of literal strings — selectors, URLs, typed input — and none of it is copy.
 * The exemption predates this issue and is load-bearing; the last test below is
 * what stops a future "let's finish the i18n sweep" pass from deleting it.
 *
 * `.ds-kit/**` also keeps only the axios ban. It reports zero under the full
 * rule set today, so widening to it would be free — but free is not the same as
 * asked for (#2889 scopes to `e2e/**`), and a lint glob widened on the grounds
 * that it happens to be quiet today is a glob nobody decided on. Left for a
 * human. The `.ds-kit` cases below pin the CURRENT state so that widening it is
 * an explicit edit rather than a side effect.
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

/** Rule ids reported for `code`, judged as if it lived at `filePath`. */
const rulesFor = async (code: string, filePath: string): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return result.messages.map((m) => m.ruleId ?? '(fatal)')
}

const reports = async (rule: string, code: string, filePath: string): Promise<boolean> =>
  (await rulesFor(code, filePath)).includes(rule)

/**
 * Every real spec/helper module under `e2e/`, as repo-relative paths.
 *
 * Walked with `sourceFiles()` rather than a private `readdirSync`, which #2887
 * bans anywhere under `src/` — it takes a `dir`, so pointing it at a sibling
 * tree costs nothing. `includeTests` is irrelevant here: `e2e/` has no
 * `__tests__` directory, the specs ARE the tests. Paths are rejoined on `sep`
 * so the ids match the `e2e/...` form ESLint resolves against on Windows too.
 */
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
   * This shipped WITH a two-file shrink-only allowlist, because #2888 was
   * still in flight and a big-bang ban would have redded `main` if it merged
   * second. #2888 merged (#2933), typed all five annotations away, and the
   * allowlist went with them — an empty legacy list left behind reads like
   * debt nobody has looked at (#2108).
   *
   * This case is what stops one coming back by the side door. The `lintText`
   * fixtures above only prove the rule fires at a path nobody has exempted;
   * they say nothing about a `'no-restricted-syntax': 'off'` block added
   * LATER in the config, which in flat config is the one that wins. So ask
   * ESLint what it actually RESOLVED for every file that exists, and require
   * `error` for all of them.
   */
  it('resolves to error for every real file under e2e/', async () => {
    const sources = e2eSources()
    expect(sources.length).toBeGreaterThan(4)

    for (const file of sources) {
      const config = await eslint.calculateConfigForFile(file)
      // `calculateConfigForFile` normalises severity to the numeric form, so 2
      // is 'error' and the value to watch for is 0 — a later block switching the
      // rule back off for some path is exactly what this case exists to catch.
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
