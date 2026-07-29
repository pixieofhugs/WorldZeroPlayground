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
import { collabCopy, SHARED_DEFAULT_COLLAB_KEYS } from '../collabCopy'
import type { CollabCopyKey } from '../collabCopy'
import forms from '../../../locales/en/forms.json'

const FACTION_SLUGS = [
  'na',
  'ephemerists',
  'everymen',
  'snide',
  'singularity',
  'ua',
  'coven',
  'albescent',
] as const

const SHARED_KEYS = Object.keys(forms.editPraxis.collab) as CollabCopyKey[]
// The keys a faction MUST voice. Everything else (SHARED_DEFAULT_COLLAB_KEYS)
// carries the shared mechanics wording for leave/delete and may be left alone —
// see the constant's docstring. A faction that does voice one of those still
// passes: the assertions below are "covers all required" + "no stray keys",
// not exact equality (#1074).
const REQUIRED_KEYS = SHARED_KEYS.filter(
  (key) => !SHARED_DEFAULT_COLLAB_KEYS.includes(key),
)

describe('collabCopy — faction override resolution', () => {
  it('resolves a faction override when one exists', () => {
    // coven keeps the witch-walk diction; everymen files a work report.
    expect(collabCopy('coven', 'pillWeaving')).toBe('still walking')
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
    expect(collabCopy(null, 'castStatus', { cast: 1, total: 3 })).toBe(
      '1 of 3 submitted',
    )
  })
})

describe('collabCopy — catalog completeness', () => {
  it.each(FACTION_SLUGS)('%s overrides every voiced collab key', (slug) => {
    const block = forms.editPraxis[slug].collab as Record<string, string>
    expect(Object.keys(block).sort()).toEqual(
      expect.arrayContaining([...REQUIRED_KEYS].sort()),
    )
  })

  // A key in a faction block that the shared block doesn't have is a typo or a
  // rename that only landed on one side: it would resolve for that faction and
  // silently throw the missing-key error for every other.
  it.each(FACTION_SLUGS)('%s invents no collab key of its own', (slug) => {
    const block = forms.editPraxis[slug].collab as Record<string, string>
    expect(
      Object.keys(block).filter(
        (key) => !SHARED_KEYS.includes(key as CollabCopyKey),
      ),
    ).toEqual([])
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

/**
 * The shared block is the tier with no voice, so it may only use the domain's
 * own words (#1154). It shipped in one faction's register — cast / weaving /
 * woven — which meant the fallback every un-overriding faction inherits (today,
 * Warriors of Whimsy) read as somebody else's diction. The nouns come from
 * CONTEXT.md: **Submitted** (`status = submitted`), and "filed"/"cast" are the
 * words it tells you to avoid for it.
 *
 * The key NAMES are deliberately exempt: `castAction`/`pillWeaving` stay put,
 * because the eight faction blocks that override them genuinely do mean cast,
 * and a rename would touch nine catalogs and every call site for nothing a
 * player sees. This guard is about the values only.
 */
describe('collabCopy — the shared tier speaks the domain noun (#1154)', () => {
  const FACTION_VERBS =
    /\b(cast|casts|casting|weave|weaves|weaving|woven|file|files|filed|filing)\b/i

  it.each(SHARED_KEYS)('shared %s borrows no faction verb', (key) => {
    // Interpolation NAMES are key names by another route — `{{cast}}` is the
    // count the roster passes in, not a word anyone reads. Only the prose is
    // under test.
    const line = (forms.editPraxis.collab as Record<string, string>)[key].replace(
      /\{\{[^}]*\}\}/g,
      '…',
    )
    expect(line).not.toMatch(FACTION_VERBS)
  })

  it('says submitted / not submitted on the roster pills', () => {
    expect(collabCopy(null, 'pillCast')).toBe('submitted')
    expect(collabCopy(null, 'pillWeaving')).toBe('not submitted')
  })

  // WoW is the ninth faction and the only one with no collab block of its own,
  // so it reads the shared tier for every key — it is what this issue changes.
  it('resolves the shared tier for Warriors of Whimsy', () => {
    for (const key of SHARED_KEYS) {
      expect(collabCopy('wow', key, { cast: 1, total: 2 })).toBe(
        collabCopy(null, key, { cast: 1, total: 2 }),
      )
    }
  })
})
