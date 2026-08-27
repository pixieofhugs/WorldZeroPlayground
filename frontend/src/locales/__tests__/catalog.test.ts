import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
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
  // `invitation.prospectus` string WAS a different key — the overline of the one
  // adaptive popup shared by every faction, which is why #850 left it standing.
  // #2298 cut it anyway, on its own grounds: it named the surface the reader was
  // already looking at. So the word is gone from this catalog entirely, and the
  // assertion below is now absence rather than survival.
  it('frames the UA faction page as the practice, not a prospectus', () => {
    // The `ua.practice` block itself is gone: its two leaves were the about
    // panel's heading and empty state, and #1911 settled both onto
    // `detail.aboutHeading` / `detail.descriptionEmpty` for all seven bodies.
    // What #850 actually forbids — the WORD, on a key of UA's own — is still
    // what this asserts, and it now covers the whole block rather than one name.
    expect(factions.ua).not.toHaveProperty('prospectus')
    expect(factions.ua).not.toHaveProperty('practice')
  })

  it('says prospectus nowhere at all, overline included (#2298)', () => {
    expect(factions.invitation).not.toHaveProperty('prospectus')
  })
})

/* ========================================================================== *
 * #2586 — A VOTE-TIER KEY IS A RUNG NUMBER, NOT THE WORD ON THE RUNG.
 *
 * THE SEAM IS THE CATALOG'S KEY NAMES. `locales/README.md` states the rule this
 * pins: "Never name a key after its English text." The vote ladder broke it on
 * all eight slugs — `votes:snide.rad` held "rad", `votes:ua.radiant` held
 * "radiant" — so rewording one rung meant renaming its key, and renaming a key
 * means editing the catalog, the resolver and the tests to change one word. It
 * also made the copy export 38 rows with a single faction column filled each,
 * because a key named `radiant` cannot line up with a key named `rad`.
 *
 * Numbered, the rungs line up: five rows, eight columns, one row per rung.
 *
 * The WORDS are not this test's business and did not change — ADR-0061 makes
 * per-faction vote vocabulary a sanctioned carve-out and #1864 kept the star
 * ladder in faction voice. `voteLadders.test.tsx` is what pins the words, at
 * the rendered widget; this file pins only the shape of the keys holding them.
 * ========================================================================== */
describe('vote-tier keys are numbered rungs (#2586)', () => {
  /** Every ladder block in votes.json — the file's per-slug branches, minus the
   *  shared `chrome` block, which is widget furniture and not a ladder. */
  const LADDERS = Object.entries(votes).filter(([slug]) => slug !== 'chrome')
  const RUNGS = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5']

  it('finds every ladder, so the sweep cannot pass by scanning nothing', () => {
    expect(LADDERS.map(([slug]) => slug).sort()).toEqual(
      [...FACTION_SLUGS, 'na'].slice().sort()
    )
  })

  it('names each rung by its position, so no key repeats its own value', () => {
    for (const [slug, ladder] of LADDERS) {
      // Key ORDER is the ladder order the resolver reads back, so this pins
      // both the naming and the sequence.
      expect(Object.keys(ladder), slug).toEqual(RUNGS)
    }
  })

  it('spells the unaffiliated ladder `na`, like every other catalog', () => {
    // votes.json was the last file spelling this slug out in full (#2586); its
    // one reader is DefaultVote, and every other catalog says `na`.
    expect(votes).not.toHaveProperty('unaffiliated')
    expect(Object.keys(votes.na)).toEqual(RUNGS)
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
// untranslatable — while the na kit next to them was properly i18n'd. They
// moved into `common.json` under `profile.<slug>.*`, and this guarded that
// every slug resolved the full set its kit read.
//
// #1911 collapsed those seven families to one shared string each, so there is
// no per-slug set left to enumerate — every kit reads the SAME keys, which
// `ProfileSkin` now resolves itself rather than taking through seven knobs.
// What is left to guard here is that the shared set exists and interpolates;
// `characterProfile/__tests__/profileKitCopy.test.tsx` renders all eight kits
// and reads the words back, which is the half a catalog check cannot do.
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
  ] as const

  it('resolves every key ProfileSkin reads, none of them blank', () => {
    for (const key of SHARED_KEYS) {
      const value = i18n.t(`common:profile.${key}` as 'common:profile.lvl')
      expect(value, key).toBeTypeOf('string')
      expect(value.length, key).toBeGreaterThan(0)
    }
  })

  it('carries no per-faction profile branch any more', () => {
    // `profile.levelUnit` went with them: it was ProfileSkin's `?? 'pts this
    // level'` fallback for the four kits that named no unit, and the shared
    // `ptsThisLevel` says the whole sentence.
    const branches = catalogLeaves()
      .map(([id]) => id)
      .filter((id) => /^common\.json:profile\.(coven|ephemerists|everymen|singularity|snide|ua|wow)\./.test(id))
    expect(branches).toEqual([])
    expect(i18n.t('common:profile.topPraxis')).toBe('Top praxis')
    expect(i18n.t('common:profile.praxisHeading')).toBe('Praxis')
  })

  it('interpolates the two copy fields that take a named variable', () => {
    // `nextLevelLabel(next)` and `praxisEyebrow(name)` were template literals.
    // A template literal cannot be translated; a named {{var}} can be moved
    // anywhere in the sentence, which is the whole point of the extraction.
    expect(i18n.t('common:profile.nextLevel', { level: 8 })).toBe('next · lvl 8')
    expect(i18n.t('common:profile.praxisEyebrow', { name: 'Reza' })).toBe('Submitted by Reza')
    expect(i18n.t('common:profile.ptsThisLevel', { current: 380, span: 500 })).toBe(
      '380 / 500 pts this level',
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
    // ---- the four the ruling names as look-alikes, and is not about ----
    // The oath idiom. A knight is sworn and sealed; no praxis is being
    // submitted. `wow.invitation.cta.joined` ("sworn and sealed, knight") was
    // the other half of this pair and #2298 deleted it with the whole
    // `cta.joined` family — no letter had a call site for it.
    'feed.json:factionSelect.wow.status.member',
    // An interjection. The ruling retired *huzzahs* as a name for POINTS, not
    // the cry — WOW may still shout it.
    'taunts.json:wow.level_up.2',
    // Metaphor. The praxis noun is `praxis`; a spell quietly cast is a picture.
    'taunts.json:coven.score_overtake.1',

    // ---- imagery the audit kept, string by string ----
    // The wax seal on the summons — an object, not the act of submitting.
    'factions.json:wow.invitation.pitch',
    // "witches mid-spell" / "cast a small spell" — the doing, not the artefact.
    'factions.json:coven.invitation.pitch',
    'feed.json:factionSelect.coven.blurb',
    // Singularity generates *signals* into a consensus. The praxis it submits is
    // a praxis; what it broadcasts is a signal, and that survives.
    // `singularity.invitation.terms.2.value` ("signal, into consensus") stood
    // with these; #2298 cut the terms slip out of all seven letters.
    'factions.json:singularity.invitation.pitch',
    'feed.json:factionSelect.singularity.blurb',
    'feed.json:factionSelect.singularity.status.locked',
    // "filed under 'us'" is a filing cabinet, not the submit verb — the audit
    // left this row's wording untouched where it rewrote its three siblings.
    // #2298 split the perk into name + desc; the wording is on `.desc`, and the
    // `.name` beside it repeats it because the name itself is still owed and
    // ships as `PLACEHOLDER — name for: <the description>`. Both leave together
    // when the owner writes the name.
    'factions.json:snide.invitation.perks.2.desc',
    'factions.json:snide.invitation.perks.2.name',
    // "Join the ranks" / "one rank brighter" is the membership, not the level.
    'factions.json:everymen.invitation.headline',
    'taunts.json:coven.level_up.0',
    'taunts.json:wow.level_up.0',
    // "Tomorrow is another sheet" — a fresh page, not a task.
    'taunts.json:ua.score_overtake.1',

    // ---- not #1863's to rewrite; the issue that owns each is named ----
    // The four perks[1] rows parked here for #1874 are gone: that issue landed
    // and every mechanic slot now states its faction's real backend perk in the
    // ruled vocabulary, so none of them says a retired word any more.
    // The whole terms[3] "standing" row was listed here, waiting for #1864's
    // deletion child. #1909 took it — all seven factions — so it is a survivor
    // no longer, and the guard is that much tighter.
  ].sort()

  it('finds enough voiced strings that the sweep cannot pass by scanning nothing', () => {
    // 180, not the original 200: #2298 took 42 leaves off the invitation
    // letters (seven kickers, 28 terms and seven dead `cta.joined`), and the
    // invitation IS a voiced surface, so the population this sweep walks
    // shrank with them. The floor's job is to fail if the walk ever finds
    // nothing — it is not a census, and lowering it to the new truth is the
    // honest move rather than counting deleted copy.
    expect(catalogLeaves().filter(([id]) => isVoicedSurface(id)).length).toBeGreaterThan(180)
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
    // `wow.invitation.cta.joined` left with the `cta.joined` family (#2298).
    'factions.json:wow.invitation.pitch',
    'feed.json:factionSelect.wow.status.member',
    // The join-pact spinner, not a praxis. Named in the issue as a look-alike.
    'factions.json:ephemerists.join.joining',
    // The #1864 GENERIC row that stood here — `common.json:profile.
    // praxisEmptyTitle` — is gone: #2046 carries the owner's ruling that the
    // collapsed praxis empty state reads "No praxis submitted yet." Fifteen
    // entries once waited here on #1864's children; #1909, #1910 and #1911 took
    // fourteen with their keys and #2046 reworded the last. What is left is the
    // four look-alikes above, which no ruling is coming for.
  ].sort()

  const FILED_SURVIVORS = [
    // A filing cabinet, not the submit verb. Two leaves since #2298 split the
    // perk into name + desc: the wording is the `.desc`, and the `.name` is the
    // placeholder that quotes it back until the owner writes the name.
    'factions.json:snide.invitation.perks.2.desc',
    'factions.json:snide.invitation.perks.2.name',
    'praxis.json:listPage.emptyFiltered',
    // Pure metaphor — a mind filing contingencies submits no praxis.
    'progression.json:unlocks.three_plans.desc',
    // The five #1864 GENERIC rows that sat here — `everymen.praxis.empty`,
    // three `factionHero.{F}.stats.praxes` and `profile.ephemerists.
    // praxisEyebrow` — all left with their keys under #1911.
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
  // Each already had 3+ factions saying the same words; #1863 settled the rest
  // onto them, and #1911 collapsed the nine branches into one key each. What is
  // left to guard here is the VALUE — #1911's own suite next door owns the key
  // structure, and neither check is the other's.
  it('the join-panel confirm button reads Confirm, in one casing', () => {
    // The join panel's key used to sit under a per-faction section name
    // (`road`, `access`, `dispatch`…), which is why a literal grep for it
    // returned zero and the 2026-08-16 audit undercounted the family. #2299
    // retired those names: all seven panels are `<slug>.join.*` now, so the
    // literal grep this comment warns about finally works.
    const buttons = catalogLeaves()
      .filter(([id]) => id.startsWith('factions.json:') && id.endsWith('.confirmButton'))
      .map(([, value]) => value)
    expect(buttons).toEqual([])
    expect(i18n.t('factions:detail.join.confirmAction')).toBe('Confirm')
  })

  it('the task-card signup reads Sign up', () => {
    // Albescent's own verb ("acknowledge") was orphaned copy — ADR-0048 makes
    // its card the na sheet plus drift, so the verb never reached a screen —
    // and #1911 deleted it with the rest of the family.
    expect(i18n.t('feed:taskCard.signup')).toBe('Sign up')
  })

  it('the comment edited marker reads edited', () => {
    expect(i18n.t('praxis:comments.edited')).toBe('edited')
  })

  it('the vote star reads Rate {{value}} — {{label}}', () => {
    expect(i18n.t('votes:chrome.rateAria', { value: 3, label: 'solid' })).toBe('Rate 3 — solid')
    // Albescent keeps `Rate {{value}} of 5`: it ships no tier labels (#783 took
    // them away, because a vote word is a tell), so its call site has no
    // `label` to interpolate and the shared sentence would trail off after the
    // dash. The mobile widget carried the identical string under
    // `chrome.mobile.rateAria`; #1911 collapsed that pair onto one key with no
    // faction slug in its name.
    expect(i18n.t('votes:chrome.rateAriaPlain', { value: 3 })).toBe('Rate 3 of 5')
  })
})

/* ========================================================================== *
 * #1948 — THE TERMINAL REGISTER BELONGS TO EXACTLY ONE FACTION.
 *
 * THE SEAM IS THE CATALOG LEAF VALUE, per faction block. Cozy Coven's join panel
 * read `JOIN.EXE` over witch-house body copy. It was not a shared panel and not
 * a wrong slug: `coven.join.windowTitle` was the title bar of the pushpinned
 * `join.exe` window that #1209 deleted, and CovenFactionBody's replacement
 * changed no copy, so the title outlived its window and got re-hung on the new
 * bar. `coven.mobile.eyebrow` ("coven.exe") is the same residue of the retired
 * lo-fi `coven.exe` / `whimsy.exe` desktop metaphor (#784 / #1023 / #1209).
 *
 * Every other faction names that same panel in its own voice — "The Road",
 * "THE ROLL", "ACCESS", "Those practising", "THE MUSTER", the S.N.I.D.E.
 * letterhead — so the fix is Coven's two strings, not seven factions'.
 *
 * A key-presence test cannot see this: the key existed, resolved, and rendered.
 * The way it comes back is a voice pass writing `.exe` into a skin that is not
 * Singularity's, so the guard reads VALUES and pins the whole offender set with
 * an exact toEqual. Singularity's 14 strings are listed one by one: the register
 * IS its voice, and enumerating them is what makes an eighth entry fail.
 * ========================================================================== */
describe('only Singularity speaks in the terminal register (#1948)', () => {
  // `.exe`-style extensions, and a leading `> ` shell prompt.
  const TERMINAL = /\.(exe|bat|cmd|sh|dll|proc)\b|^\s*>\s/i

  /**
   * Singularity's whole terminal voice, string by string. Nothing else in any en
   * catalog may match — a `.exe` on a witch-house, cork-board or broadsheet skin
   * is the bug #1948 reports.
   *
   * `manifest.txt` inside `singularity.manifest.empty` is Singularity's too; it
   * is caught by the `> ` prompt rather than by the extension, which is why the
   * pattern does not need a `.txt` arm.
   */
  const TERMINAL_VOICE = [
    // `singularity.join.eligibleKicker` (`> ACCESS GRANTED`) and
    // `.gateKicker` (`> NODE NOT YET ONLINE`) stood here. #2299 cut the kicker
    // from all seven panels, so the two prompts left with their keys.
    'factions.json:singularity.join.joinButton',
    'factions.json:singularity.join.joining',
    // `singularity.invitation.kicker` (`> PRIVILEGE ELEVATED`) stood here.
    // #2298 cut the kicker from all eight letters — the same ruling #2299
    // applied to the join panel two rows up — so the prompt left with its key.
    //
    // `singularity.invitation.perks.1` stood here — #1874's mechanic slot,
    // which refused in the array's own register (`> no modifiers…`) because
    // Singularity had no perk to advertise. #2332 gave it one, in plain voice,
    // so the prompt left with the copy and the row leaves with it. This list is
    // an exact set: a stale row fails the sweep as loudly as a missing one.
    // Eight more rows stood here: `profile.singularity.praxisEmptyTitle`,
    // `manifest.empty`, `mobile.eyebrow`, the three `roster.*`, `praxis.empty`
    // and `tasks.empty`. #1911 collapsed every one of those families to a
    // shared, register-free string, so the prompt left with the keys. What
    // survives is join-panel and invitation copy — the two surfaces the audit
    // ruled KEEP their voice — which is exactly the shape #1948 wanted.
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
    // ponytail: "the circle" is PROVISIONAL — assembled from the four strings
    // already in this panel ("You're in the circle", "The circle is open", "Not
    // in the circle — yet", "the circle is recruiting"), not written. The owner
    // writes strings in this repo; pinning it here means a later voice pass
    // reads as a deliberate edit, not a drift.
    //
    // `coven.mobile.eyebrow` was pinned beside it at "The Circle", the other
    // half of #1948's fix. #1911 deleted the whole `{F}.mobile.eyebrow` family:
    // it was already orphaned — the faction page reads the shared
    // `detail.eyebrow` ("Faction") and has since the phone/desktop skins
    // collapsed — so #1948's rename never reached a screen. Nothing renders
    // `coven.exe` either way, which is what the ruling was for.
    expect(factions.coven.join).not.toHaveProperty('windowTitle')
    expect(factions.coven.join.heading).toBe('the circle')
    expect(factions.coven).not.toHaveProperty('mobile')
  })

  it('names the join panel in every faction voice, so none falls back to chrome', () => {
    // The bar Coven's `.exe` sat on. Albescent has no join panel (ADR-0048: the
    // letter IS its join surface), so it is absent by design, not by omission.
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
    // Seven distinct voices — a copy pass that settled them onto one shared
    // string would be a different ruling, and should fail here first.
    expect(new Set(Object.values(labels)).size).toBe(7)
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
    expect(i18n.t('votes:ephemerists.tier3')).toBe('silver')
  })

  it('interpolates a {{var}}', () => {
    expect(i18n.t('forms:charLimit.reached', { max: 200 })).toBe('200-character limit reached')
  })

  // Was 'resolves kebab-case keys for multi-word labels', reading `wow.a-start`
  // and `snide.not-bad`. #2586 numbered the rungs, and those were the catalog's
  // last kebab-case keys — a key spelling out a two-word label is exactly the
  // naming the README forbids. The half worth keeping is the other one: that a
  // multi-word VALUE comes back whole, spaces and all.
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

/* ========================================================================== *
 * #2332 — THE OWNER'S COPY PASS, ON THE ROWS MOST LIKELY TO BE "FIXED"
 *
 * THE SEAM IS THE CATALOG. 47 values landed from the owner's own spreadsheet,
 * and most of them need no guard: a reworded blurb that drifts later is a copy
 * question, not a regression. Three groups are different, because each one
 * LOOKS like a defect to the next reader and would be quietly corrected:
 *
 *   1. Six values are the literal `PLACEHOLDER`. That is deliberate — the
 *      owner's marker for a slot she has not written yet, put there so that
 *      seeing it on the page tells her what is missing. One of them
 *      (`factionHero.wow.motto`) replaced a sentence that stopped mid-clause,
 *      so a trailing comma never reaches a player. `descriptions.wow` was one
 *      of those and is now written, which is why it is off this list.
 *   2. S.N.I.D.E.'s three masked-profanity strings are the faction's new punk
 *      register, not a leak and not a typo. Exact characters, exact casing.
 *   3. Two faction names changed shape: `ua` from the two-letter abbreviation
 *      to the full name, and `albescent` shed a leading slash that was never
 *      intentional. (#2300's body calls that slash "the unaffiliated-fold
 *      convention from #1975". #1975 is about folding Albescent under the
 *      Unaffiliated FILTER and says nothing about the display name, and no
 *      other name key in any catalog carries one.)
 *
 * The placeholder set is asserted EXACTLY, so a row quietly filled in fails
 * here and has to be taken off this list on purpose.
 * ========================================================================== */
describe("the owner's copy pass keeps the rows that look like bugs (#2332)", () => {
  const PLACEHOLDERS = [
    'factions.json:descriptions.albescent',
    'factions.json:descriptions.coven',
    'factions.json:descriptions.ephemerists',
    'factions.json:descriptions.everymen',
    'factions.json:descriptions.singularity',
  ].sort()

  it('holds the placeholder exactly where the owner put it, and nowhere else', () => {
    const found = catalogLeaves()
      .filter(([, value]) => value === 'PLACEHOLDER')
      .map(([id]) => id)
      .sort()
    expect(found).toEqual(PLACEHOLDERS)
  })

  it("keeps S.N.I.D.E.'s punk register masked exactly as written", () => {
    // Character-for-character. `%$*`, `#!*` and `%&*` + `^&*` are three
    // different masks, and the casing is three different shouts.
    expect(i18n.t('feed:factionSelect.snide.status.eligible')).toBe("Let's F%$*ing GO")
    expect(i18n.t('feed:factionSelect.snide.status.locked')).toBe('Go Break some S#!*')
    expect(i18n.t('factions:snide.invitation.headline')).toBe('Wanna F%&* some S^&* up?')
  })

  it('names UA in full and Albescent without a slash', () => {
    expect(factionName('ua')).toBe('Unwavering Artisans')
    // `names.albescent` is read through the CATALOG, not `factionName()`.
    // The getter masks Albescent to "Unaffiliated" for anyone unrevealed
    // (#1891), which is also why the stray slash only ever reached the order's
    // own members — but the slot itself is what #2332 corrects.
    expect(i18n.t('factions:names.albescent')).toBe('Albescent')
    expect(i18n.t('factions:names.albescent').startsWith('/')).toBe(false)
  })

  it('leaves the abbreviation alive in the places that are not the name', () => {
    // "UA" is not lost: the description introduces it, and the select card's
    // own `wordmark` slot — a DIFFERENT key, untouched by #2332 — is still the
    // two-letter mark that plate is set around.
    expect(i18n.t('factions:descriptions.ua')).toContain('also known as UA')
    expect(i18n.t('feed:factionSelect.ua.wordmark')).toBe('UA')
  })

  it("keeps Albescent's letterhead wordmark, which was already the clean form", () => {
    // `albescent.letter.wordmark` is a different key from `names.albescent` and
    // was never slashed. #2332 does not touch it; this pins that it did not get
    // swept up in the slash removal either.
    expect(i18n.t('factions:albescent.letter.wordmark')).toBe('Albescent')
  })
})

/* ========================================================================== *
 * #2368 — A SENTENCE MAY NOT END ON AN INTERPOLATED FACTION NAME.
 *
 * THE SEAM IS THE RENDERED SENTENCE, not the catalog leaf. `mobile.gateHint`
 * read "…an invitation to {{faction}}." and every leaf-level check passed it:
 * one shared key (#1911), it interpolates, it ends in a full stop. The defect
 * exists only after substitution, and only for ONE of the nine names —
 * "S.N.I.D.E." is the only faction whose name already ends in a full stop, so
 * the gate line on its faction page read "…an invitation to S.N.I.D.E..".
 *
 * WHY THE FIX IS THE SENTENCE AND NOT THE NAME. Stripping the trailing stop from
 * `names.snide` would be a change to the faction's NAME — it is an initialism
 * and the stops are the wordmark, printed that way on the hero, the select card
 * and the roster. The sentence moves its interpolation off the end instead,
 * which costs one leaf and leaves all nine names alone.
 *
 * THE SWEEP IS EVERY NAME, not the one that was reported: any future faction
 * whose name ends in a stop lands the same way, and so does any future shared
 * string that closes on `{{faction}}`.
 * ========================================================================== */
describe('no faction sentence renders a double full stop (#2368)', () => {
  const NAMES = Object.keys(factions.names) as Array<keyof typeof factions.names>

  it('S.N.I.D.E. is the name that makes this a real case', () => {
    // If this ever goes false the guards below still hold, but the REASON in
    // this block's header has stopped being true — read it before deleting.
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
    // THE GENERAL FORM, and it is narrower than "ends on the interpolation".
    // Five other leaves close on `{{faction}}` and are all correct — "Join
    // {{faction}}", "Join {{faction}}?", "You left {{faction}}" — because a
    // label, a question mark and a name that ends in a stop compose fine. It is
    // specifically the APPENDED FULL STOP that doubles up, wherever it falls.
    const offenders = catalogLeaves()
      .filter(([id]) => id.startsWith('factions.json:'))
      .filter(([, value]) => /\{\{faction\}\}\./.test(value))
      .map(([id, value]) => `${id} -> "${value}"`)
    expect(offenders).toEqual([])
  })
})

/* ========================================================================== *
 * #2789 — THE DISCLAIMER IS OWNER-WRITTEN LEGAL COPY, TRANSCRIBED VERBATIM
 *
 * THE SEAM IS THE CATALOG. `/disclaimer` and the onboarding terms stop (stop 3)
 * both render `common:disclaimer.*`, so there is one document and this is where
 * it lives. Most catalog rows need no guard — a blurb that drifts later is a
 * copy question, not a regression. This one is different: it is the text a
 * Player agrees to, and three of its rows LOOK like defects and would be
 * quietly corrected by the next reader.
 *
 *   1. A SPACED HYPHEN, `statutes - no violation`, where the catalogs
 *      otherwise spell a spaced dash as an em dash (#2598 measured 98 em
 *      dashes and no spaced hyphen or en dash anywhere). The owner wrote a
 *      hyphen. It stays a hyphen until she says otherwise.
 *   2. `The creator, of the system of websites,` — the comma after "creator"
 *      reads as a typo, or as an appositive that never closes.
 *   3. STRAIGHT double quotes throughout: "Game", "Players", "Tasks". #2789's
 *      Queries section describes `"Players"` as curly; the owner's text block,
 *      which IS the document, has all three straight. Flagged on the issue,
 *      transcribed as written.
 *
 * FOUR PARAGRAPHS BECAME THREE. `p4` is retired rather than refilled — the
 * paragraph boundaries in a legal document are part of the document, so the
 * three new paragraphs are not redistributed across four keys to save a key.
 * Both surfaces dropped their fourth `<p>` with it; `t()` is typed off this
 * catalog, so a leftover `t('disclaimer.p4')` fails the typecheck.
 * ========================================================================== */
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
    // Named one by one so the failure says WHICH correction was made. The
    // exact-transcription assertions above already cover them; what these add
    // is a message a reader can act on instead of a 146-word diff.
    expect(i18n.t('common:disclaimer.p2')).toContain('statutes - no violation')
    expect(i18n.t('common:disclaimer.p1')).toContain('The creator, of the system')
    expect(i18n.t('common:disclaimer.p1')).toContain('"Game"')
    expect(i18n.t('common:disclaimer.p1')).toContain('"Players"')
    expect(i18n.t('common:disclaimer.p1')).toContain('"Tasks"')
  })

  it('dates the document to the pass that rewrote it', () => {
    // A stale date under a rewritten legal document is worse than no date.
    expect(i18n.t('common:disclaimer.lastUpdated')).toBe('Last updated: August 2026')
  })
})

/* -------------------------------------------------------------------------- *
 * #2620 — the invitation's deferral control is one key, on both surfaces.
 * -------------------------------------------------------------------------- */

/**
 * The feed's invitation card ANNOUNCES that a letter arrived; it does not
 * PREVIEW one (owner ruling, 2026-08-26). It restates none of the letter's
 * headline, pitch or perks, and its call to action sends the player to the
 * factions page rather than to the letter — so the two vocabularies are
 * independent by design, and the drift between them is not a defect.
 *
 * The single overlap WAS one: both surfaces offer the same act — put the
 * invitation off without answering it (ADR-0070) — and each held its own key
 * with its own word. `feed:invitationLetter.notNow` is gone and the card reads
 * the letter's shared `factions:invitation.dismiss`.
 *
 * The catalog half and the call-site half are both here because neither
 * catches the other's bug: a deleted key with a live caller throws at render
 * (`missingKeyHandler`), but only on a surface a DOM-less harness never mounts,
 * and a caller left behind on a resurrected key passes every render test there
 * is.
 */
describe('the invitation deferral is one key on both surfaces (#2620)', () => {
  const src = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const read = (parts: string) => readFileSync(join(src, ...parts.split('/')), 'utf8')

  it('keeps no second key for the act', () => {
    expect(feed.invitationLetter).not.toHaveProperty('notNow')
  })

  it('holds the surviving word on the shared key', () => {
    // "Not now", not the shared key's original "Maybe later": three feed source
    // files and ADR-0070 already name this act "Not now" in prose, and
    // `forms:editPraxis.attach.cancel` — the app's other deferral — says it too.
    //
    // That sibling is NOT asserted here. It is evidence for the word, not a
    // promise about it: pinning another surface's copy inside this block would
    // fail a future reword of the attach control with a message about the
    // invitation deferral, sending the next reader to the wrong issue.
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
