/**
 * #591 — per-faction voice for the collab roster copy.
 *
 * Key names are verb-neutral and shared; the words are the faction's. A faction
 * that overrides a key speaks its own line, anything it hasn't overridden falls
 * back to the shared `editPraxis.collab.*` block, and an unaffiliated/unknown
 * slug resolves straight to the shared wording.
 */
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { collabCopy } from '../collabCopy'
import type { CollabCopyKey } from '../collabCopy'
import forms from '../../../locales/en/forms.json'

const FACTION_SLUGS = [
  'na',
  'ephemerists',
  'everymen',
  'snide',
  'singularity',
  'ua',
  'wow',
  'albescent',
] as const

const SHARED_KEYS = Object.keys(forms.editPraxis.collab) as CollabCopyKey[]

describe('collabCopy — faction override resolution', () => {
  it('resolves a faction override when one exists', () => {
    // wow keeps the witch-walk diction; everymen files a work report.
    expect(collabCopy('wow', 'pillWeaving')).toBe('still walking')
    expect(collabCopy('everymen', 'pillWeaving')).toBe('still on the clock')
    expect(collabCopy('singularity', 'pillWeaving')).toBe('pending')
  })

  it('falls back to the shared block for a null / blank slug', () => {
    expect(collabCopy(null, 'pillWeaving')).toBe(forms.editPraxis.collab.pillWeaving)
    expect(collabCopy(undefined, 'pillCast')).toBe(forms.editPraxis.collab.pillCast)
    expect(collabCopy('', 'pillCast')).toBe(forms.editPraxis.collab.pillCast)
  })

  it('falls back to the shared block for an unknown slug', () => {
    expect(collabCopy('not-a-faction', 'castAction')).toBe(
      forms.editPraxis.collab.castAction,
    )
  })

  it('interpolates counts in the faction voice', () => {
    expect(collabCopy('singularity', 'castStatus', { cast: 1, total: 3 })).toBe(
      '1/3 committed',
    )
    expect(collabCopy(null, 'castStatus', { cast: 1, total: 3 })).toBe('1 of 3 cast')
  })
})

describe('collabCopy — catalog completeness', () => {
  it.each(FACTION_SLUGS)('%s overrides every shared collab key', (slug) => {
    const block = forms.editPraxis[slug].collab as Record<string, string>
    expect(Object.keys(block).sort()).toEqual([...SHARED_KEYS].sort())
  })

  it.each(FACTION_SLUGS)('%s resolves every key to non-empty copy', (slug) => {
    for (const key of SHARED_KEYS) {
      expect(collabCopy(slug, key, { cast: 1, total: 2 }).trim()).not.toBe('')
    }
  })

  // Each faction owns its own diction — two factions sharing a line means a
  // copy-paste, not a voice. (This caught ephemerists/albescent both saying
  // "Enter my account".)
  it.each(['castAction', 'castFinalAction', 'pullBackAction'] as const)(
    'gives each faction a distinct %s',
    (key) => {
      const lines = FACTION_SLUGS.map((slug) => collabCopy(slug, key))
      expect(new Set(lines).size).toBe(FACTION_SLUGS.length)
    },
  )
})
