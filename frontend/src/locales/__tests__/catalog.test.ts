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
  // shape on purpose: `levelUnit` and `scoreFootnote` are optional knobs only
  // some kits set (the rest take ProfileSkin's shared `profile.levelUnit` and
  // draw no footnote), and WOW's badge heading is `profile.wow.honours` —
  // already in the catalog for its phone stack, the same words for the same
  // section, so the desktop kit reads that key rather than a second copy of it.
  const PROFILE_KIT_KEYS: Record<string, readonly string[]> = {
    ua: ['ringLabel', 'levelUnit', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    snide: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    wow: ['ringLabel', 'levelUnit', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'honours'],
    coven: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    ephemerists: ['ringLabel', 'levelUnit', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    everymen: ['ringLabel', 'nextLevel', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
    singularity: ['ringLabel', 'nextLevel', 'scoreFootnote', 'praxisEyebrow', 'praxisEmptyTitle', 'praxisEmptyBody', 'badgeTitle'],
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
    expect(i18n.t('common:profile.singularity.scoreFootnote', { score: 1880 })).toBe(
      '> 1880 PTS LOGGED',
    )
    expect(i18n.t('common:profile.snide.praxisEmptyBody')).toBe(
      "Clean record's a bad look around here. Go pull a job.",
    )
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
