/* ========================================================================== *
 * #1911 — the 40 per-faction key families collapse to one shared string each.
 *
 * THE SEAM IS TWO THINGS AT ONCE, and both are here because either alone lets
 * the bug through:
 *
 *   1. THE CATALOG SHAPE. No `<slug>.` branch survives for any of the 40
 *      families, and the one key that replaces it holds the wording #1864's
 *      table agreed, verbatim. A leftover branch is dead copy that a later
 *      voice pass would treat as live.
 *
 *   2. THE CALL SITES RESOLVE. This is the collapse's real hazard: i18n
 *      resolves a miss to the key name or to an empty string, never to an
 *      error, so a mistyped key survives `tsc`, survives the render tests that
 *      do not assert that exact word, and ships as a blank line. A ~300-site
 *      mechanical edit is exactly where that happens, so the second block walks
 *      every `t("…")` literal in the source tree and resolves it against the
 *      catalog.
 *
 * Both read the catalog and the source tree rather than any rendered markup —
 * the harness has no DOM, and the words are what changed.
 * ========================================================================== */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import i18n from '../../i18n'

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
  return readdirSync(EN)
    .filter((entry) => entry.endsWith('.json'))
    .flatMap((entry) =>
      walk(JSON.parse(readFileSync(join(EN, entry), 'utf8')), []).map(
        ([key, value]) => [`${entry.replace(/\.json$/, '')}:${key}`, value] as [string, string],
      ),
    )
}

/**
 * The nine factions, plus the two aliases the catalog has used for the
 * unaffiliated one. `default` is deliberately absent: `factions:detail.default.*`
 * is the SHARED block every body now reads, not a faction branch (#1864 lists it
 * as "not faction copy" — it only appears in the audit through an extractor
 * alias), and collapsing onto it is the point.
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
 * #1911's 40 families, as `[banned key pattern, shared key, agreed wording]` —
 * minus the two the terms slip owned, retired in place below (#2298).
 *
 * The pattern is matched against `ns:dotted.key` with `{F}` standing for any
 * slug. Some families' per-faction key sat under a per-faction SECTION name
 * (`coven.manifesto.empty`, `ephemerists.plate.…`), which is why `ABOUT`
 * still names the section alternatives rather than a fixed path — a literal
 * grep returns zero for those, which is how the 2026-08-16 audit undercounted
 * them.
 *
 * The join panel used to need the same treatment: a
 * `(join|roll|road|dispatch|registry|access)` alternation, one arm per faction,
 * whose only job was to paper over seven names for one block. #2299 gave all
 * seven the literal `join`, so the alternation is retired rather than widened
 * — retiring it is the whole point. WIDENING IT BACK would re-admit the
 * per-faction parent name this repo just paid to remove.
 */
const ABOUT = '(about|manifesto|charter|practice|apparatus|manifest)'
const FAMILIES: Array<{ banned: string; shared: string; wording: string }> = [
  // --- common.json: the phone FieldDesk masthead -------------------------
  //
  // ⚠ The masthead does NOT take #1864's agreed "Home", and the deviation is
  // deliberate. That word is already on this page: all eight desks print
  // `common:nav.home` as the kicker directly above the h1, so "Home" there
  // would read "Home / Home". The h1's shared string is the one the na, Coven
  // and Everymen desks already carry — `fieldDesk.home.title` — and pointing
  // the other four at it is what makes the eight say one thing. If the owner
  // wants the literal "Home", it is a one-leaf value edit on that key.
  { banned: `common:fieldDesk\\.home\\.{F}\\.masthead`, shared: 'common:fieldDesk.home.title', wording: 'FieldDesk' },
  { banned: `common:fieldDesk\\.home\\.{F}\\.questsHeading`, shared: 'common:fieldDesk.home.questsHeading', wording: 'In progress' },

  // --- factions.json: the faction detail page ---------------------------
  { banned: `factions:{F}\\.${ABOUT}\\.empty`, shared: 'factions:detail.descriptionEmpty', wording: 'No description yet.' },
  { banned: `factions:{F}\\.${ABOUT}\\.heading`, shared: 'factions:detail.aboutHeading', wording: 'About' },
  // Two rows stood here — `{F}.invitation.terms.1.label` and `.2.label`,
  // collapsed onto `invitation.skillsLabel` / `.outputLabel`. #2298 deleted the
  // terms slip out of all eight letters, shared labels included, so both rules
  // now police a key on neither side of the collapse. A rule guarding a family
  // that no longer exists is dead weight, and it cannot fail: retired, not
  // rewritten. `catalog.test.ts` is where the slip's absence is pinned.
  { banned: `factions:{F}\\.join\\.confirmButton`, shared: 'factions:detail.join.confirmAction', wording: 'Confirm' },
  // The interpolation moved off the end of the sentence (#2368): "…to
  // {{faction}}." appended a full stop to "S.N.I.D.E.", the one faction name
  // that already carries one, and rendered "S.N.I.D.E..". The imperative is
  // still here, it just lands last. `catalog.test.ts` holds the general guard.
  { banned: `factions:{F}\\.join\\.gateBody`, shared: 'factions:mobile.gateHint', wording: 'An invitation to {{faction}} is earned. Keep completing tasks.' },
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

  // --- feed.json: the faction hero and the task card --------------------
  { banned: `feed:factionHero\\.{F}\\.stats\\.praxes`, shared: 'feed:factionHero.stats.praxes', wording: 'Praxis submitted' },
  { banned: `feed:factionHero\\.{F}\\.stats\\.tasks`, shared: 'feed:factionHero.stats.tasks', wording: 'Tasks open' },
  { banned: `feed:taskCard\\.{F}\\.levelCaption`, shared: 'feed:taskCard.levelCaption', wording: 'Level' },
  // "Points", not #1864's "points": the owner split the row by ROLE for #2028 —
  // a standalone label or caption is Title Case, an inline interpolated value
  // (`taskCard.points`, `detail.spotlightStat`) stays lowercase because it reads
  // as a sentence. This unit word stands alone beside a figure.
  { banned: `feed:taskCard\\.{F}\\.pointsUnit`, shared: 'feed:taskCard.pointsUnit', wording: 'Points' },
  { banned: `feed:taskCard\\.{F}\\.signup`, shared: 'feed:taskCard.signup', wording: 'Sign up' },

  // --- praxis.json: the comment thread ----------------------------------
  { banned: `praxis:comments\\.{F}\\.edited`, shared: 'praxis:comments.edited', wording: 'edited' },
  // The four bespoke composer PROMPTS settle onto the placeholder the shared
  // `ComposerControls` textarea already shows in all eight voices. Pointing the
  // prompt LINE at the same string would have printed the sentence twice on the
  // same composer, so the line goes and the placeholder speaks — which is what
  // the other four voices already did.
  { banned: `praxis:comments\\.{F}\\.prompt`, shared: 'praxis:comments.composerPlaceholder', wording: 'Say something worth keeping…' },

  // --- common.json: the seven character-profile kits (#1858) ------------
  { banned: `common:profile\\.{F}\\.badgeTitle`, shared: 'common:profile.badgesHeading', wording: 'Badges' },
  { banned: `common:profile\\.{F}\\.levelUnit`, shared: 'common:profile.ptsThisLevel', wording: '{{current}} / {{span}} pts this level' },
  { banned: `common:profile\\.{F}\\.nextLevel`, shared: 'common:profile.nextLevel', wording: 'next · lvl {{level}}' },
  { banned: `common:profile\\.{F}\\.praxisEmptyBody`, shared: 'common:profile.praxisEmptyBody', wording: 'Every path is still open — the first finding is the hardest.' },
  // The one row whose WORDING outlived #1911. #1864's collapse table kept
  // "sealed" here while #1863's ruling C retired that very word, so #1911 —
  // which owns key STRUCTURE — collapsed the key and shipped the string
  // untouched rather than picking between two closed issues. #2046 is the owner
  // ruling that picked: "submitted", and the retired word leaves the one place
  // a player reads it.
  { banned: `common:profile\\.{F}\\.praxisEmptyTitle`, shared: 'common:profile.praxisEmptyTitle', wording: 'No praxis submitted yet.' },
  { banned: `common:profile\\.{F}\\.praxisEyebrow`, shared: 'common:profile.praxisEyebrow', wording: 'Submitted by {{name}}' },
  // #2598 took the shared wording long: "lvl" -> "Level". The collapse this row
  // guards is unchanged — what it pins is that the seven `ringLabel` keys are
  // still gone and the one survivor still says what the owner ruled it says.
  { banned: `common:profile\\.{F}\\.ringLabel`, shared: 'common:profile.lvl', wording: 'Level' },

  // --- votes.json: the vote widget chrome -------------------------------
  { banned: `votes:chrome\\.{F}\\.rateAria`, shared: 'votes:chrome.rateAria', wording: 'Rate {{value}} — {{label}}' },
]

/**
 * Seven of the 40 collapsed to NOTHING rather than to a shared key: every call
 * site for them had already gone, so the family was orphaned copy and a shared
 * key holding the agreed wording would have been dead on arrival. `comments.
 * {F}.empty` is the clearest case — WOW held the only one and no comment thread
 * in the app renders an empty state at all.
 *
 * The last two arrived later than the rest: `{F}.idle` and `{F}.tag` DID
 * collapse onto shared keys in #1911, and then #2166 took the caption row those
 * shared keys fed off every vote widget, so both ended up here after all.
 *
 * Listed by name so "we deleted it" stays a decision on the record rather than
 * an omission, and so a future call site has to add the shared key
 * deliberately, with the agreed wording from #1864's table.
 */
const COLLAPSED_TO_NOTHING = [
  `feed:factionCard\\.{F}\\.blurbFallback`,
  `feed:taskCard\\.{F}\\.level`,
  `feed:taskCard\\.{F}\\.points`,
  `praxis:comments\\.{F}\\.empty`,
  // WOW's "Good morrow, Sir {{name}}." was the app's only greeting. The slot it
  // sat in is the carried life's NAME on the FieldDesk identity card, and the
  // other seven desks print `character.display_name` into it — there is no copy
  // string to share, so the shared behaviour is the name.
  `common:fieldDesk\\.home\\.{F}\\.greeting`,
  // #2166: "cast a vote" / "your vote" — the caption line under the vote stars.
  // The stars fill to the viewer's value, so the words restated what the row
  // already drew. `votes:chrome.voted` ("Voted {{stars}} pts") went with them;
  // it never had a per-faction family, so it has no row here.
  `votes:(chrome\\.)?{F}\\.idle`,
  `votes:(chrome\\.)?{F}\\.tag`,
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
      // A pluralised family lives under `_one`/`_other` rather than a bare leaf
      // (#2239). The agreed wording is the plural, which is what the surface
      // prints for every count but one.
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
      // The shared name the family WOULD have taken must not exist either.
      const orphan = banned.replace('\\.{F}', '').replace(/\\\./g, '.')
      expect(leaves.map(([id]) => id)).not.toContain(orphan)
    })
  }
})

/* -------------------------------------------------------------------------- *
 * The blank-string guard.
 * -------------------------------------------------------------------------- */

/**
 * Every `.ts`/`.tsx` under `src/`, minus the generated API client and the
 * ambient declarations — `i18next.d.ts` documents the call shape with a literal
 * example key, which is prose, not a lookup.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return entry === 'generated' ? [] : sourceFiles(full)
    if (entry.endsWith('.d.ts')) return []
    return ['.ts', '.tsx'].includes(extname(entry)) ? [full] : []
  })
}

/**
 * Keys a test names **because** they must not resolve — a `t()` miss fixture,
 * or an `i18n.exists(…)).toBe(false)` asserting a collapsed faction branch
 * stayed collapsed. Both are the absence of copy, which is the opposite of a
 * missing key.
 */
const DELIBERATE_MISSES = new Set([
  'votes:ephemerists.nonexistent',
  'nonexistent:some.key',
  'forms:editPraxis.everymen',
  'forms:editPraxis.snide',
])

/**
 * The key literals a file hands to `t()` / `i18n.t()`, already namespaced.
 *
 * Two shapes reach the catalog and both are read here: an explicit namespaced
 * literal (`feed:taskCard.signup`), and a bare one (`coven.roster.heading`)
 * whose namespace comes from the file's own `useTranslation("factions")`. The
 * bare shape is the one that matters — it is what every faction body uses, and
 * a plain grep for a namespaced key never sees it.
 *
 * A third shape is a namespaced literal held in a TABLE and handed to `t()` a
 * line later — `commentTime.ts` keeps one so its per-faction keys stay literal
 * and greppable instead of becoming `t(\`praxis:...${slug}...\`)` (#2666). Any
 * `"ns:dotted.key"` whose namespace is a real catalog file is read, wherever in
 * the file it sits; that is what makes such a table visible to this sweep at
 * all, which is the point of writing one.
 *
 * Template literals and computed keys are skipped on purpose: they are resolved
 * at runtime and the render tests are what cover them.
 */
function keyLiterals(text: string, namespaceNames: Set<string>): string[] {
  const namespaces = [...text.matchAll(/useTranslation\(\s*["']([a-z]+)["']/g)].map((m) => m[1])
  const bound = namespaces.length === 1 ? namespaces[0] : null
  const out: string[] = []
  for (const m of text.matchAll(/\bt\(\s*(["'])([^"'`\n]+)\1/g)) {
    const key = m[2]
    // `<key>` / `<rankKey>` are placeholders in prose, not lookups.
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

/**
 * A plural key lives in the catalog under its suffixes, never under the base the
 * code passes: `_one` / `_other` for cardinals, and `_ordinal_one` … for
 * ordinals (`comments.time.ephemerists.day` → `day_ordinal_one`, #2666). Both
 * shapes always carry an `_other`, so that is the one that must be present.
 */
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
    // The table shape: these are never written inside a `t(` call (#2666).
    expect(all).toContain('praxis:comments.time.coven.hours')
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

/* -------------------------------------------------------------------------- *
 * #2299 / #2585 — the join panel is one key path and one slot set.
 * -------------------------------------------------------------------------- */

/**
 * Seven factions render the same block ③, and each used to file it under its own
 * parent name with its own ragged slot set: 71 strings, 14 possible slots,
 * nobody holding all 14. The raggedness was invisible until you lined the seven
 * up, which is what this suite does.
 *
 * BOTH HALVES ARE LOAD-BEARING and neither catches the other's bug. A wrong
 * PATH is caught by `tsc` — the key union is generated from this catalog — but
 * a slot QUIETLY DROPPED from one faction is not: the panel renders one line
 * short, and every other test still passes. A slot quietly ADDED to one faction
 * is the same failure in the other direction, and is exactly how the 14
 * accumulated in the first place.
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
    // The five retired names. `wow` and `coven` were already `join`.
    const retired = new RegExp(
      `^factions:(${JOIN_FACTIONS.join('|')})\.(access|dispatch|registry|road|roll)\.`,
    )
    expect(leaves.map(([id]) => id).filter((id) => retired.test(id))).toEqual([])
  })

  it('no faction keeps its own confirm, kicker, overline or letterhead', () => {
    // Rulings (a)-(d) plus §1. Each of these was one or two factions doing
    // alone what the other five or six did not do at all — connecting chrome,
    // or a voiced copy of a string `detail.join.*` already shares.
    // `detail.join.*` is the SHARED block, not a faction branch — it is where
    // the confirm pair lives and must keep living, so the sweep is pinned to
    // the seven slugs rather than to any `*.join.` parent.
    const cut = new RegExp(
      `^factions:(${JOIN_FACTIONS.join('|')})` +
        `\.join\.(confirm|confirmSwitch|eligibleKicker|gateKicker|reLabel|letterhead)$`,
    )
    expect(leaves.map(([id]) => id).filter((id) => cut.test(id))).toEqual([])
    // The shared confirm pair UA now reads is the one the other six already did.
    expect(i18n.t('factions:detail.join.confirm', { faction: 'Cozy Coven' })).toBe(
      'Join Cozy Coven?',
    )
  })
})
