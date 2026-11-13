/*
 * #1911: the 40 per-faction key families collapse to one shared string each.
 * Two guards: no `<slug>.` branch survives and the shared key holds #1864's
 * agreed wording; and every `t("…")` literal in src resolves, because an i18n
 * miss renders blank instead of erroring.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import i18n from '../../i18n'
import { sourceFiles as walkSource, toRelative } from '../../test/sourceScan'

const HERE = dirname(fileURLToPath(import.meta.url))
const EN = join(HERE, '..', 'en')
const SRC = join(HERE, '..', '..')

/** Every leaf string in every en catalog, as `ns:dotted.key`. */
function catalogLeaves(): Array<[string, string]> {
  const walk = (node: unknown, path: string[]): Array<[string, string]> => {
    if (typeof node === 'string') return [[path.join('.'), node]]
    if (Array.isArray(node)) return node.flatMap((item, i) => walk(item, [...path, String(i)]))
    if (node && typeof node === 'object') {
      return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        walk(value, [...path, key]),
      )
    }
    return []
  }
  return walkSource({ dir: EN, match: /\.json$/ }).flatMap((path) => {
    const entry = path.slice(EN.length + 1)
    return walk(JSON.parse(readFileSync(path, 'utf8')), []).map(
      ([key, value]) => [`${entry.replace(/\.json$/, '')}:${key}`, value] as [string, string],
    )
  })
}

/**
 * Nine factions plus the `unaffiliated` alias. `default` is absent on purpose:
 * `factions:detail.default.*` is the shared block being collapsed onto.
 */
const SLUGS = [
  'albescent',
  'coven',
  'ephemerists',
  'everymen',
  'na',
  'singularity',
  'snide',
  'ua',
  'unaffiliated',
  'wow',
]

/**
 * `[banned pattern, shared key, agreed wording]`; `{F}` = any slug. ABOUT lists
 * per-faction section names, which a literal grep misses. The join panel's
 * old alternation is retired (#2299 made every faction use `join`); don't
 * widen it back.
 */
const ABOUT = '(about|manifesto|charter|practice|apparatus|manifest)'
const FAMILIES: Array<{ banned: string; shared: string; wording: string }> = [
  // common.json: phone FieldDesk masthead. Deliberately NOT #1864's "Home":
  // the kicker above already prints `common:nav.home` ("Home / Home").
  { banned: `common:fieldDesk\\.home\\.{F}\\.masthead`, shared: 'common:fieldDesk.home.title', wording: 'FieldDesk' },
  { banned: `common:fieldDesk\\.home\\.{F}\\.questsHeading`, shared: 'common:fieldDesk.home.questsHeading', wording: 'In progress' },

  // factions.json: faction detail page
  { banned: `factions:{F}\\.${ABOUT}\\.empty`, shared: 'factions:detail.descriptionEmpty', wording: 'No description yet.' },
  { banned: `factions:{F}\\.${ABOUT}\\.heading`, shared: 'factions:detail.aboutHeading', wording: 'About' },
  // Terms-slip label rows retired with the slip (#2298); see catalog.test.ts.
  { banned: `factions:{F}\\.join\\.confirmButton`, shared: 'factions:detail.join.confirmAction', wording: 'Confirm' },
  // {{faction}} not last: "S.N.I.D.E." would get a second full stop (#2368).
  { banned: `factions:{F}\\.join\\.gateBody`, shared: 'factions:mobile.gateHint', wording: 'Keep tasking for {{faction}} if you want to be invited.' },
  { banned: `factions:{F}\\.mobile\\.eyebrow`, shared: 'factions:detail.eyebrow', wording: 'Faction' },
  { banned: `factions:{F}\\.praxis\\.empty`, shared: 'factions:detail.default.recentEmpty', wording: 'No praxis submitted yet.' },
  { banned: `factions:{F}\\.praxis\\.heading`, shared: 'factions:detail.default.recentHeading', wording: 'Recent praxis' },
  { banned: `factions:{F}\\.roster\\.empty`, shared: 'factions:detail.membersEmpty', wording: 'No members yet.' },
  { banned: `factions:{F}\\.roster\\.emptyWithSpotlight`, shared: 'factions:detail.membersEmptyWithSpotlight', wording: 'No other members yet.' },
  { banned: `factions:{F}\\.roster\\.heading`, shared: 'factions:detail.default.membersHeading', wording: 'Members · {{total}}' },
  { banned: `factions:{F}\\.roster\\.level`, shared: 'factions:detail.memberLevel', wording: 'Level {{level}}' },
  { banned: `factions:{F}\\.spotlight\\.stat`, shared: 'factions:detail.spotlightStat', wording: 'Level {{level}} · {{score}} points' },
  { banned: `factions:{F}\\.tasks\\.empty`, shared: 'factions:detail.default.tasksEmpty', wording: 'No tasks yet.' },
  { banned: `factions:{F}\\.tasks\\.heading`, shared: 'factions:detail.default.tasksHeading', wording: 'Tasks · {{total}}' },

  // feed.json
  { banned: `feed:factionHero\\.{F}\\.stats\\.praxes`, shared: 'feed:factionHero.stats.praxes', wording: 'Praxis submitted' },
  { banned: `feed:factionHero\\.{F}\\.stats\\.tasks`, shared: 'feed:factionHero.stats.tasks', wording: 'Tasks open' },
  { banned: `feed:taskCard\\.{F}\\.levelCaption`, shared: 'feed:taskCard.levelCaption', wording: 'Level' },
  // Title Case: standalone labels are capitalised, inline values not (#2028).
  { banned: `feed:taskCard\\.{F}\\.pointsUnit`, shared: 'feed:taskCard.pointsUnit', wording: 'Points' },
  { banned: `feed:taskCard\\.{F}\\.signup`, shared: 'feed:taskCard.signup', wording: 'Sign up' },

  // praxis.json
  { banned: `praxis:comments\\.{F}\\.edited`, shared: 'praxis:comments.edited', wording: 'edited' },
  // Prompt line dropped; the shared placeholder speaks (else printed twice).
  { banned: `praxis:comments\\.{F}\\.prompt`, shared: 'praxis:comments.composerPlaceholder', wording: 'Say something worth keeping…' },

  // common.json: character-profile kits (#1858)
  { banned: `common:profile\\.{F}\\.badgeTitle`, shared: 'common:profile.badgesHeading', wording: 'Badges' },
  { banned: `common:profile\\.{F}\\.levelUnit`, shared: 'common:profile.ptsThisLevel', wording: '{{current}} / {{span}} pts this level' },
  { banned: `common:profile\\.{F}\\.nextLevel`, shared: 'common:profile.nextLevel', wording: 'next · lvl {{level}}' },
  { banned: `common:profile\\.{F}\\.praxisEmptyBody`, shared: 'common:profile.praxisEmptyBody', wording: 'Every path is still open — the first finding is the hardest.' },
  // Wording per #2046 ("submitted", not "sealed").
  { banned: `common:profile\\.{F}\\.praxisEmptyTitle`, shared: 'common:profile.praxisEmptyTitle', wording: 'No praxis submitted yet.' },
  { banned: `common:profile\\.{F}\\.praxisEyebrow`, shared: 'common:profile.praxisEyebrow', wording: 'Submitted by {{name}}' },
  // "lvl" -> "Level" per #2598.
  { banned: `common:profile\\.{F}\\.ringLabel`, shared: 'common:profile.lvl', wording: 'Level' },

  // votes.json
  { banned: `votes:chrome\\.{F}\\.rateAria`, shared: 'votes:chrome.rateAria', wording: 'Rate {{value}} — {{label}}' },
]

/**
 * Families deleted outright (no call sites left), listed so a future call site
 * must add the shared key deliberately with #1864's wording. `idle`/`tag` went
 * when #2166 removed the vote caption row.
 */
const COLLAPSED_TO_NOTHING = [
  `feed:factionCard\\.{F}\\.blurbFallback`,
  `feed:taskCard\\.{F}\\.level`,
  `feed:taskCard\\.{F}\\.points`,
  `praxis:comments\\.{F}\\.empty`,
  // The slot prints `character.display_name`; no copy to share.
  `common:fieldDesk\\.home\\.{F}\\.greeting`,
  // #2166: the stars already show the vote.
  `votes:(chrome\\.)?{F}\\.idle`,
  `votes:(chrome\\.)?{F}\\.tag`,
  // The composer speaks the neutral `composer.*` set (ADR-0065 §3, #1812).
  `forms:editPraxis\\.{F}(\\..+)?`,
]

function bannedRe(pattern: string): RegExp {
  return new RegExp(`^${pattern.replace('{F}', `(${SLUGS.join('|')})`)}$`)
}

describe('the 40 per-faction key families are one shared string each (#1911)', () => {
  const leaves = catalogLeaves()

  it('finds catalog leaves to scan, so the sweep cannot pass by scanning nothing', () => {
    expect(leaves.length).toBeGreaterThan(1000)
  })

  for (const { banned, shared, wording } of FAMILIES) {
    it(`${shared} is the only key left for its family`, () => {
      const re = bannedRe(banned)
      expect(leaves.map(([id]) => id).filter((id) => re.test(id))).toEqual([])
      const [ns, key] = shared.split(':')
      // Plural families live under `_other` (#2239).
      const leaf =
        leaves.find(([id]) => id === `${ns}:${key}`)
        ?? leaves.find(([id]) => id === `${ns}:${key}_other`)
      expect(leaf?.[1]).toBe(wording)
    })
  }

  for (const banned of COLLAPSED_TO_NOTHING) {
    it(`${banned} is gone, and gained no shared successor`, () => {
      const re = bannedRe(banned)
      expect(leaves.map(([id]) => id).filter((id) => re.test(id))).toEqual([])
      const orphan = banned.replace('\\.{F}', '').replace(/\\\./g, '.')
      expect(leaves.map(([id]) => id)).not.toContain(orphan)
    })
  }
})

// The blank-string guard.

/**
 * `src/` .ts/.tsx incl. tests, minus generated code and `.d.ts` (whose example
 * key is prose).
 */
function sourceFiles(dir: string): string[] {
  return walkSource({ dir, includeTests: true })
    .filter((path) => !toRelative(path).split('/').includes('generated'))
    .filter((path) => !path.endsWith('.d.ts'))
}

/** Keys tests name because they must NOT resolve. */
const DELIBERATE_MISSES = new Set([
  'votes:ephemerists.nonexistent',
  'nonexistent:some.key',
])

/**
 * Key literals a file hands to `t()`, namespaced: explicit `ns:key`, bare keys
 * bound by a single `useTranslation("ns")`, and any quoted `"ns:dotted.key"`
 * (so key tables stay visible, #2666). Template/computed keys are skipped;
 * render tests cover them.
 */
function keyLiterals(text: string, namespaceNames: Set<string>): string[] {
  const namespaces = [...text.matchAll(/useTranslation\(\s*["']([a-z]+)["']/g)].map((m) => m[1])
  const bound = namespaces.length === 1 ? namespaces[0] : null
  const out: string[] = []
  for (const m of text.matchAll(/\bt\(\s*(["'])([^"'`\n]+)\1/g)) {
    const key = m[2]
    // `<key>` placeholders are prose.
    if (key.includes('<')) continue
    if (key.includes(':')) {
      if (/^[a-z]+:[A-Za-z0-9_.-]+$/.test(key)) out.push(key)
    } else if (bound && /^[A-Za-z][\w.-]*$/.test(key) && key.includes('.')) {
      out.push(`${bound}:${key}`)
    }
  }
  for (const m of text.matchAll(/(["'])([a-z]+:[A-Za-z0-9_.-]*\.[A-Za-z0-9_.-]+)\1/g)) {
    if (namespaceNames.has(m[2].split(':')[0])) out.push(m[2])
  }
  return out
}

/** Plural keys exist only under their suffixes. */
const PLURAL_SUFFIXES = ['_one', '_other', '_ordinal_one', '_ordinal_other']

function resolves(key: string, known: Set<string>): boolean {
  return (
    known.has(key) || PLURAL_SUFFIXES.some((s) => known.has(`${key}${s}`)) || i18n.exists(key)
  )
}

describe('every i18n key literal in the source tree resolves (#1911)', () => {
  const files = sourceFiles(SRC)
  const leaves = catalogLeaves()
  const known = new Set(leaves.map(([id]) => id))
  const namespaceNames = new Set(leaves.map(([id]) => id.split(':')[0]))

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(300)
  })

  it('finds key literals to resolve, in both the namespaced and the bound shape', () => {
    const all = files.flatMap((f) => keyLiterals(readFileSync(f, 'utf8'), namespaceNames))
    expect(all.filter((k) => k.startsWith('feed:')).length).toBeGreaterThan(20)
    expect(all).toContain('factions:detail.default.membersHeading')
    expect(all).toContain('praxis:comments.time.default.now')
  })

  it('resolves every one of them to a non-empty string', () => {
    const missing: string[] = []
    for (const file of files) {
      for (const key of keyLiterals(readFileSync(file, 'utf8'), namespaceNames)) {
        if (DELIBERATE_MISSES.has(key) || resolves(key, known)) continue
        missing.push(`${file.slice(SRC.length + 1).replace(/\\/g, '/')} -> ${key}`)
      }
    }
    expect(missing).toEqual([])
  })
})

// #2299 / #2585: the join panel is one key path and one slot set.

/**
 * `tsc` catches a wrong path (key union is generated), but not a slot dropped
 * from or added to one faction; that's what this pins.
 */
const JOIN_FACTIONS = ['coven', 'ephemerists', 'everymen', 'singularity', 'snide', 'ua', 'wow']
const JOIN_SLOTS = [
  'eligibleBody',
  'eligibleTitle',
  'gateTitle',
  'heading',
  'joinButton',
  'joining',
  'memberStanding',
  'memberTitle',
]

describe('the join panel is one key path and one slot set (#2299)', () => {
  const leaves = catalogLeaves()

  for (const slug of JOIN_FACTIONS) {
    it(`${slug} fills the eight slots under ${slug}.join, and only those`, () => {
      const prefix = `factions:${slug}.join.`
      const slots = leaves
        .map(([id]) => id)
        .filter((id) => id.startsWith(prefix))
        .map((id) => id.slice(prefix.length))
        .sort()
      expect(slots).toEqual(JOIN_SLOTS)
    })
  }

  it('no faction keeps a per-faction parent name for the block', () => {
    const retired = new RegExp(
      `^factions:(${JOIN_FACTIONS.join('|')})\.(access|dispatch|registry|road|roll)\.`,
    )
    expect(leaves.map(([id]) => id).filter((id) => retired.test(id))).toEqual([])
  })

  it('no faction keeps its own confirm, kicker, overline or letterhead', () => {
    // Pinned to the seven slugs: `detail.join.*` is the shared block and stays.
    const cut = new RegExp(
      `^factions:(${JOIN_FACTIONS.join('|')})` +
        `\.join\.(confirm|confirmSwitch|eligibleKicker|gateKicker|reLabel|letterhead)$`,
    )
    expect(leaves.map(([id]) => id).filter((id) => cut.test(id))).toEqual([])
    expect(i18n.t('factions:detail.join.confirm', { faction: 'Cozy Coven' })).toBe(
      'Join Cozy Coven?',
    )
  })
})
