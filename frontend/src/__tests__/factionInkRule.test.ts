/**
 * Fixtures for the TWO faction-ink arms of the style ratchet (#1819, #2077).
 *
 * The seam is THE RULE AS WIRED — plugin registration, path globs, exemptions
 * and legacy list, all read out of the real `eslint.config.js` — not the regex.
 * That matters more here than it did for the colour arm (#1853), because the
 * tier arm's whole difficulty is its SCOPE: the same string is a defect inside
 * `archetypes/` and correct one directory up, and nothing but the wiring decides
 * which. A test that exercised the matcher alone would pass with the globs
 * deleted.
 *
 * BOTH ARMS LIVE HERE BECAUSE THEY ARE ONE SEAM READ FROM TWO SIDES, and the
 * pair is easy to get backwards. `no-global-ink-on-faction-surface` bans a
 * GLOBAL ink on a FACTION sheet; `no-faction-hue-as-ink` (#2077) bans a FACTION
 * hue as ink anywhere. #2077 was filed asking for the first rule's glob to be
 * widened to `components/factionCard/` and `pages/`, and that is the wrong lever
 * twice: the tier arm cannot see a `--faction-*` token at all, and on those two
 * paths it would ban `var(--color-text-primary)` — the token the #2077 fix
 * reaches for. §3 had already recorded that ruling for `pages/players/`.
 * Keeping the fixtures adjacent is what makes the polarity legible.
 *
 * These guard the RULES. The notices #1819 was filed about are guarded at their
 * mount in `src/pages/editPraxis/archetypes/__tests__/composerQuietInk.test.tsx`;
 * #2077's twelve are guarded at theirs in
 * `src/__tests__/factionHueAsInkMounts.test.tsx`.
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

/** Messages from `rule` reported for `code`, judged as if it lived at `filePath`. */
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

describe(`${HUE_RULE} reports the bare spine hue in an ink role`, () => {
  it('flags the #2077 shape — `factionCssVar(slug)` with no shape argument', async () => {
    // Eleven of the twelve sites were written exactly this way, and none of them
    // contains the string `var(--faction-`. A rule matching the token text (as
    // the tier arm does) is blind to every one of them.
    expect(
      await reportsHue(
        'export const s = (slug: string) => ({ color: factionCssVar(slug) })',
        NEUTRAL_CHROME,
      ),
    ).toBe(true)
  })

  it('flags the token spelled out, on any surface, with no glob to satisfy', async () => {
    // The scope argument, asserted rather than described: a bare spine hue is a
    // FILL on every ground in the app, so unlike the tier arm this one has no
    // path list and the identical string is a defect in neutral chrome and in a
    // faction archetype alike.
    for (const path of [NEUTRAL_CHROME, ARCHETYPE, FACTION_MARK]) {
      expect(await reportsHue("export const s = { color: 'var(--faction-coven)' }", path), path)
        .toBe(true)
    }
  })

  it('flags the SEAM variables, where the defect wears the fix\'s clothes', async () => {
    // Repointing `--label-ink` on a faction root is the sanctioned move (#1754).
    // Pointing it at a BARE hue is the bug, and it lands on every label the frame
    // holds at once. `--gem-ink` is here for #1932's reason: it IS the numeral's
    // `color`, one indirection away in index.css, and the indirection is what hid
    // the original.
    for (const property of ['--label-ink', '--gem-ink', '--link-ink']) {
      expect(
        await reportsHue(`export const s = { '${property}': 'var(--faction-snide)' }`, ARCHETYPE),
        property,
      ).toBe(true)
    }
  })

  it('flags a hue laundered through a module const — the `--gem-ink` shape', async () => {
    // Five of the twelve sites the rule reported outside #2077's own list are
    // written this way. Nothing named a colour at the call site, so a reader
    // scanning for inks walks straight past it.
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
    // There a fallback is the legitimate neutral default. Here it is
    // `feedRowSkin`'s live shape: a documented default that every chassis
    // overrides, failing on the one ground for which nobody passed an ink.
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
    // The other half of the doctrine, and the half a careless sweep breaks: the
    // hue keeps every non-ink role. If this goes red, the fix has been read as
    // "remove the faction colour" instead of "move it off the type".
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
    // `-card-text` is an ink measured against a named ground, gated by
    // `CARD_PAIRS` since #651. A pattern sweeping the whole `--faction-` prefix
    // would report a measured pairing as a defect and teach the next editor to
    // strip it. Arity is the test for the helper; the first hyphen is the test
    // for the token.
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
    // What the #2077 fix actually reaches for. If widening the TIER arm's glob to
    // `pages/` had been the fix, this exact code would be the build break.
    expect(
      await lintHue(
        "export const s = { color: 'var(--color-text-primary)' }",
        'src/pages/Factions.tsx',
      ),
    ).toEqual([])
    expect(await lintHue("export const s = { color: 'var(--label-ink)' }", ARCHETYPE)).toEqual([])
  })

  it('says nothing in a file on the legacy list', async () => {
    expect(
      await lintHue(
        'export const s = (slug: string) => ({ color: factionCssVar(slug) })',
        'src/components/ActivityTicker.tsx',
      ),
    ).toEqual([])
  })

  it('says nothing in `roomPresence.ts`, whose `color` is not a CSS declaration', async () => {
    // A y-codemirror awareness field, not an ink — a caret is a MARK. Exempted
    // outright rather than grandfathered, because it will never migrate and a
    // shrinking list would be lying about it.
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

  it('the polarity arm\'s list is real paths, and each still reports (#2077)', async () => {
    const entries = readFileSync(
      new URL('../../.eslint-legacy-faction-hue-ink.txt', import.meta.url),
      'utf8',
    )
      .split('\n')
      .map((line) => line.split('#')[0].trim())
      .filter(Boolean)

    expect(entries.length).toBeGreaterThan(0)
    expect(
      entries.filter((entry) => !existsSync(new URL(`../../${entry}`, import.meta.url))),
    ).toEqual([])

    // AND THE ENTRY IS STILL EARNING ITS PLACE. The `-faction-ink` list above
    // cannot make this check — the rule is off for those paths, so asking it what
    // it would say means re-linting the file's own text, which for a 900-line
    // archetype is not a fixture. This arm's list is four files, so it is cheap:
    // read each one and confirm the rule still has something to say about it. A
    // file that stopped violating and stayed listed is how a shrink-only list
    // quietly stops shrinking (#750, wearing a filename).
    for (const entry of entries) {
      const source = readFileSync(new URL(`../../${entry}`, import.meta.url), 'utf8')
      const messages = await lintRule(HUE_RULE, source, `src/__probe__/${entry.split('/').pop()}`)
      expect(messages.length, `${entry} no longer violates — delete its line`).toBeGreaterThan(0)
    }
  })
})
