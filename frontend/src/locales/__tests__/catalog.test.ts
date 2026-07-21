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
    expect(i18n.t('votes:ephemerists.plausible')).toBe('plausible')
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
