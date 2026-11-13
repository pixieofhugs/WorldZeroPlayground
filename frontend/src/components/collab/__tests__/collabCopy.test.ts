/**
 * #591 → #1812: the collab copy resolver. Collab words are shared by owner
 * ruling; the override mechanism survives (it fronts `duel*` too), so this
 * tests both that it works and that nothing uses it for collab copy.
 */
import { describe, it, expect } from 'vitest'
import i18n from '../../../i18n'
import { collabCopy } from '../collabCopy'
import type { CollabCopyKey } from '../collabCopy'
import forms from '../../../locales/en/forms.json'
import { FACTION_MANIFESTS } from '../../../factions'

/** Every slug a task can carry, `na` included; derived so a tenth faction is caught (#2815). */
const FACTION_SLUGS = FACTION_MANIFESTS.map((manifest) => manifest.slug)

const SHARED_KEYS = Object.keys(forms.editPraxis.collab) as CollabCopyKey[]

/**
 * Every `editPraxis.<x>` entry with its own `collab` block. Snapshotted at load:
 * i18next holds this same JSON object, so the runtime probe below would leak in.
 */
const FACTION_COLLAB_BLOCKS = Object.entries(
  forms.editPraxis as Record<string, unknown>,
)
  .filter(
    ([key, value]) =>
      key !== 'collab' &&
      typeof value === 'object' &&
      value !== null &&
      'collab' in (value as Record<string, unknown>),
  )
  .map(([key]) => key)

describe('collabCopy — the resolver still resolves', () => {
  // Nothing overrides today, so the override branch is exercised against a
  // runtime-injected slug — the road back must not be deleted silently.
  const PROBE_SLUG = 'probe-faction'
  i18n.addResource(
    'en',
    'forms',
    `editPraxis.${PROBE_SLUG}.collab.pillCast`,
    'probed',
  )

  it('prefers a faction override when one exists', () => {
    expect(collabCopy(PROBE_SLUG, 'pillCast')).toBe('probed')
  })

  it('falls back to the shared block for a key that faction does not override', () => {
    expect(collabCopy(PROBE_SLUG, 'pillWeaving')).toBe(
      forms.editPraxis.collab.pillWeaving,
    )
  })

  it('falls back to the shared block for a null / blank slug', () => {
    expect(collabCopy(null, 'pillWeaving')).toBe(forms.editPraxis.collab.pillWeaving)
    expect(collabCopy(undefined, 'pillCast')).toBe(forms.editPraxis.collab.pillCast)
    expect(collabCopy('', 'pillCast')).toBe(forms.editPraxis.collab.pillCast)
  })

  it('falls back to the shared block for an unknown slug', () => {
    expect(collabCopy('not-a-faction', 'proposeAction')).toBe(
      forms.editPraxis.collab.proposeAction,
    )
  })

  it('interpolates counts', () => {
    expect(collabCopy(null, 'castStatus', { cast: 1, total: 3 })).toBe(
      '1 of 3 approved',
    )
    expect(collabCopy('coven', 'castStatus', { cast: 1, total: 3 })).toBe(
      '1 of 3 approved',
    )
  })
})

/** #1812: one vocabulary on every faction; the first assertion is shape-based. */
describe('collabCopy — no faction voices the collab keys (#1812)', () => {
  it('the catalog carries no per-faction collab block', () => {
    expect(FACTION_COLLAB_BLOCKS).toEqual([])
  })

  it.each(FACTION_SLUGS)('%s resolves every key to the shared wording', (slug) => {
    for (const key of SHARED_KEYS) {
      expect(collabCopy(slug, key, { cast: 1, total: 2 })).toBe(
        collabCopy(null, key, { cast: 1, total: 2 }),
      )
    }
  })

  it.each(FACTION_SLUGS)('%s resolves every key to non-empty copy', (slug) => {
    for (const key of SHARED_KEYS) {
      expect(collabCopy(slug, key, { cast: 1, total: 2 }).trim()).not.toBe('')
    }
  })
})

/**
 * The shared tier uses the domain's words (#1154, CONTEXT.md: "Submitted"),
 * not one faction's cast/weave/file. Values only; key names are exempt.
 */
describe('collabCopy — the shared tier speaks the domain noun (#1154)', () => {
  const FACTION_VERBS =
    /\b(cast|casts|casting|weave|weaves|weaving|woven|file|files|filed|filing)\b/i

  it.each(SHARED_KEYS)('shared %s borrows no faction verb', (key) => {
    // `{{cast}}` is an interpolation name, not prose.
    const line = (forms.editPraxis.collab as Record<string, string>)[key].replace(
      /\{\{[^}]*\}\}/g,
      '…',
    )
    expect(line).not.toMatch(FACTION_VERBS)
  })

  /**
   * #1832: sentence case for the four roster pills — standalone labels, and
   * `.label-caption` sets `text-transform: none`. The duel pair stays lower-case:
   * it never renders beside these.
   */
  it('labels the roster states in sentence case', () => {
    // Approved since ADR-0079: `has_submitted` is a vote on the live proposal.
    expect(collabCopy(null, 'pillCast')).toBe('Approved')
    expect(collabCopy(null, 'pillWeaving')).toBe('Accepted')
    expect(collabCopy(null, 'pillInvited')).toBe('Invited')
    expect(collabCopy(null, 'pillDeclined')).toBe('Declined')
    expect(collabCopy(null, 'pillDone')).toBe('Done')
  })
})
