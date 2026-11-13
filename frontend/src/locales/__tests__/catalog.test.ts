import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'
import i18n from '../../i18n'
import common from '../en/common.json'
import factions from '../en/factions.json'
import feed from '../en/feed.json'
import forms from '../en/forms.json'
import praxis from '../en/praxis.json'
import taunts from '../en/taunts.json'
import votes from '../en/votes.json'
import { findDuplicateJsonKeys } from './findDuplicateJsonKeys'
import { factionName } from '../../utils/factions'
import { sourceFiles, toRelative } from '../../test/sourceScan'

// Factions with a vote voice. Not Albescent: per-faction vote words are a tell
// (#783).
const FACTION_SLUGS = [
  'ephemerists',
  'everymen',
  'coven',
  'snide',
  'singularity',
  'ua',
  // WOW's tiers since #821 (ADR-0050); its prompt lives under chrome.wow.
  'wow',
] as const
const EXPECTED_TIER_COUNT = 5

describe('en copy catalog shape', () => {
  it('has a votes entry for every faction with a vote voice', () => {
    for (const slug of FACTION_SLUGS) {
      expect(votes).toHaveProperty(slug)
    }
  })

  it('has exactly 5 tier labels per faction', () => {
    for (const slug of FACTION_SLUGS) {
      const tiers = Object.keys(votes[slug])
      expect(tiers).toHaveLength(EXPECTED_TIER_COUNT)
    }
  })

  it('has non-empty string values for every tier', () => {
    for (const slug of FACTION_SLUGS) {
      for (const value of Object.values(votes[slug])) {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      }
    }
  })

  it('has the forms charLimit keys referenced by ADR-0010/ADR-0032', () => {
    expect(forms.charLimit).toHaveProperty('reached')
    expect(forms.charLimit).toHaveProperty('approaching')
  })

  it('has the praxis charLimit.terminal key referenced by ADR-0010/ADR-0032', () => {
    expect(praxis.charLimit).toHaveProperty('terminal')
  })

  // #850 retired UA's "prospectus" framing (key and word); #2298 cut the
  // shared `invitation.prospectus` overline too.
  it('frames the UA faction page as the practice, not a prospectus', () => {
    expect(factions.ua).not.toHaveProperty('prospectus')
    expect(factions.ua).not.toHaveProperty('practice')
  })

  it('says prospectus nowhere at all, overline included (#2298)', () => {
    expect(factions.invitation).not.toHaveProperty('prospectus')
  })
})

/*
 * #2586: vote-tier keys are rung numbers, never the word (README: "Never name a
 * key after its English text"), so rungs line up across factions. The words
 * themselves are pinned in `voteLadders.test.tsx`.
 */
describe('vote-tier keys are numbered rungs (#2586)', () => {
  /** Per-slug ladders, minus the shared `chrome` block. */
  const LADDERS = Object.entries(votes).filter(([slug]) => slug !== 'chrome')
  const RUNGS = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5']

  it('finds every ladder, so the sweep cannot pass by scanning nothing', () => {
    expect(LADDERS.map(([slug]) => slug).sort()).toEqual(
      [...FACTION_SLUGS, 'na'].slice().sort()
    )
  })

  it('names each rung by its position, so no key repeats its own value', () => {
    for (const [slug, ladder] of LADDERS) {
      // Key order is the ladder order the resolver reads.
      expect(Object.keys(ladder), slug).toEqual(RUNGS)
    }
  })

  it('spells the unaffiliated ladder `na`, like every other catalog', () => {
    expect(votes).not.toHaveProperty('unaffiliated')
    expect(Object.keys(votes.na)).toEqual(RUNGS)
  })
})

// #1865: the spotlight is all-time top score, so no label may name a window.
// Guards the VALUE: a voice pass is how this lie returns.
describe('faction spotlight labels name no time window', () => {
  const TIME_WORDS = /\b(weekly|week|fortnightly|fortnight|daily|monthly)\b/i

  const entries = Object.entries(factions) as [
    string,
    { spotlight?: { label?: string } },
  ][]
  const spotlights = entries.filter(([, value]) => value?.spotlight?.label !== undefined)

  it('finds a spotlight label on every faction that has one', () => {
    expect(spotlights.map(([slug]) => slug)).toEqual([
      'ephemerists',
      'everymen',
      'singularity',
      'snide',
      'ua',
      'coven',
      'wow',
    ])
  })

  for (const [slug, value] of spotlights) {
    it(`${slug} promises no rotation`, () => {
      expect(value.spotlight!.label).not.toMatch(TIME_WORDS)
    })
  }
})

// #850: UA's own quiet taunts rather than the gloating `default`.
describe('UA taunts', () => {
  const TRIGGERS = ['score_overtake', 'level_up', 'praxis_complete'] as const

  it('covers every trigger the default branch covers', () => {
    for (const trigger of TRIGGERS) {
      expect(taunts.ua[trigger].length).toBeGreaterThan(0)
    }
  })

  it('names the achiever with from_name, matching the resolver contract', () => {
    // `from_name` is the sender (the achiever); to_name would credit the wrong
    // character.
    for (const trigger of TRIGGERS) {
      for (const variant of taunts.ua[trigger]) {
        expect(variant).toContain('{{from_name}}')
      }
    }
  })

  it('does not gloat', () => {
    const all = TRIGGERS.flatMap((trigger) => taunts.ua[trigger]).join(' ')
    for (const gloat of ['napping', 'dust', "doesn't lie", 'still thinking']) {
      expect(all).not.toContain(gloat)
    }
  })
})

// #1911: one shared profile key set for all kits (ProfileSkin resolves it).
// Rendered words are checked in `characterProfile/__tests__/profileKitCopy.test.tsx`.
describe('the profile kits share one set of copy in the catalog', () => {
  const SHARED_KEYS = [
    'lvl',
    'ptsThisLevel',
    'nextLevel',
    'praxisEyebrow',
    'praxisEmptyTitle',
    'praxisEmptyBody',
    'badgesHeading',
    'praxisHeading',
    'topPraxis',
    // Phone segmented switch (#2996), reused keys.
    'mobile.tabPraxis',
    'mobile.tabTasks',
  ] as const

  it('resolves every key ProfileSkin reads, none of them blank', () => {
    for (const key of SHARED_KEYS) {
      const value = i18n.t(`common:profile.${key}` as 'common:profile.lvl')
      expect(value, key).toBeTypeOf('string')
      expect(value.length, key).toBeGreaterThan(0)
    }
  })

  it('carries no per-faction profile branch any more', () => {
    const branches = catalogLeaves()
      .map(([id]) => id)
      .filter((id) => /^common\.json:profile\.(coven|ephemerists|everymen|singularity|snide|ua|wow)\./.test(id))
    expect(branches).toEqual([])
    expect(i18n.t('common:profile.topPraxis')).toBe('Top praxis')
    expect(i18n.t('common:profile.praxisHeading')).toBe('Praxis')
  })

  it('interpolates the two copy fields that take a named variable', () => {
    expect(i18n.t('common:profile.nextLevel', { level: 8 })).toBe('next · lvl 8')
    expect(i18n.t('common:profile.praxisEyebrow', { name: 'Reza' })).toBe('Submitted by Reza')
    expect(i18n.t('common:profile.ptsThisLevel', { current: 380, span: 500 })).toBe(
      '380 / 500 pts this level',
    )
  })
})

/*
 * #1863: five drifted domain words (level, points, task, praxis, submit) are one
 * word each on the voiced surfaces. Rule: replace where the word names the
 * entity, keep it where it is imagery. SURVIVORS is an exact `toEqual` so a
 * vanished survivor forces a re-read.
 */

/** Every leaf string in every en catalog, as `file.json:dotted.key`. */
function catalogLeaves(): Array<[string, string]> {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'en')
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
  return sourceFiles({ dir, match: /\.json$/ }).flatMap((path) => {
    const entry = basename(path)
    return walk(JSON.parse(readFileSync(path, 'utf8')), []).map(
      ([key, value]) => [`${entry}:${key}`, value] as [string, string],
    )
  })
}

/** Surfaces that keep faction voice (rewritten in place by #1863). */
function isVoicedSurface(id: string): boolean {
  const [file, key] = id.split(':')
  if (file === 'taunts.json') return true
  if (file === 'factions.json') return key.startsWith('descriptions.') || key.includes('.invitation.')
  if (file === 'feed.json') return key.startsWith('factionSelect.')
  return false
}

// Whole words only.
const RETIRED = new RegExp(
  '\\b(' +
    [
      // character level → level
      'annos?|ranks?|ranked|lvl',
      // score unit → points
      'pvncta|huzzahs?|cr|pts',
      // a task → task
      'heists?|quests?|surveys?|jobs?|functions?|protocols?|sheets?',
      // a praxis → praxis
      'spells?|chronicles?|transcriptions?|signals?|reports?|praxes',
      // submitting a praxis → submit / submitted
      'seals?|sealed|sealing|filed|filing',
    ].join('|') +
    ')\\b',
  'i',
)

describe('the five domain words are one word each on the voiced surfaces (#1863)', () => {
  /** Strings that keep a retired word on purpose, with the reason. */
  const SURVIVORS = [
    // Oath idiom, not submitting.
    'feed.json:factionSelect.wow.status.member',
    // The cry, not a points name.
    'taunts.json:wow.level_up.2',
    // Metaphor.
    'taunts.json:coven.score_overtake.1',

    // Imagery the audit kept:
    // a wax seal (object).
    'factions.json:wow.invitation.pitch',
    // "mid-spell": the doing, not the artefact.
    'factions.json:coven.invitation.pitch',
    // Plain English "signal", the owner's own words.
    'factions.json:descriptions.everymen',
    // Singularity broadcasts signals; that survives.
    'factions.json:singularity.invitation.pitch',
    'feed.json:factionSelect.singularity.blurb',
    // "filed under 'us'": a filing cabinet.
    'factions.json:snide.invitation.perks.2.desc',
    // "the ranks": membership, not level.
    'factions.json:everymen.invitation.headline',
    'taunts.json:coven.level_up.0',
    'taunts.json:wow.level_up.0',
    // "another sheet": a fresh page.
    'taunts.json:ua.score_overtake.1',

  ].sort()

  it('finds enough voiced strings that the sweep cannot pass by scanning nothing', () => {
    // A floor against vacuous walks, not a census; lowered as voiced leaves
    // were deleted (#2298, #3138).
    expect(catalogLeaves().filter(([id]) => isVoicedSurface(id)).length).toBeGreaterThanOrEqual(155)
  })

  it('no voiced string says a retired word, beyond the named survivors', () => {
    const offenders = catalogLeaves()
      .filter(([id]) => isVoicedSurface(id))
      .filter(([, value]) => RETIRED.test(value))
      .map(([id]) => id)
      .sort()
    expect(offenders).toEqual(SURVIVORS)
  })
})

describe('"seal" survives nowhere it means submitted (#1863)', () => {
  // `file`/`files` deliberately absent: upload limits mean computer files.
  const SEAL = /\bseal\w*\b/i
  const FILED = /\b(filed|filing)\b/i

  /**
   * Metatasks attach, praxes/duel entries are submitted, the collab freeze
   * locks. Survivors are imagery or look-alikes.
   */
  const SEAL_SURVIVORS = [
    // Imagery, as above.
    'factions.json:wow.invitation.pitch',
    'feed.json:factionSelect.wow.status.member',
    // Join-pact spinner, not a praxis.
    'factions.json:ephemerists.join.joining',
  ].sort()

  const FILED_SURVIVORS = [
    // A filing cabinet.
    'factions.json:snide.invitation.perks.2.desc',
    'praxis.json:listPage.emptyFiltered',
    // Metaphor.
    'progression.json:unlocks.three_plans.desc',
  ].sort()

  it('says seal only where the word is an oath, an object, or a doomed key', () => {
    const offenders = catalogLeaves()
      .filter(([, value]) => SEAL.test(value))
      .map(([id]) => id)
      .sort()
    expect(offenders).toEqual(SEAL_SURVIVORS)
  })

  it('says filed only where the word is a filing cabinet, or a doomed key', () => {
    const offenders = catalogLeaves()
      .filter(([, value]) => FILED.test(value))
      .map(([id]) => id)
      .sort()
    expect(offenders).toEqual(FILED_SURVIVORS)
  })

  it('the composer, the duel dialog and the metatask picker say the settled words', () => {
    // Pinned by value so a revert fails rather than reads as a copy edit.
    expect(i18n.t('forms:editPraxis.attach.pickerTitle')).toBe('Attach a metatask to this praxis')
    expect(i18n.t('forms:editPraxis.attach.alreadyAttached')).toBe('Attached')
    expect(i18n.t('forms:editPraxis.composer.metatasksLabel')).toBe('Metatasks')
    expect(i18n.t('forms:editPraxis.collab.duelAwaitingHeading')).toBe('Your entry is submitted')
    expect(i18n.t('praxis:duelSeal.heading')).toBe('Lock the duel?')
  })
})

describe('the four functional controls say one thing across every faction (#1863)', () => {
  // Values only; #1911's suite owns the key structure.
  it('the join-panel confirm button reads Confirm, in one casing', () => {
    const buttons = catalogLeaves()
      .filter(([id]) => id.startsWith('factions.json:') && id.endsWith('.confirmButton'))
      .map(([, value]) => value)
    expect(buttons).toEqual([])
    expect(i18n.t('factions:detail.join.confirmAction')).toBe('Confirm')
  })

  it('the task-card signup reads Sign up', () => {
    expect(i18n.t('feed:taskCard.signup')).toBe('Sign up')
  })

  it('the comment edited marker reads edited', () => {
    expect(i18n.t('praxis:comments.edited')).toBe('edited')
  })

  it('the vote star reads Rate {{value}} — {{label}}', () => {
    expect(i18n.t('votes:chrome.rateAria', { value: 3, label: 'solid' })).toBe('Rate 3 — solid')
    // Albescent has no tier labels (#783), so no `label` to interpolate.
    expect(i18n.t('votes:chrome.rateAriaPlain', { value: 3 })).toBe('Rate 3 of 5')
  })
})

/*
 * #1948: only Singularity speaks in the terminal register. Coven's `.exe`
 * strings were residue of a retired desktop metaphor. Guards VALUES with an
 * exact set, so a new `.exe` anywhere else fails.
 */
describe('only Singularity speaks in the terminal register (#1948)', () => {
  const TERMINAL = /\.(exe|bat|cmd|sh|dll|proc)\b|^\s*>\s/i

  /** Singularity's terminal strings; `manifest.txt` is caught by the `> ` arm. */
  const TERMINAL_VOICE = [
    'factions.json:singularity.join.joinButton',
    'factions.json:singularity.join.joining',
  ].sort()

  it('finds catalog leaves to scan, so the sweep cannot pass by scanning nothing', () => {
    expect(catalogLeaves().length).toBeGreaterThan(1000)
  })

  it('finds no executable flavour text outside Singularity', () => {
    const offenders = catalogLeaves()
      .filter(([, value]) => TERMINAL.test(value))
      .map(([id]) => id)
      .sort()
    expect(offenders).toEqual(TERMINAL_VOICE)
  })

  it('renames the key the retired window titled, and keeps the panel labelled', () => {
    // ponytail: "the circle" is provisional, assembled from this panel's own
    // strings; the owner may rewrite it. `coven.mobile` is gone with the
    // `{F}.mobile.eyebrow` family (#1911).
    expect(factions.coven.join).not.toHaveProperty('windowTitle')
    expect(factions.coven.join.heading).toBe('the circle')
    expect(factions.coven).not.toHaveProperty('mobile')
  })

  it('names the join panel in every faction voice, so none falls back to chrome', () => {
    // Albescent has no join panel (ADR-0048: the letter is its join surface).
    const labels: Record<string, string> = {
      coven: factions.coven.join.heading,
      wow: factions.wow.join.heading,
      ephemerists: factions.ephemerists.join.heading,
      everymen: factions.everymen.join.heading,
      singularity: factions.singularity.join.heading,
      snide: factions.snide.join.heading,
      ua: factions.ua.join.heading,
    }
    for (const [slug, label] of Object.entries(labels)) {
      expect(label, slug).toBeTypeOf('string')
      expect(label.length, slug).toBeGreaterThan(0)
    }
    // Seven distinct voices; collapsing them would be a different ruling.
    expect(new Set(Object.values(labels)).size).toBe(7)
  })
})

describe('no duplicate keys in any locale catalog', () => {
  // JSON is last-wins, so a repeated key silently drops copy (#634, #670).
  const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..')

  const jsonFiles = sourceFiles({ dir: localesDir, match: /\.json$/ })

  it('finds catalog files to scan', () => {
    expect(jsonFiles.length).toBeGreaterThan(0)
  })

  for (const filePath of jsonFiles) {
    const label = relative(localesDir, filePath).replace(/\\/g, '/')
    it(`${label} has no duplicate keys`, () => {
      const duplicates = findDuplicateJsonKeys(readFileSync(filePath, 'utf8'))
      expect(
        duplicates,
        `duplicate keys in ${label}: ${duplicates.map((d) => d.path).join(', ')}`,
      ).toEqual([])
    })
  }
})

describe('findDuplicateJsonKeys scanner', () => {
  it('passes clean nested JSON', () => {
    const text = JSON.stringify({ a: { b: 1, c: 2 }, d: [{ e: 3 }, { e: 4 }] })
    expect(findDuplicateJsonKeys(text)).toEqual([])
  })

  it('flags a duplicate key nested in an object', () => {
    // Hand-written: JSON.stringify would collapse the dup.
    const text = '{ "faction": { "invitation": "first", "invitation": "second" } }'
    expect(findDuplicateJsonKeys(text)).toEqual([
      { path: 'faction.invitation', key: 'invitation' },
    ])
  })

  it('does not confuse a value equal to a sibling key', () => {
    const text = '{ "a": "b", "c": "a" }'
    expect(findDuplicateJsonKeys(text)).toEqual([])
  })

  it('does not treat a colon inside a string value as a key separator', () => {
    const text = '{ "a": "x: y", "b": "z" }'
    expect(findDuplicateJsonKeys(text)).toEqual([])
  })
})

describe('i18next runtime', () => {
  it('resolves a nested key', () => {
    expect(i18n.t('votes:ephemerists.tier3')).toBe('silver')
  })

  it('interpolates a {{var}}', () => {
    expect(i18n.t('forms:charLimit.reached', { max: 200 })).toBe('200-character limit reached')
  })

  // #2586 removed the last kebab-case keys; this keeps the multi-word-value half.
  it('resolves a multi-word label whole', () => {
    expect(i18n.t('votes:wow.tier1')).toBe('a start')
    expect(i18n.t('votes:snide.tier2')).toBe('not bad')
  })

  it('resolves preserved-case values for all-caps labels', () => {
    expect(i18n.t('votes:singularity.tier5')).toBe('VERIFIED')
    expect(i18n.t('votes:snide.tier5')).toBe('ANARCHY')
  })

  it('resolves the growing-mandala reading values for UA labels', () => {
    expect(i18n.t('votes:ua.tier5')).toBe('radiant')
    expect(i18n.t('votes:ua.tier1')).toBe('faint')
  })

  // #3018: a `$` without `{{` must stay literal; digits come back as typed.
  it("renders Singularity's hero kicker character for character (#3018)", () => {
    expect(i18n.t('feed:factionHero.singularity.eyebrow')).toBe('World Zero · H4CKZ3R$')
  })

  it('throws on a missing key outside production', () => {
    // @ts-expect-error — deliberately invalid key: proves both that a bad key
    // fails typecheck and that the runtime missingKeyHandler throws in test.
    expect(() => i18n.t('votes:ephemerists.nonexistent')).toThrow('missing copy key')
  })

  it('throws on a missing namespace outside production', () => {
    // @ts-expect-error — deliberately invalid namespace.
    expect(() => i18n.t('nonexistent:some.key')).toThrow('missing copy key')
  })
})

/*
 * #1909: slots the copy audit ruled generic stay deleted. Asserts ABSENCE by key
 * (values were being rewritten concurrently). Re-adding one means deleting its
 * line here, deliberately.
 */
describe('the slots the copy audit ruled generic stay deleted (#1909)', () => {
  const DELETED_SLOTS = [
    'common.json:fieldDesk.home.coven.charWindow',
    'common.json:fieldDesk.home.coven.questsWindow',
    'common.json:profile.singularity.scoreFootnote',
    'common.json:profile.wow.eyebrow',
    'common.json:profile.wow.honours',
    'common.json:profile.wow.praxisEmpty',
    'common.json:profile.wow.stats.points',
    'common.json:profile.wow.stats.praxis',
    'common.json:profile.wow.stats.tasks',
    'common.json:profile.wow.tabPraxis',
    'common.json:profile.wow.tabTasks',
    'common.json:profile.wow.tasksEmpty',
    'factions.json:albescent.letter.terms.standingLabel',
    'factions.json:albescent.letter.terms.standingValue',
    'factions.json:coven.invitation.terms.3.label',
    'factions.json:coven.invitation.terms.3.value',
    'factions.json:coven.praxis.kicker',
    'factions.json:coven.tasks.kicker',
    'factions.json:ephemerists.invitation.terms.3.label',
    'factions.json:ephemerists.invitation.terms.3.value',
    'factions.json:ephemerists.masthead.almanac',
    'factions.json:ephemerists.masthead.almanacMark',
    'factions.json:ephemerists.masthead.observation',
    'factions.json:ephemerists.masthead.observationMark',
    'factions.json:ephemerists.masthead.record',
    'factions.json:ephemerists.masthead.recordMark',
    'factions.json:ephemerists.masthead.star',
    'factions.json:ephemerists.masthead.starMark',
    'factions.json:ephemerists.praxis.kicker',
    'factions.json:ephemerists.tasks.kicker',
    'factions.json:everymen.invitation.terms.3.label',
    'factions.json:everymen.invitation.terms.3.value',
    'factions.json:everymen.praxis.kicker',
    'factions.json:everymen.tasks.kicker',
    'factions.json:singularity.invitation.terms.3.label',
    'factions.json:singularity.invitation.terms.3.value',
    'factions.json:singularity.manifest.command',
    'factions.json:singularity.praxis.kicker',
    'factions.json:singularity.tasks.kicker',
    'factions.json:snide.invitation.terms.3.label',
    'factions.json:snide.invitation.terms.3.value',
    'factions.json:snide.praxis.kicker',
    'factions.json:snide.spotlight.wanted',
    'factions.json:snide.tasks.kicker',
    'factions.json:ua.invitation.terms.3.label',
    'factions.json:ua.invitation.terms.3.value',
    'factions.json:ua.praxis.kicker',
    'factions.json:ua.tasks.kicker',
    'factions.json:wow.charter.paragraphs.0',
    'factions.json:wow.charter.paragraphs.1',
    'factions.json:wow.charter.paragraphs.2',
    'factions.json:wow.charter.title',
    'factions.json:wow.invitation.terms.3.label',
    'factions.json:wow.invitation.terms.3.value',
    'factions.json:wow.mobile.subtitle',
    'factions.json:wow.praxis.kicker',
    'factions.json:wow.tasks.kicker',
    'feed.json:factionCard.ephemerists.eyebrow',
    'feed.json:factionCard.everymen.eyebrow',
    'feed.json:factionCard.everymen.kicker',
    'feed.json:factionCard.everymen.motto',
    'feed.json:factionCard.everymen.perks.finishesWork',
    'feed.json:factionCard.everymen.perks.honestPoints',
    'feed.json:factionCard.everymen.perks.stampedWork',
    'feed.json:factionCard.everymen.summons',
    'feed.json:factionCard.snide.subtitle',
    'feed.json:identity.coven.windowTitle',
    'feed.json:identity.singularity.protocol',
    'feed.json:identity.wow.dispatch',
    'feed.json:row.wow.levelUp',
    'feed.json:row.wow.praxisSealed',
    'feed.json:row.wow.questTaken',
    'feed.json:taskCard.albescent.eyebrow',
    'feed.json:taskCard.ephemerists.coordPolar',
    'feed.json:taskCard.ephemerists.coordXPrefix',
    'feed.json:taskCard.ephemerists.footnote',
    'feed.json:taskCard.ephemerists.marginalia',
    'feed.json:taskCard.ephemerists.motto',
    'feed.json:taskCard.ephemerists.vanishingLabel',
    'feed.json:taskCard.everymen.billMasthead',
    'feed.json:taskCard.everymen.sealUnit',
    'feed.json:taskCard.singularity.levelLabel',
    'feed.json:taskCard.singularity.levelPill',
    'feed.json:taskCard.singularity.pointsLabel',
    'feed.json:taskCard.singularity.windowTitle',
    'feed.json:taskCard.snide.dispatchNumber',
    'feed.json:taskCard.snide.scrawl',
    'feed.json:taskCard.ua.estLine',
    'feed.json:taskCard.ua.pointsLine',
    'feed.json:taskCard.wow.byOrder',
    'feed.json:taskCard.wow.decree',
    'praxis.json:card.coven.mediaEmpty',
    'praxis.json:card.ephemerists.for',
    'praxis.json:card.ephemerists.mediaEmpty',
    'praxis.json:card.masthead.albescent',
    'praxis.json:card.masthead.coven',
    'praxis.json:card.masthead.everymen',
    'praxis.json:card.masthead.singularity',
    'praxis.json:card.masthead.snide',
    'praxis.json:card.masthead.ua',
    'praxis.json:card.masthead.wow',
    'praxis.json:card.stamp.ephemerists.base',
    'praxis.json:card.stamp.ephemerists.fromVotes',
    'praxis.json:card.stamp.ephemerists.fromVotesGloss',
    'praxis.json:card.stamp.ephemerists.habit',
    'praxis.json:card.stamp.ephemerists.points',
    'praxis.json:card.wow.forQuest',
    'praxis.json:card.wow.illumination',
    'praxis.json:card.wow.sealed',
    'praxis.json:comments.albescent.letterhead',
    'praxis.json:comments.everymen.masthead',
    'praxis.json:comments.singularity.protocol',
    'praxis.json:comments.ua.house',
    'praxis.json:comments.wow.post',
    'praxis.json:comments.wow.react',
    'praxis.json:duelSeal.wow.forfeit.cancel',
    'praxis.json:duelSeal.wow.forfeit.confirm',
    'praxis.json:duelSeal.wow.forfeit.sub',
    'praxis.json:duelSeal.wow.ribbonLine',
    'praxis.json:duelSeal.wow.rosterLabel',
    'praxis.json:duelSeal.wow.stakesLabel',
    'praxis.json:duelSeal.wow.submit.cancel',
    'praxis.json:duelSeal.wow.submit.confirm',
    'praxis.json:duelSeal.wow.submit.sub',
    'votes.json:chrome.coven.prompt',
    'votes.json:chrome.ephemerists.prompt',
    'votes.json:chrome.singularity.prompt',
    'votes.json:chrome.singularity.promptHint',
    'votes.json:chrome.ua.plateNumber',
    'votes.json:chrome.ua.plateTopMark',
    'votes.json:chrome.ua.prompt',
    'votes.json:chrome.wow.picked',
    'votes.json:chrome.wow.prompt',
  ] as const

  it('has the whole ruling in the list', () => {
    // #1864's count; guards against a line lost in a merge.
    expect(new Set(DELETED_SLOTS).size).toBe(133)
  })

  it('finds catalog leaves to check against, so absence cannot be vacuous', () => {
    expect(catalogLeaves().length).toBeGreaterThan(1000)
  })

  it('holds none of them', () => {
    const present = new Set(catalogLeaves().map(([id]) => id))
    expect(DELETED_SLOTS.filter((id) => present.has(id))).toEqual([])
  })
})

/*
 * #1910: no key named for something it no longer holds: slots duplicating a
 * faction name (read `factionName(slug)` / `factions:names.<slug>`), and keys
 * named `seal` after #1863 retired the word. Asserts old names absent, new ones
 * present.
 */
describe('no key is named for a word or a name it no longer holds (#1910)', () => {
  /**
   * #1864 §3 plus #2806's `factionSelect.{F}.name`. The select tile is NOT a
   * `factionName()` caller: that masks Albescent, while the tile must print
   * `[REDACTED]` (ADR-0082 §2), so it reads `redactableText('factions:names.<slug>')`.
   * A tile wanting a different name adds a `wordmark`, not a name copy.
   */
  const NAME_DUPLICATES = [
    'feed.json:frame.albescent.masthead',
    'feed.json:frame.singularity.masthead',
    'feed.json:identity.ephemerists.wordmark',
    'feed.json:identity.snide.wordmark',
    'feed.json:taskCard.coven.masthead',
    'feed.json:taskCard.ephemerists.masthead',
    'feed.json:taskCard.everymen.masthead',
    'feed.json:factionSelect.albescent.name',
    'feed.json:factionSelect.coven.name',
    'feed.json:factionSelect.ephemerists.name',
    'feed.json:factionSelect.everymen.name',
    'feed.json:factionSelect.na.name',
    'feed.json:factionSelect.singularity.name',
    'feed.json:factionSelect.snide.name',
    'feed.json:factionSelect.ua.name',
    'feed.json:factionSelect.wow.name',
  ] as const

  /**
   * Renamed off "seal". The `duel*` rows live under `editPraxis.collab` (where
   * `collabCopy()` reads them). `composer.statusSealed` was deleted, not renamed.
   */
  const RENAMED: ReadonlyArray<readonly [string, string | null]> = [
    ['forms.json:editPraxis.seal.pickerTitle', 'forms.json:editPraxis.attach.pickerTitle'],
    ['forms.json:editPraxis.seal.pickerSubtitle', 'forms.json:editPraxis.attach.pickerSubtitle'],
    ['forms.json:editPraxis.seal.filterAll', 'forms.json:editPraxis.attach.filterAll'],
    ['forms.json:editPraxis.seal.filterAria', 'forms.json:editPraxis.attach.filterAria'],
    ['forms.json:editPraxis.seal.searchPlaceholder', 'forms.json:editPraxis.attach.searchPlaceholder'],
    ['forms.json:editPraxis.seal.searchAria', 'forms.json:editPraxis.attach.searchAria'],
    ['forms.json:editPraxis.seal.empty', 'forms.json:editPraxis.attach.empty'],
    ['forms.json:editPraxis.seal.alreadySealed', 'forms.json:editPraxis.attach.alreadyAttached'],
    ['forms.json:editPraxis.seal.addAria', 'forms.json:editPraxis.attach.addAria'],
    ['forms.json:editPraxis.seal.pending', 'forms.json:editPraxis.attach.pending'],
    ['forms.json:editPraxis.seal.cancel', 'forms.json:editPraxis.attach.cancel'],
    ['forms.json:editPraxis.seal.confirm', 'forms.json:editPraxis.attach.confirm'],
    ['forms.json:editPraxis.seal.removeTitle', 'forms.json:editPraxis.attach.removeTitle'],
    ['forms.json:editPraxis.seal.removeBody', 'forms.json:editPraxis.attach.removeBody'],
    ['forms.json:editPraxis.seal.removeCancel', 'forms.json:editPraxis.attach.removeCancel'],
    ['forms.json:editPraxis.seal.removeConfirm', 'forms.json:editPraxis.attach.removeConfirm'],
    ['forms.json:editPraxis.composer.sealsLabel', 'forms.json:editPraxis.composer.metatasksLabel'],
    ['forms.json:editPraxis.collab.duelPillSealed', 'forms.json:editPraxis.collab.duelPillSubmitted'],
    [
      'forms.json:editPraxis.collab.duelSealedPlaceholder',
      'forms.json:editPraxis.collab.duelHiddenPlaceholder',
    ],
    ['forms.json:editPraxis.composer.statusSealed', null],
  ]

  it('has the whole ruling in the list', () => {
    // Guards against a line lost in a merge.
    expect(new Set(NAME_DUPLICATES).size).toBe(16)
    expect(new Set(RENAMED.map(([from]) => from)).size).toBe(20)
  })

  it('finds catalog leaves to check against, so absence cannot be vacuous', () => {
    expect(catalogLeaves().length).toBeGreaterThan(1000)
  })

  it('holds no slot that duplicates a faction name', () => {
    const present = new Set(catalogLeaves().map(([id]) => id))
    expect(NAME_DUPLICATES.filter((id) => present.has(id))).toEqual([])
  })

  it('holds no key still named for the retired word', () => {
    const present = new Set(catalogLeaves().map(([id]) => id))
    expect(RENAMED.map(([from]) => from).filter((id) => present.has(id))).toEqual([])
  })

  it('holds every renamed key under its new name, with the same wording', () => {
    const leaves = new Map(catalogLeaves())
    const missing = RENAMED.filter(([, to]) => to !== null).filter(([, to]) => !leaves.has(to!))
    expect(missing.map(([, to]) => to)).toEqual([])
  })

  it('the picker, the composer and the duel pill still say the settled words', () => {
    // A rename that dropped a string would pass the absence checks.
    expect(i18n.t('forms:editPraxis.attach.pickerTitle')).toBe('Attach a metatask to this praxis')
    expect(i18n.t('forms:editPraxis.attach.alreadyAttached')).toBe('Attached')
    expect(i18n.t('forms:editPraxis.composer.metatasksLabel')).toBe('Metatasks')
    expect(i18n.t('forms:editPraxis.collab.duelPillSubmitted')).toBe('submitted')
    expect(i18n.t('forms:editPraxis.collab.duelHiddenPlaceholder')).toBe('Hidden until they submit')
  })

  it('resolves each repointed masthead to the faction name it used to spell', () => {
    // `factionName()` is the single source (ADR-0038).
    expect(factionName('snide')).toBe('S.N.I.D.E.')
    expect(factionName('ephemerists')).toBe('The Ephemerists')
    expect(factionName('coven')).toBe('Cozy Coven')
    expect(factionName('singularity')).toBe('Singularity')
  })
})

/*
 * #2332: owner copy that looks like bugs and must not be "fixed":
 *   1. Literal `PLACEHOLDER` values: the owner's marker for unwritten slots,
 *      asserted exactly so filling one is deliberate.
 *   2. S.N.I.D.E.'s masked profanity: exact characters and casing.
 *   3. `ua` is the full name; `albescent` has no leading slash.
 */
describe("the owner's copy pass keeps the rows that look like bugs (#2332)", () => {
  const PLACEHOLDERS = [
    'factions.json:descriptions.albescent',
    'factions.json:descriptions.coven',
    'factions.json:descriptions.ephemerists',
    'factions.json:descriptions.singularity',
  ].sort()

  it('holds the placeholder exactly where the owner put it, and nowhere else', () => {
    const found = catalogLeaves()
      .filter(([, value]) => value.toUpperCase() === 'PLACEHOLDER')
      .map(([id]) => id)
      .sort()
    expect(found).toEqual(PLACEHOLDERS)
  })

  it("keeps S.N.I.D.E.'s punk register masked exactly as written", () => {
    // Character-for-character: each mask and casing is distinct.
    expect(i18n.t('feed:factionSelect.snide.status.eligible')).toBe("Let's F%$*ing GO")
    expect(i18n.t('feed:factionSelect.snide.status.locked')).toBe('Go BREAK something!')
    expect(i18n.t('factions:snide.invitation.headline')).toBe('Wanna F%&* some S^&* up?')
  })

  it('names UA in full and Albescent without a slash', () => {
    expect(factionName('ua')).toBe('Unwavering Artisans')
    // Via the catalog: `factionName()` masks Albescent when unrevealed (#1891).
    expect(i18n.t('factions:names.albescent')).toBe('Albescent')
    expect(i18n.t('factions:names.albescent').startsWith('/')).toBe(false)
  })

  it('leaves the abbreviation alive in the description', () => {
    expect(i18n.t('factions:descriptions.ua')).toContain('also known as UA')
  })

  it("keeps Albescent's letterhead wordmark, which was already the clean form", () => {
    // A different key from `names.albescent`; pinned against the slash sweep.
    expect(i18n.t('factions:albescent.letter.wordmark')).toBe('Albescent')
  })
})

/*
 * #2368: "S.N.I.D.E." already ends in a stop, so a sentence ending on
 * `{{faction}}.` renders "S.N.I.D.E..". Fix the sentence, never the name (the
 * stops are the wordmark). Swept across every name and string.
 */
describe('no faction sentence renders a double full stop (#2368)', () => {
  const NAMES = Object.keys(factions.names) as Array<keyof typeof factions.names>

  it('S.N.I.D.E. is the name that makes this a real case', () => {
    // If this goes false, re-read this block's header before deleting.
    const trailing = NAMES.filter((slug) => i18n.t(`factions:names.${slug}`).endsWith('.'))
    expect(trailing).toEqual(['snide'])
  })

  it('the gate hint reads cleanly for every faction', () => {
    for (const slug of NAMES) {
      const line = i18n.t('factions:mobile.gateHint', { faction: factionName(slug) })
      expect(line, `factions:mobile.gateHint for ${slug} is "${line}"`).not.toContain('..')
    }
  })

  it('no catalog string puts a full stop straight after the name', () => {
    // Only an appended full stop doubles up; "Join {{faction}}?" is fine.
    const offenders = catalogLeaves()
      .filter(([id]) => id.startsWith('factions.json:'))
      .filter(([, value]) => /\{\{faction\}\}\./.test(value))
      .map(([id, value]) => `${id} -> "${value}"`)
    expect(offenders).toEqual([])
  })
})

/*
 * #2827: a call site may not drop its interpolation values. i18next leaves
 * `{{faction}}` in the output instead of throwing. Rendered half:
 * `pages/factionDetail/__tests__/burnedNotice.test.tsx`.
 *
 * ponytail: only string-literal keys are resolvable statically; template keys
 * and `<Trans i18nKey>` are out of reach. Upgrade: a rendered page-census sweep.
 */

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** `t("key")` with a literal key and nothing after it (options on any line miss). */
const BARE_CALL = /\bt\(\s*(['"])([^'"\n]+)\1\s*\)/g

/** Dotted parts of interpolating keys (matches `ns:key` and bound bare keys). */
const INTERPOLATED_KEYS = new Set(
  catalogLeaves()
    .filter(([, value]) => value.includes('{{'))
    .map(([id]) => id.split(':')[1]),
)

/** Shipped `src` files, src-relative. */
function shippedSources(): string[] {
  return sourceFiles()
    .map((path) => toRelative(path))
    .filter((name) => !name.startsWith('locales/'))
}

/** Bare `t()` calls on interpolating keys. */
function droppedInterpolations(name: string, source: string): string[] {
  const found: string[] = []
  for (const hit of source.matchAll(BARE_CALL)) {
    const key = hit[2].includes(':') ? hit[2].split(':')[1] : hit[2]
    if (!INTERPOLATED_KEYS.has(key)) continue
    found.push(`${name}:${source.slice(0, hit.index).split('\n').length} -> t("${hit[2]}")`)
  }
  return found
}

describe('no call site drops an interpolation (#2827)', () => {
  it('has a scanner that catches the defect it was written for', () => {
    // Tripwire: the shipped shape is caught, the correct shapes are not.
    const key = 'mobile.gateHint'
    expect(i18n.t(`factions:${key}`)).toContain('{{')
    expect(droppedInterpolations('probe.tsx', `: t("${key}")}`)).toHaveLength(1)
    expect(
      droppedInterpolations('probe.tsx', `: t("${key}", { faction: factionName(slug) })}`),
    ).toEqual([])
    expect(
      droppedInterpolations('probe.tsx', `: t("${key}", {\n  faction: name,\n})}`),
      'options on the next line are still options',
    ).toEqual([])
  })

  it('scans a tree it can actually see', () => {
    const files = shippedSources()
    expect(files.length).toBeGreaterThan(200)
    expect(files).toContain('pages/factionDetail/archetypes/SingularityFactionBody.tsx')
  })

  it('finds no interpolated string called without its values', () => {
    const offenders = shippedSources().flatMap((name) =>
      droppedInterpolations(name, readFileSync(join(SRC_ROOT, name), 'utf8')),
    )
    expect(offenders).toEqual([])
  })
})

/*
 * #2789: the Disclaimer is owner-written legal copy, verbatim (shared by
 * `/disclaimer` and onboarding stop 3). Rows that look like defects but stay:
 * the spaced hyphen `statutes - no violation`, the comma after "creator", and
 * straight quotes. `p4` is retired (paragraph boundaries are part of the
 * document); `t()` typing catches a leftover reader.
 */
describe('the Disclaimer is the owner\'s text, character for character (#2789)', () => {
  it('holds three paragraphs and a date, with no retired fourth', () => {
    expect(Object.keys(common.disclaimer)).toEqual(['title', 'p1', 'p2', 'p3', 'lastUpdated'])
  })

  it('transcribes the first paragraph exactly', () => {
    expect(i18n.t('common:disclaimer.p1')).toBe(
      `The creator, of the system of websites, events, and activities explicitly referred to as World Zero (henceforth, "Game"), assumes no responsibility for the actions of users (henceforth, "Players") of this website or any affiliated website (including but not limited to worldzero.org). This includes, but is not limited to, content posted to the Game by Players, suggested activities ("Tasks"), and actions taken by Players in particular or in general.`,
    )
  })

  it('transcribes the second paragraph exactly', () => {
    expect(i18n.t('common:disclaimer.p2')).toBe(
      `As a Player, you agree to assume complete responsibility for any and all actions you or your character undertakes relating to you or your character's participation in the Game. You agree to submit no material to the Game that you have not created, or do not have permission to display publicly or reproduce in accordance with any applicable copyright. You agree that any action taken as part of your participation in the Game is in accordance with applicable laws and statutes - no violation of such is sanctioned by the Game. Any suggestion of any such violation that appears as part of the Game is due solely to the fictional nature of a game, and is not intended to condone or indemnify any violation of any local, state, or federal laws, nor any intrusion upon or violation of the rights of any Player, person, or persons.`,
    )
  })

  it('transcribes the third paragraph exactly', () => {
    expect(i18n.t('common:disclaimer.p3')).toBe(
      `Due to the malleability of digital media, any appearance of such a violation by any Player may not be considered evidence, precedent, or approval of such a violation. Any material displayed as part of the Game should be considered fictive until and unless proven otherwise.`,
    )
  })

  it('keeps the three rows that look like defects', () => {
    // Named so a failure says which "correction" was made.
    expect(i18n.t('common:disclaimer.p2')).toContain('statutes - no violation')
    expect(i18n.t('common:disclaimer.p1')).toContain('The creator, of the system')
    expect(i18n.t('common:disclaimer.p1')).toContain('"Game"')
    expect(i18n.t('common:disclaimer.p1')).toContain('"Players"')
    expect(i18n.t('common:disclaimer.p1')).toContain('"Tasks"')
  })

  it('dates the document to the pass that rewrote it', () => {
    expect(i18n.t('common:disclaimer.lastUpdated')).toBe('Last updated: August 2026')
  })
})

/**
 * #2620: the invitation's deferral control is one key on both surfaces. The feed
 * card announces a letter (it doesn't preview it), so other copy may differ;
 * only the shared "put it off" act (ADR-0070) shares a key. Catalog and
 * call-site halves each catch what the other can't.
 */
describe('the invitation deferral is one key on both surfaces (#2620)', () => {
  const src = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const read = (parts: string) => readFileSync(join(src, ...parts.split('/')), 'utf8')

  it('keeps no second key for the act', () => {
    expect(feed.invitationLetter).not.toHaveProperty('notNow')
  })

  it('holds the surviving word on the shared key', () => {
    // Don't also pin `forms:editPraxis.attach.cancel` here: a reword there would
    // fail with a message about the wrong issue.
    expect(i18n.t('factions:invitation.dismiss')).toBe('Not now')
  })

  it('points the feed card at the shared key — a move, not a copy', () => {
    const card = read('components/feed/FeedCardInvitationLetter.tsx')
    expect(card).toContain('factions:invitation.dismiss')
    expect(card).not.toContain('invitationLetter.notNow')
  })

  it('leaves the letter on the key it always read', () => {
    expect(read('components/InvitationLetterPopup.tsx')).toContain("t('invitation.dismiss')")
  })
})
