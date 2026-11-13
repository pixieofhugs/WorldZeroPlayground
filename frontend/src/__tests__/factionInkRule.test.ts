/**
 * Fixtures for the TWO faction-ink arms of the style ratchet (#1819, #2077).
 *
 * The seam is the rule AS WIRED in the real `eslint.config.js` (globs,
 * exemptions, legacy list), since the tier arm's whole difficulty is scope.
 *
 * Opposite polarities, kept adjacent: `no-global-ink-on-faction-surface` bans a
 * GLOBAL ink on a FACTION sheet; `no-faction-hue-as-ink` bans a FACTION hue as
 * ink anywhere. Widening the first rule's glob is the wrong fix for the second.
 * Mounts are guarded in `composerQuietInk.test.tsx` and `factionHueAsInkMounts.test.tsx`.
 */
import { existsSync, readFileSync } from 'node:fs'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-global-ink-on-faction-surface'
const HUE_RULE = 'local/no-faction-hue-as-ink'

/** A faction-dispatched surface, and a neutral one, as file paths. */
const ARCHETYPE = 'src/pages/praxisDetail/archetypes/InkFixture.tsx'
const MOBILE_ARCHETYPE = 'src/pages/fieldDesk/mobileArchetypes/InkFixture.tsx'
const FACTION_MARK = 'src/components/factionMarks/inkFixture.tsx'
const NEUTRAL_CHROME = 'src/components/layout/InkFixture.tsx'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

const lintRule = async (
  rule: string,
  code: string,
  filePath: string,
): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return result.messages.filter((m) => m.ruleId === rule).map((m) => m.message)
}

const lint = async (code: string, filePath: string): Promise<string[]> =>
  lintRule(RULE, code, filePath)

const reports = async (code: string, filePath: string): Promise<boolean> =>
  (await lint(code, filePath)).length > 0

const lintHue = async (code: string, filePath: string): Promise<string[]> =>
  lintRule(HUE_RULE, code, filePath)

const reportsHue = async (code: string, filePath: string): Promise<boolean> =>
  (await lintHue(code, filePath)).length > 0

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
    expect(await reports("const FAINT = 'var(--color-text-tertiary)'", ARCHETYPE)).toBe(true)
  })

  it('reaches mobileArchetypes and factionMarks, not only desktop archetypes', async () => {
    const code = "export const s = { color: 'var(--color-text-tertiary)' }"
    expect(await reports(code, MOBILE_ARCHETYPE), MOBILE_ARCHETYPE).toBe(true)
    expect(await reports(code, FACTION_MARK), FACTION_MARK).toBe(true)
  })
})

describe(`${RULE} stays silent where the neutral is the right token`, () => {
  it('says nothing on neutral chrome — a global ban would be the wrong fix', async () => {
    // App paper has no `--label-ink` to repoint, so the neutral is correct here.
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
    // A fallback is the legitimate neutral default when the skin supplies no ink.
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
    // The exemption block must sit AFTER the path block in flat config.
    expect(
      await lint(
        "export const s = 'var(--color-text-tertiary)'",
        'src/pages/praxisDetail/archetypes/__tests__/inkFixture.test.ts',
      ),
    ).toEqual([])
  })
})

describe(`${HUE_RULE} reports the bare spine hue in an ink role`, () => {
  it('flags the #2077 shape — `factionCssVar(slug)` with no shape argument', async () => {
    // No `var(--faction-` text here, so a token-text matcher is blind to it.
    expect(
      await reportsHue(
        'export const s = (slug: string) => ({ color: factionCssVar(slug) })',
        NEUTRAL_CHROME,
      ),
    ).toBe(true)
  })

  it('flags the token spelled out, on any surface, with no glob to satisfy', async () => {
    // A bare spine hue is a fill on every ground, so this arm has no path scope.
    for (const path of [NEUTRAL_CHROME, ARCHETYPE, FACTION_MARK]) {
      expect(await reportsHue("export const s = { color: 'var(--faction-coven)' }", path), path)
        .toBe(true)
    }
  })

  it('flags the SEAM variables, where the defect wears the fix\'s clothes', async () => {
    // Repointing `--label-ink` is sanctioned (#1754); at a bare hue it's the bug.
    // `--gem-ink` is the numeral's `color` one indirection away (#1932).
    for (const property of ['--label-ink', '--gem-ink', '--link-ink']) {
      expect(
        await reportsHue(`export const s = { '${property}': 'var(--faction-snide)' }`, ARCHETYPE),
        property,
      ).toBe(true)
    }
  })

  it('flags a hue laundered through a module const — the `--gem-ink` shape', async () => {
    expect(
      await reportsHue(
        'const accent = factionCssVar(slug)\nexport const s = { color: accent }',
        NEUTRAL_CHROME,
      ),
    ).toBe(true)
  })

  it('flags the shorthand `{ color }`, which names no value at all', async () => {
    expect(
      await reportsHue(
        'const color = factionCssVar(slug)\nexport const s = { color }',
        NEUTRAL_CHROME,
      ),
    ).toBe(true)
  })

  it('flags a `??` fallback, unlike the tier arm — and the asymmetry is the point', async () => {
    // A hue fallback fails on whichever ground passed no ink (`feedRowSkin`'s shape).
    expect(
      await reportsHue(
        'export const s = (ink?: string) => ({ color: ink ?? factionCssVar(slug) })',
        NEUTRAL_CHROME,
      ),
    ).toBe(true)
  })
})

describe(`${HUE_RULE} stays silent where the hue is doing its job`, () => {
  it('says nothing about the hue as a FILL, a RULE or a GLOW', async () => {
    // The hue keeps every non-ink role: the fix is "off the type", not "remove it".
    expect(
      await lintHue(
        'export const s = (slug: string) => ({\n'
          + '  background: factionCssVar(slug),\n'
          + "  borderLeft: `3px solid ${factionCssVar(slug)}`,\n"
          + "  boxShadow: `0 0 0 2px ${factionCssVar(slug)}`,\n"
          + "  '--gem-glow': factionCssVar(slug),\n"
          + '})',
        NEUTRAL_CHROME,
      ),
    ).toEqual([])
  })

  it('says nothing about a SUFFIXED member — those are measured pairings', async () => {
    // Suffixed inks are measured pairings (`CARD_PAIRS`, #651). Arity tests the
    // helper; the first hyphen tests the token.
    expect(
      await lintHue(
        'export const s = (slug: string) => ({\n'
          + "  color: factionCssVar(slug, 'card-text'),\n"
          + "  caretColor: 'var(--faction-wow-card-muted)',\n"
          + '})',
        NEUTRAL_CHROME,
      ),
    ).toEqual([])
  })

  it('says nothing about the neutral tiers or the seam read bare', async () => {
    expect(
      await lintHue(
        "export const s = { color: 'var(--color-text-primary)' }",
        'src/pages/Factions.tsx',
      ),
    ).toEqual([])
    expect(await lintHue("export const s = { color: 'var(--label-ink)' }", ARCHETYPE)).toEqual([])
  })

  it('has no legacy list left to hide behind (#2108)', async () => {
    expect(existsSync(new URL('../../.eslint-legacy-faction-hue-ink.txt', import.meta.url))).toBe(
      false,
    )
    expect(readFileSync(new URL('../../eslint.config.js', import.meta.url), 'utf8')).not.toContain(
      'LEGACY_FACTION_HUE_INK_FILES',
    )
    expect(
      await reportsHue(
        'export const s = (slug: string) => ({ color: factionCssVar(slug) })',
        'src/components/ActivityTicker.tsx',
      ),
    ).toBe(true)
  })

  it('reaches an ink one MODULE away — `FeedRowInk.actor` (#2108)', async () => {
    // `actor` becomes a `color` in `FeedRowContent`; named in the rule's INK_PROPS.
    expect(
      await reportsHue(
        'export const s = (slug: string) => ({ actor: factionCssVar(slug) })',
        'src/components/feed/probe.ts',
      ),
    ).toBe(true)
  })

  it('says nothing in `roomPresence.ts`, whose `color` is not a CSS declaration', async () => {
    // A y-codemirror awareness field (caret colour), not an ink; exempted outright.
    expect(
      await lintHue(
        'export const s = (slug: string) => ({ color: factionCssVar(slug) })',
        'src/pages/editPraxis/roomPresence.ts',
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
    // A dead path can never be migrated off, so the list would stop shrinking.
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
