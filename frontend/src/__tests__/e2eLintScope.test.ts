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
 * the real `eslint.config.js` — same plugin registration, same ratchet, same
 * exemptions CI runs — judged as if it lived at an `e2e/` path, and assert on
 * what comes back. Same shape as `rawColourRule.test.ts` and
 * `factionInkRule.test.ts`.
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
import { existsSync, readFileSync } from 'node:fs'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

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

/** The un-migrated spec files on the shrink-only list, comments stripped. */
const legacyEntries = (): string[] =>
  readFileSync(new URL('../../.eslint-legacy-e2e-any.txt', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.split('#')[0].trim())
    .filter(Boolean)

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

describe('the shrink-only allowlist', () => {
  it('silences the rule for a file still on it', async () => {
    const [grandfathered] = legacyEntries()
    expect(grandfathered).toBeTruthy()
    expect(await reports(ANY_RULE, 'export const pick = (t: any) => t', grandfathered)).toBe(false)
  })

  it('lists only files that exist — an entry for a deleted file is dead weight', () => {
    for (const entry of legacyEntries()) {
      expect(existsSync(new URL(`../../${entry}`, import.meta.url))).toBe(true)
    }
  })

  it('lists only e2e paths — it may never grandfather anything else', () => {
    for (const entry of legacyEntries()) {
      expect(entry.startsWith('e2e/')).toBe(true)
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
