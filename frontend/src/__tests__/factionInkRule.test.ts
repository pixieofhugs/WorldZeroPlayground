/**
 * Fixtures for the tier arm of the style ratchet (#1819).
 *
 * The seam is THE RULE AS WIRED — plugin registration, path globs, exemptions
 * and legacy list, all read out of the real `eslint.config.js` — not the regex.
 * That matters more here than it did for the colour arm (#1853), because this
 * rule's whole difficulty is its SCOPE: the same string is a defect inside
 * `archetypes/` and correct one directory up, and nothing but the wiring decides
 * which. A test that exercised the matcher alone would pass with the globs
 * deleted.
 *
 * This guards the RULE. The two notices #1819 was filed about are guarded at
 * their mount, in
 * `src/pages/editPraxis/archetypes/__tests__/composerQuietInk.test.tsx`.
 */
import { existsSync, readFileSync } from 'node:fs'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-global-ink-on-faction-surface'

/** A faction-dispatched surface, and a neutral one, as file paths. */
const ARCHETYPE = 'src/pages/praxisDetail/archetypes/InkFixture.tsx'
const MOBILE_ARCHETYPE = 'src/pages/fieldDesk/mobileArchetypes/InkFixture.tsx'
const FACTION_MARK = 'src/components/factionMarks/inkFixture.tsx'
const NEUTRAL_CHROME = 'src/components/layout/InkFixture.tsx'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

/** Rule ids reported for `code`, judged as if it lived at `filePath`. */
const lint = async (code: string, filePath: string): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return result.messages.filter((m) => m.ruleId === RULE).map((m) => m.message)
}

const reports = async (code: string, filePath: string): Promise<boolean> =>
  (await lint(code, filePath)).length > 0

describe(`${RULE} reports the global ink on a dressed surface`, () => {
  it('flags the #1819 shape — the neutral restated inline over `.label-caption`', async () => {
    expect(
      await reports(
        `export const A = () => <p className="label-caption" style={{ color: 'var(--color-text-tertiary)' }} />`,
        ARCHETYPE,
      ),
    ).toBe(true)
  })

  it('flags every member of the family, not just the tertiary the issue named', async () => {
    // #1819's grep was for `tertiary` and missed two live `secondary` sites in
    // the very file it was about. The family is the unit, not one name in it.
    for (const token of ['primary', 'secondary', 'tertiary']) {
      expect(
        await reports(`export const s = { color: 'var(--color-text-${token})' }`, ARCHETYPE),
        `--color-text-${token}`,
      ).toBe(true)
    }
  })

  it('flags it inside a shorthand template literal, where a value visitor is blind', async () => {
    expect(
      await reports(
        'export const s = (w: string) => ({ borderBottom: `${w} solid var(--color-text-secondary)` })',
        ARCHETYPE,
      ),
    ).toBe(true)
  })

  it('flags a module constant, which is the laundering route a prop visitor misses', async () => {
    // `const FAINT = 'var(--color-text-tertiary)'` at the top of a skin is the
    // same decision as writing it at the call site — and it never enters a
    // style object, so a `color:`-keyed visitor never sees it.
    expect(await reports("const FAINT = 'var(--color-text-tertiary)'", ARCHETYPE)).toBe(true)
  })

  it('reaches mobileArchetypes and factionMarks, not only desktop archetypes', async () => {
    // The mobile files are a SEPARATE tree (#494/#565); a desktop-only scope
    // would report green over half the app, which is the mistake the rendered
    // sweep's two viewports exist to avoid.
    const code = "export const s = { color: 'var(--color-text-tertiary)' }"
    expect(await reports(code, MOBILE_ARCHETYPE), MOBILE_ARCHETYPE).toBe(true)
    expect(await reports(code, FACTION_MARK), FACTION_MARK).toBe(true)
  })
})

describe(`${RULE} stays silent where the neutral is the right token`, () => {
  it('says nothing on neutral chrome — a global ban would be the wrong fix', async () => {
    // The whole difficulty of this rule is its scope. The identical string one
    // directory outside a faction surface is correct, because that surface is
    // the app's own paper and has no `--label-ink` to repoint.
    expect(
      await lint("export const s = { color: 'var(--color-text-tertiary)' }", NEUTRAL_CHROME),
    ).toEqual([])
  })

  it('says nothing about the seam itself', async () => {
    expect(
      await lint(
        "export const s = { color: 'var(--label-ink)', textDecorationColor: 'var(--link-ink)' }",
        ARCHETYPE,
      ),
    ).toEqual([])
  })

  it('says nothing about a `??` fallback — the ruling kept those on purpose', async () => {
    // A fallback applies only when the skin supplied no ink, which IS the
    // legitimate neutral default. Exempted in the rule rather than
    // grandfathered, because a line nobody can ever delete by migrating it
    // would make the shrinking list dishonest.
    expect(
      await lint(
        "export const tone = (ink?: string) => ink ?? 'var(--color-text-tertiary)'",
        ARCHETYPE,
      ),
    ).toEqual([])
  })

  it('says nothing about a fallback OBJECT, which puts the literal two levels down', async () => {
    expect(
      await lint(
        "export const s = (q?: object) => q ?? { color: 'var(--color-text-tertiary)' }",
        ARCHETYPE,
      ),
    ).toEqual([])
  })

  it('still flags the LEFT half of a `??` — the exemption is the fallback, not the operator', async () => {
    expect(
      await reports(
        "export const tone = (ink?: string) => 'var(--color-text-tertiary)' ?? ink",
        ARCHETYPE,
      ),
    ).toBe(true)
  })

  it('says nothing about a raw colour literal — that is the OTHER arm, on its own list', async () => {
    expect(await lint("export const s = { color: '#dc2626' }", ARCHETYPE)).toEqual([])
  })

  it('says nothing in a file on the legacy list', async () => {
    expect(
      await lint(
        "export const s = { color: 'var(--color-text-tertiary)' }",
        'src/pages/taskDetail/archetypes/DefaultTaskDetail.tsx',
      ),
    ).toEqual([])
  })

  it('says nothing in an archetype test, which asserts on the token by name', async () => {
    // The exemption block must sit AFTER the path block in flat config, or the
    // path glob wins and every archetype test goes red on its own assertions.
    expect(
      await lint(
        "export const s = 'var(--color-text-tertiary)'",
        'src/pages/praxisDetail/archetypes/__tests__/inkFixture.test.ts',
      ),
    ).toEqual([])
  })
})

describe('the legacy list stays honest', () => {
  it('is not empty, and every entry is a real path the rule can be turned off for', async () => {
    const entries = readFileSync(
      new URL('../../.eslint-legacy-faction-ink.txt', import.meta.url),
      'utf8',
    )
      .split('\n')
      .map((line) => line.split('#')[0].trim())
      .filter(Boolean)

    expect(entries.length).toBeGreaterThan(0)
    // A path that no longer exists is a line nobody can delete by migrating it,
    // so the list would stop shrinking without anyone noticing (#750's lesson,
    // wearing a filename).
    expect(
      entries.filter((entry) => !existsSync(new URL(`../../${entry}`, import.meta.url))),
    ).toEqual([])
  })

  it('holds only faction-dispatched paths — a delisting cannot widen the scope', async () => {
    const entries = readFileSync(
      new URL('../../.eslint-legacy-faction-ink.txt', import.meta.url),
      'utf8',
    )
      .split('\n')
      .map((line) => line.split('#')[0].trim())
      .filter(Boolean)

    expect(
      entries.filter((entry) => !/\/(archetypes|mobileArchetypes)\/|^src\/components\/factionMarks\//.test(entry)),
      'an entry outside the three dispatched directory names is a file the rule never judged — turning it "off" there is noise that makes the list look larger than the debt.',
    ).toEqual([])
  })
})
