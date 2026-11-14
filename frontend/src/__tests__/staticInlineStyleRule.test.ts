/** ADR-0095 ratchet, linted through the real eslint.config.js. */
import { existsSync, readFileSync } from 'node:fs'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-static-inline-style'
let eslint: ESLint
beforeAll(() => {
  eslint = new ESLint()
})

const reports = async (code: string, filePath = 'src/staticStyleFixture.tsx') => {
  const [r] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return r.messages.some((m) => m.ruleId === RULE)
}

const legacy = readFileSync(new URL('../../.eslint-legacy-static-style.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((l) => l.split('#')[0].trim())
  .filter(Boolean)

describe(RULE, () => {
  it('flags literals and bare token reads', async () => {
    expect(await reports("export const A = () => <p style={{ color: 'var(--x)', padding: 4 }} />")).toBe(true)
  })

  it('passes anything derived from a prop, variable, spread or template expression', async () => {
    expect(await reports("export const A = ({ w }: { w: number }) => <p style={{ width: w, color: 'var(--x)' }} />")).toBe(false)
    expect(await reports("const C = 'var(--x)'\nexport const A = () => <p style={{ color: C }} />")).toBe(false)
    expect(await reports("export const A = ({ s }: { s: object }) => <p style={{ ...s, top: 0 }} />")).toBe(false)
    expect(await reports('export const A = () => <p style={{ color: `var(--x-${1})` }} />')).toBe(false)
  })

  it('passes a style that is not an inline object', async () => {
    expect(await reports('export const A = ({ s }: { s: object }) => <p style={s} />')).toBe(false)
  })

  it('is off for test files and for legacy files', async () => {
    const code = 'export const A = () => <p style={{ top: 0 }} />'
    expect(await reports(code, 'src/__tests__/x.tsx')).toBe(false)
    expect(await reports(code, legacy[0])).toBe(false)
  })
})

const LEGACY_CEILING = 284

describe('the legacy list stays honest', () => {
  it('never grows: lower LEGACY_CEILING when you delist a file', () => {
    expect(legacy.length, 'a file was added to .eslint-legacy-static-style.txt; fix its style instead').toBeLessThanOrEqual(LEGACY_CEILING)
    expect(legacy.length, 'legacy list shrank: lower LEGACY_CEILING to match').toBe(LEGACY_CEILING)
  })

  it('names only real files', () => {
    expect(legacy.length).toBeGreaterThan(0)
    expect(legacy.filter((f) => !existsSync(new URL(`../../${f}`, import.meta.url)))).toEqual([])
  })

  it('lists no file that has gone clean: delist it', async () => {
    // Lint each file's source under an unlisted path so the rule is live.
    const clean: string[] = []
    for (const f of legacy) {
      const code = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')
      if (!(await reports(code, 'src/legacyProbe.tsx'))) clean.push(f)
    }
    expect(clean).toEqual([])
  }, 300_000)
})
