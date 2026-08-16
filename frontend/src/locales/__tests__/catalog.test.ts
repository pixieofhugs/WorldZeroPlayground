import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'
import i18n from '../../i18n'
import factions from '../en/factions.json'
import forms from '../en/forms.json'
import praxis from '../en/praxis.json'
import taunts from '../en/taunts.json'
import votes from '../en/votes.json'
import { findDuplicateJsonKeys } from './findDuplicateJsonKeys'
import { factionName } from '../../utils/factions'

// Factions with a vote voice (per-faction tier labels). Kept as an explicit
// list, mirroring the seed catalog this test was ported from. Albescent is not
// among them: it joined with a "bear witness" vocabulary in the #443 sweep and
// gave it up in #783, because per-faction vote words are a tell — they render
// to every voter on an Albescent-filed task, revealed or not.
const FACTION_SLUGS = [
  'ephemerists',
  'everymen',
  'coven',
  'snide',
  'singularity',
  'ua',
  // WOW gained a vote voice with its first bespoke skin (#821) — the balloon
  // verdict's archaic tiers (#838 put them back on the right slug; #821 had
  // WOW and Coven wearing each other's, see ADR-0050). Its idle/tag prompt
  // lives under chrome.wow, not here, so this block stays five tier labels.
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

  // #850: the academic "prospectus" framing is retired for UA. The key itself
  // was renamed, not just its value — a key named `prospectus` holding "The
  // Practice" is the drift this rename exists to stop. The top-level
  // `invitation.prospectus` string is a DIFFERENT key: it is the overline of the
  // one adaptive popup shared by every faction and deliberately survives.
  it('frames the UA faction page as the practice, not a prospectus', () => {
    expect(factions.ua).not.toHaveProperty('prospectus')
    expect(factions.ua.practice.heading).toBe('The Practice')
    expect(factions.ua.practice.empty).toBe('Nothing written down yet.')
  })

  it('keeps the shared invitation prospectus overline', () => {
    expect(factions.invitation.prospectus).toBe('a prospectus')
  })
})

// #1865: every faction body computes the spotlight as the highest ALL-TIME
// score — there is no time window in the frontend or the backend. Four labels
// used to name one anyway ("of the week", "of the Fortnight"), so a player who
// topped their faction expected to lose the slot in seven days and never would.
// Guard the VALUE, not the key: the way this lie comes back is a voice pass
// rewriting copy, which no key-presence check would catch.
describe('faction spotlight labels name no time window', () => {
  const TIME_WORDS = /\b(weekly|week|fortnightly|fortnight|daily|monthly)\b/i

  // factions.json's inferred type is a union of differently-shaped per-slug
  // objects; this narrows it to the one field the guard reads.
  const entries = Object.entries(factions) as [
    string,
    { spotlight?: { label?: string } },
  ][]
  const spotlights = entries.filter(([, value]) => value?.spotlight?.label !== undefined)

  it('finds a spotlight label on every faction that has one', () => {
    // Fails loudly if a restructure makes the loop below vacuous.
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

// #850: UA used to have no taunt branch at all and fell through to `default`,
// which is a gloat. A contemplative faction gloating is off-voice, so UA
// overrides with its own quiet acknowledgements — real entries, not a fallback.
describe('UA taunts', () => {
  const TRIGGERS = ['score_overtake', 'level_up', 'praxis_complete'] as const

  it('covers every trigger the default branch covers', () => {
    for (const trigger of TRIGGERS) {
      expect(taunts.ua[trigger].length).toBeGreaterThan(0)
    }
  })

  it('names the achiever with from_name, matching the resolver contract', () => {
    // TauntMessage.faction_slug is the SENDER's faction and `from_name` is the
    // sender — the one who overtook / levelled / sealed. A variant that only
    // interpolates to_name would credit the wrong character.
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

// #1858: the seven faction character-profile kits held their copy as raw
// literals in `.tsx` — invisible to any `locales/` sweep, never reviewed,
// untranslatable — while the na kit next to them was properly i18n'd. This
// guards the SHAPE: every slug that ships a profile kit must resolve the full
// set of copy keys its kit reads. A missing one throws at t() (the catalog's
// missingKeyHandler), so a kit that quietly grows a raw literal back fails here
// as soon as its key is listed, and a kit that drops one fails immediately.
describe('faction profile kits keep their copy in the catalog', () => {
  // Per slug, the `profile.<slug>.*` keys ProfileSkin reads. Not a uniform
  // shape on purpose: `levelUnit` is an optional knob only some kits set (the
  // rest take ProfileSkin's shared `profile.levelUnit`).
  //
  // Two rows lost an entry to #1909's CUT list rather than to a code change:
  // WOW's badge heading was `profile.wow.honours` and Singularity was the one
  // kit setting `scoreFootnote`. WOW's kit now reads the SHARED
  // `profile.badgesHeading` and Singularity draws no footnote, which is what
  // the other six already did — so neither key belongs in a per-slug list.
  const PROFILE_KIT_KEYS: Record<string, readonly string[]> = {
    ua: ['ringLabel', 'levelUnit', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    snide: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    wow: ['ringLabel', 'levelUnit', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody'],
    coven: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    ephemerists: ['ringLabel', 'levelUnit', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    everymen: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    singularity: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
  }

  for (const [slug, keys] of Object.entries(PROFILE_KIT_KEYS)) {
    it(`${slug} resolves every profile copy key its kit reads`, () => {
      for (const key of keys) {
        const value = i18n.t(`common:profile.${slug}.${key}` as 'common:profile.lvl')
        expect(value, `${slug}.${key}`).toBeTypeOf('string')
        expect(value.length, `${slug}.${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('has the two shared profile keys the skins fell back on', () => {
    // `profile.levelUnit` was ProfileSkin's hardcoded `?? 'pts this level'`
    // default and `profile.topPraxis` the laurel's `title=` — both live copy on
    // eight surfaces, both outside the catalog until #1858.
    expect(i18n.t('common:profile.levelUnit')).toBe('pts this level')
    expect(i18n.t('common:profile.topPraxis')).toBe('Top praxis')
    expect(i18n.t('common:profile.praxisHeading')).toBe('Praxis')
    expect(i18n.t('common:profile.praxisEyebrow', { name: 'Reza' })).toBe('sealed by Reza')
  })

  it('interpolates the two copy fields that take a named variable', () => {
    // `nextLevelLabel(next)` and `praxisEyebrow(name)` were template literals.
    // A template literal cannot be translated; a named {{var}} can be moved
    // anywhere in the sentence, which is the whole point of the extraction.
    expect(i18n.t('common:profile.coven.nextLevel', { level: 8 })).toBe('next · lvl 8')
    // Ephemerists interpolates the ROMAN numeral its kit formats, not the int.
    expect(i18n.t('common:profile.ephemerists.nextLevel', { level: 'VIII' })).toBe('next · level VIII')
    expect(i18n.t('common:profile.everymen.praxisEyebrow', { name: 'Reza' })).toBe('Work Reza finished')
  })

  it('carries the odd characters over verbatim', () => {
    // The copy review that follows #1858 rewords these; the MOVE may not. A
    // stray ornament or a lost `> ` prefix would be a silent copy edit.
    expect(i18n.t('common:profile.coven.praxisEmptyBody')).toBe(
      'The first bit of mischief is always the hardest ✦',
    )
    expect(i18n.t('common:profile.singularity.praxisEmptyTitle')).toBe('> NO OUTPUT SEALED')
    // `profile.singularity.scoreFootnote` ("> 1880 PTS LOGGED") was pinned here
    // for its `> ` prefix. #1909 CUT the key; `praxisEmptyTitle` above still
    // carries the prefix, so the character check is not lost with it.
    expect(i18n.t('common:profile.snide.praxisEmptyBody')).toBe(
      "Clean record's a bad look around here. Go pull a job.",
    )
  })
})

/* ========================================================================== *
 * #1863 — the five drifted domain words, settled.
 *
 * THE SEAM IS THE CATALOG VALUE, NOT THE KEY. An audit of all 800 faction
 * strings found five domain nouns/verbs that had each grown per-faction
 * synonyms — a character's *level* was an `anno`, a `rank`, a roman numeral; a
 * *task* was a `heist`, a `quest`, a `survey`; *submitting* was `sealing` or
 * `filing`. They are one word each now. The way that ruling comes undone is a
 * later voice pass rewriting a faction's copy back into its own dialect, which
 * no key-presence check can see, so the guard reads VALUES.
 *
 * The rule the audit applied, and the rule these lists encode:
 *
 *     REPLACE WHERE THE WORD NAMES THE ENTITY. KEEP IT WHERE IT IS IMAGERY.
 *
 * "Spells cast" as a heading over a praxis list names the entity and is gone;
 * "cast a small spell, let the circle cheer" is a picture and survives. Every
 * survivor below is named with the reason it survived — that list IS the
 * documentation of where the line fell, and an exact `toEqual` rather than a
 * subset check so that a survivor which later disappears (because #1864's
 * children delete or collapse its key) fails here and forces the list to be
 * re-read rather than quietly rotting.
 * ========================================================================== */

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
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.json'))
    .flatMap((entry) =>
      walk(JSON.parse(readFileSync(join(dir, entry), 'utf8')), []).map(
        ([key, value]) => [`${entry}:${key}`, value] as [string, string],
      ),
    )
}

/**
 * The surfaces the audit ruled KEEP their faction voice and which #1863
 * rewrote in place: the invitation letter, the faction-select picker, the
 * faction descriptions, and the taunts. Every other surface settles to one
 * shared string under #1864's children, so its retired words leave with the key
 * rather than with a rewrite — guarding them here would only pin copy that is
 * scheduled for deletion.
 */
function isVoicedSurface(id: string): boolean {
  const [file, key] = id.split(':')
  if (file === 'taunts.json') return true
  if (file === 'factions.json') return key.startsWith('descriptions.') || key.includes('.invitation.')
  if (file === 'feed.json') return key.startsWith('factionSelect.')
  return false
}

// Whole words only, or `cr` matches "crusade" and `pts` never matches at all.
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
  /**
   * Read as: every one of these still holds a retired word, on purpose, for the
   * reason given. Nothing else may.
   */
  const SURVIVORS = [
    // ---- the five the ruling names as look-alikes, and is not about ----
    // The oath idiom. A knight is sworn and sealed; no praxis is being submitted.
    'factions.json:wow.invitation.cta.joined',
    'feed.json:factionSelect.wow.status.member',
    // An interjection. The ruling retired *huzzahs* as a name for POINTS, not
    // the cry — WOW may still shout it.
    'taunts.json:wow.level_up.2',
    // Metaphor. The praxis noun is `praxis`; a spell quietly cast is a picture.
    'taunts.json:coven.score_overtake.1',

    // ---- imagery the audit kept, string by string ----
    // The wax seal on the summons — an object, not the act of submitting.
    'factions.json:wow.invitation.pitch',
    // "a sheet to work on" is the paper, not the task; the sentence beside it
    // already says *task*, which is what makes the picture legible.
    'factions.json:ua.invitation.pitch',
    // "witches mid-spell" / "cast a small spell" — the doing, not the artefact.
    'factions.json:coven.invitation.pitch',
    'feed.json:factionSelect.coven.blurb',
    // Singularity generates *signals* into a consensus. The praxis it submits is
    // a praxis; what it broadcasts is a signal, and that survives.
    'factions.json:singularity.invitation.pitch',
    'factions.json:singularity.invitation.terms.2.value',
    'feed.json:factionSelect.singularity.blurb',
    'feed.json:factionSelect.singularity.status.locked',
    // "filed under 'us'" is a filing cabinet, not the submit verb — the audit
    // left this row's wording untouched where it rewrote its three siblings.
    'factions.json:snide.invitation.perks.2',
    // "Join the ranks" / "one rank brighter" is the membership, not the level.
    'factions.json:everymen.invitation.headline',
    'taunts.json:coven.level_up.0',
    'taunts.json:wow.level_up.0',
    // "Tomorrow is another sheet" — a fresh page, not a task.
    'taunts.json:ua.score_overtake.1',

    // ---- not #1863's to rewrite; the issue that owns each is named ----
    // #1874 replaces every perks[1] with the faction's real backend mechanic.
    'factions.json:coven.invitation.perks.1',
    'factions.json:ephemerists.invitation.perks.1',
    'factions.json:singularity.invitation.perks.1',
    'factions.json:snide.invitation.perks.1',
    // The whole terms[3] "standing" row was listed here, waiting for #1864's
    // deletion child. #1909 took it — all seven factions — so it is a survivor
    // no longer, and the guard is that much tighter.
  ].sort()

  it('finds enough voiced strings that the sweep cannot pass by scanning nothing', () => {
    expect(catalogLeaves().filter(([id]) => isVoicedSurface(id)).length).toBeGreaterThan(200)
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
  // Any form of the word, so `sealing`/`unseals` cannot slip back in under a
  // different ending. `file`/`files` are deliberately NOT here: a 50 MB upload
  // limit is about computer files and always was.
  const SEAL = /\bseal\w*\b/i
  const FILED = /\b(filed|filing)\b/i

  /**
   * Metatasks now **attach**, praxes and duel entries are **submitted**, and the
   * collab freeze **locks**. What is left is either imagery (above) or copy on a
   * key that #1864's children delete or collapse — those are listed with the
   * child that removes them, so this guard tightens as they land instead of
   * being loosened by hand.
   */
  const SEAL_SURVIVORS = [
    // Imagery / non-violations, same rulings as the block above.
    'factions.json:wow.invitation.pitch',
    'factions.json:wow.invitation.cta.joined',
    'feed.json:factionSelect.wow.status.member',
    // The join-pact spinner, not a praxis. Named in the issue as a look-alike.
    'factions.json:ephemerists.road.joining',
    // #1864 GENERIC — the per-faction task/praxis list headings, empties and
    // kickers all collapse to one shared string ("Recent praxis", "No praxis
    // submitted yet."), so the retired word leaves with the key.
    'factions.json:ephemerists.praxis.empty',
    'factions.json:ua.praxis.heading',
    'factions.json:ua.praxis.empty',
    'factions.json:ua.registry.gateBody',
    'feed.json:factionHero.ephemerists.stats.praxes',
    'feed.json:factionHero.singularity.stats.praxes',
    'feed.json:factionHero.ua.stats.praxes',
    'feed.json:factionHero.wow.stats.praxes',
    // `feed.json:row.wow.praxisSealed` and `praxis.json:card.wow.sealed` were
    // listed here as #1864 CUTs waiting on their child. #1909 deleted both.
    // #1864 GENERIC, blocked on the profile-kit collapse. The decision record's
    // own agreed wording for these rows still reads "No praxis sealed yet",
    // which contradicts this ruling — flagged on #1863 rather than picked here.
    'common.json:profile.praxisEyebrow',
    'common.json:profile.praxisEmptyTitle',
    'common.json:profile.coven.praxisEyebrow',
    'common.json:profile.coven.praxisEmptyTitle',
    'common.json:profile.singularity.praxisEyebrow',
    'common.json:profile.singularity.praxisEmptyTitle',
    'common.json:profile.ua.praxisEyebrow',
    'common.json:profile.ua.praxisEmptyTitle',
    'common.json:profile.ua.badgeTitle',
    'common.json:profile.wow.praxisEyebrow',
  ].sort()

  const FILED_SURVIVORS = [
    // A filing cabinet, not the submit verb.
    'factions.json:snide.invitation.perks.2',
    'praxis.json:listPage.emptyFiltered',
    // Pure metaphor — a mind filing contingencies submits no praxis.
    'progression.json:unlocks.three_plans.desc',
    // #1864 GENERIC, as above. The three CUTs that sat here —
    // `ephemerists.praxis.kicker` and both `card.masthead.*` — left with #1909.
    'factions.json:everymen.praxis.empty',
    'feed.json:factionHero.coven.stats.praxes',
    'feed.json:factionHero.everymen.stats.praxes',
    'feed.json:factionHero.snide.stats.praxes',
    'common.json:profile.ephemerists.praxisEyebrow',
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
    // The four rulings that carried the sweep off the faction surfaces, pinned
    // by value so a revert reads as a failure rather than as a copy edit.
    // #1910 renamed the three `seal`-named keys to match the words they hold;
    // the assertions are the same wording under the honest path.
    expect(i18n.t('forms:editPraxis.attach.pickerTitle')).toBe('Attach a metatask to this praxis')
    expect(i18n.t('forms:editPraxis.attach.alreadyAttached')).toBe('Attached')
    expect(i18n.t('forms:editPraxis.composer.metatasksLabel')).toBe('Metatasks')
    expect(i18n.t('forms:editPraxis.collab.duelAwaitingHeading')).toBe('Your entry is submitted')
    expect(i18n.t('praxis:duelSeal.heading')).toBe('Lock the duel?')
  })
})

describe('the four functional controls say one thing across every faction (#1863)', () => {
  // Each already had 3+ factions saying the same words; the audit settled the
  // rest onto them. The keys stay per-faction until #1864 collapses them, so
  // the guard is that every branch resolves to the SAME string.
  const SLUGS = ['ua', 'snide', 'wow', 'coven', 'ephemerists', 'everymen', 'singularity'] as const

  it('the join-panel confirm button reads Confirm, in one casing', () => {
    // The join panel's key sits under a per-faction section name (`road`,
    // `access`, `dispatch`…), so this walks the faction block rather than
    // guessing the path.
    const buttons = catalogLeaves()
      .filter(([id]) => id.startsWith('factions.json:') && id.endsWith('.confirmButton'))
      .map(([, value]) => value)
    expect(buttons.length).toBe(SLUGS.length)
    expect([...new Set(buttons)]).toEqual(['Confirm'])
  })

  it('the task-card signup reads Sign up', () => {
    for (const slug of SLUGS) {
      expect(i18n.t(`feed:taskCard.${slug}.signup` as 'feed:taskCard.na.signup')).toBe('Sign up')
    }
    // `taskCard.albescent.signup` is deliberately NOT settled: ADR-0048 makes
    // the Albescent card the na sheet plus drift, so it renders na's verb and
    // its own is orphaned copy. `factionTaskCardsV2.test.tsx` asserts the
    // orphan never reaches a screen, which only holds while it differs.
    expect(i18n.t('feed:taskCard.albescent.signup')).not.toBe(i18n.t('feed:taskCard.na.signup'))
  })

  it('the comment edited marker reads edited', () => {
    for (const slug of [...SLUGS, 'albescent']) {
      expect(i18n.t(`praxis:comments.${slug}.edited` as 'praxis:comments.ua.edited')).toBe('edited')
    }
  })

  it('the vote star reads Rate {{value}} — {{label}}', () => {
    for (const slug of [...SLUGS, 'unaffiliated']) {
      expect(i18n.t(`votes:chrome.${slug}.rateAria` as 'votes:chrome.ua.rateAria', { value: 3, label: 'solid' })).toBe(
        'Rate 3 — solid',
      )
    }
    // Albescent and the mobile widget keep `Rate {{value}} of 5`: neither ships
    // per-faction tier labels (#783 took Albescent's away, because a vote word
    // is a tell), so their call sites have no `label` to interpolate.
    expect(i18n.t('votes:chrome.albescent.rateAria', { value: 3 })).toBe('Rate 3 of 5')
  })
})

describe('no duplicate keys in any locale catalog', () => {
  // JSON is last-wins: a key repeated inside the same object silently drops the
  // earlier block at parse time, so the copy vanishes with no error (this is
  // what happened to factions.json `albescent.invitation`, #634). `JSON.parse`
  // cannot catch it — we scan the raw file text instead. Guard for #670.
  const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..')

  // recursive + no withFileTypes → path strings; the cast drops the string|Buffer union.
  const jsonFiles = (readdirSync(localesDir, { recursive: true }) as string[])
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => join(localesDir, entry))

  it('finds catalog files to scan', () => {
    // Fails loudly if the glob ever silently matches nothing (moved dir, etc.).
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
    // Hand-written (not JSON.stringify, which would collapse the dup) so both
    // blocks survive into the raw text the scanner reads.
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
    expect(i18n.t('votes:ephemerists.silver')).toBe('silver')
  })

  it('interpolates a {{var}}', () => {
    expect(i18n.t('forms:charLimit.reached', { max: 200 })).toBe('200-character limit reached')
  })

  it('resolves kebab-case keys for multi-word labels', () => {
    expect(i18n.t('votes:wow.a-start')).toBe('a start')
    expect(i18n.t('votes:snide.not-bad')).toBe('not bad')
  })

  it('resolves preserved-case values for all-caps labels', () => {
    expect(i18n.t('votes:singularity.verified')).toBe('VERIFIED')
    expect(i18n.t('votes:snide.anarchy')).toBe('ANARCHY')
  })

  it('resolves the growing-mandala reading values for UA labels', () => {
    expect(i18n.t('votes:ua.radiant')).toBe('radiant')
    expect(i18n.t('votes:ua.faint')).toBe('faint')
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

/* ========================================================================== *
 * #1909 (child of #1864) — the 97 key slots the copy audit ruled CUT.
 *
 * THE SEAM IS THE CATALOG'S LEAF SET. Each of these was one faction writing a
 * bespoke string on a surface the audit ruled generic while the other eight
 * never had the slot at all, so the ruling is not "these words are wrong", it is
 * "this slot should not exist". A key-presence test cannot see that: it asserts
 * what IS in the catalog, and a later voice pass adding `wow.charter.title`
 * back would pass every one of them. So this guard reads the same
 * `catalogLeaves()` walk and asserts ABSENCE, which is the only shape that can
 * fail on a re-addition.
 *
 * The list is the 133 strings, by KEY rather than by value — #1863 rewrote
 * values across these same catalogs while this was being built, and matching on
 * the string would have deleted whatever the rewrite left behind.
 *
 * Adding a slot back is not forbidden forever. The audit's own principle is
 * "we can put it back in intentionally" — putting it back means deleting its
 * line here, in a diff that says so.
 * ========================================================================== */
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
    // 97 keys, 133 strings — #1864's count. A line lost to a bad merge would
    // otherwise silently shrink the guard.
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

/* ========================================================================== *
 * #1910 — A KEY MAY NOT BE NAMED FOR SOMETHING IT NO LONGER HOLDS
 *
 * THE SEAM IS THE CATALOG'S KEY SET, not its values. Two different rulings land
 * on the same shape:
 *
 *   1. #1864's "USE names.{F}" — seven slots held a copy of the faction's own
 *      name, which stays per-faction in `factions:names.<slug>`. The call sites
 *      read `factionName(slug)` now, so the slot is a second place the name
 *      could drift from.
 *   2. #1863 retired "seal" as a *word*. It changed values only and handed key
 *      structure here, so `editPraxis.seal.pickerTitle` was left holding
 *      "Attach a metatask to this praxis".
 *
 * Both failures are invisible to a value test — a re-added `taskCard.coven.
 * masthead: "Cozy Coven"` reads correctly on screen and is still a duplicate,
 * and a key called `seal` still renders its (correct) attach wording. So the
 * guard asserts ABSENCE of the old names and PRESENCE of the new ones, which is
 * the only shape a later pass cannot quietly undo.
 * ========================================================================== */
describe('no key is named for a word or a name it no longer holds (#1910)', () => {
  /**
   * #1864 §3. Two of these seven had no reader at all on `origin/main`
   * (`frame.albescent.masthead`, `taskCard.everymen.masthead`); the other five
   * now resolve through `factionName(slug)`.
   */
  const NAME_DUPLICATES = [
    'feed.json:frame.albescent.masthead',
    'feed.json:frame.singularity.masthead',
    'feed.json:identity.ephemerists.wordmark',
    'feed.json:identity.snide.wordmark',
    'feed.json:taskCard.coven.masthead',
    'feed.json:taskCard.ephemerists.masthead',
    'feed.json:taskCard.everymen.masthead',
  ] as const

  /**
   * The names #1863's rewrite falsified, and what each is called now. The two
   * `duel*` rows sit under `editPraxis.collab`, not `editPraxis.composer` as
   * #1910's table records — the audit's `composer.` prefix is an alias, the
   * same class of mismatch #1909 hit seven times. They are renamed in place
   * rather than moved: `collabCopy()` is where their readers live.
   *
   * `composer.statusSealed` has no successor. #1863 collapsed the `isDuel`
   * ternary that was its only reader once both branches held "Submitted", so
   * the key is deleted rather than renamed.
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
    // 3 keys / 7 strings from #1864 §3, plus the 20 `seal`-named leaves #1863
    // falsified. A line lost to a bad merge would silently shrink the guard.
    expect(new Set(NAME_DUPLICATES).size).toBe(7)
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
    // #1863's own value assertions, repointed. A rename that dropped a string
    // on the way would pass every absence check above.
    expect(i18n.t('forms:editPraxis.attach.pickerTitle')).toBe('Attach a metatask to this praxis')
    expect(i18n.t('forms:editPraxis.attach.alreadyAttached')).toBe('Attached')
    expect(i18n.t('forms:editPraxis.composer.metatasksLabel')).toBe('Metatasks')
    expect(i18n.t('forms:editPraxis.collab.duelPillSubmitted')).toBe('submitted')
    expect(i18n.t('forms:editPraxis.collab.duelHiddenPlaceholder')).toBe('Hidden until they submit')
  })

  it('resolves each repointed masthead to the faction name it used to spell', () => {
    // The five slots that had a reader. `factionName()` is the single source
    // (ADR-0038), so this is the assertion that the repoint kept the word.
    expect(factionName('snide')).toBe('S.N.I.D.E.')
    expect(factionName('ephemerists')).toBe('The Ephemerists')
    expect(factionName('coven')).toBe('Cozy Coven')
    expect(factionName('singularity')).toBe('Singularity')
  })
})
