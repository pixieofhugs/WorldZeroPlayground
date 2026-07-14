import { describe, it, expect } from 'vitest'
import i18n from '../../i18n'
import forms from '../en/forms.json'
import praxis from '../en/praxis.json'
import votes from '../en/votes.json'

// Factions with a vote voice (per-faction tier labels). Kept as an explicit
// list, mirroring the seed catalog this test was ported from. Albescent joined
// with its first-class "bear witness" vocabulary in the #443 sweep.
const FACTION_SLUGS = [
  'ephemerists',
  'everymen',
  'wow',
  'snide',
  'singularity',
  'ua',
  'albescent',
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
})

describe('i18next runtime', () => {
  it('resolves a nested key', () => {
    expect(i18n.t('votes:ephemerists.plausible')).toBe('plausible')
  })

  it('interpolates a {{var}}', () => {
    expect(i18n.t('forms:charLimit.reached', { max: 200 })).toBe('200-character limit reached')
  })

  it('resolves kebab-case keys for multi-word labels', () => {
    expect(i18n.t('votes:everymen.a-start')).toBe('a start')
    expect(i18n.t('votes:snide.not-bad')).toBe('not bad')
  })

  it('resolves preserved-case values for all-caps labels', () => {
    expect(i18n.t('votes:singularity.verified')).toBe('VERIFIED')
    expect(i18n.t('votes:snide.anarchy')).toBe('ANARCHY')
  })

  it('resolves the salon-critique values for UA labels', () => {
    expect(i18n.t('votes:ua.masterwork')).toBe('masterwork')
    expect(i18n.t('votes:ua.distinguished')).toBe('distinguished')
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
