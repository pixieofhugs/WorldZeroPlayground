/**
 * #591 → #1812 — the collab copy resolver, and the one voice it now speaks.
 *
 * The key names are verb-neutral and shared. The *words* used to be the
 * faction's; owner ruling on #1812 took that away for the collab keys, because
 * submission status is a mechanical fact a player must read correctly in order
 * to act. The resolver survives — it is what a differently-voiced key would
 * land on, and it still fronts the `duel*` set — so this file tests both: the
 * mechanism works, and nothing uses it for collab copy.
 */
import { describe, it, expect } from 'vitest'
import i18n from '../../../i18n'
import { collabCopy } from '../collabCopy'
import type { CollabCopyKey } from '../collabCopy'
import forms from '../../../locales/en/forms.json'
import { FACTION_MANIFESTS } from '../../../factions'

/**
 * Every slug a task can carry, `na` included.
 *
 * Derived from the manifest rather than typed (#2815). The describe block below
 * says its first assertion is "written against the catalog's SHAPE rather than a
 * slug list, so a tenth faction is caught without editing it" — that was true of
 * the shape assertion and false of the two loops under it, which are the ones a
 * tenth faction would actually have had to be added to. Both halves derive now.
 */
const FACTION_SLUGS = FACTION_MANIFESTS.map((manifest) => manifest.slug)

const SHARED_KEYS = Object.keys(forms.editPraxis.collab) as CollabCopyKey[]

/**
 * Every `editPraxis.<x>` entry that carries a `collab` block of its own — the
 * thing #1812 deleted.
 *
 * Snapshotted at module load, deliberately: i18next holds the very object this
 * JSON import returns, so the runtime probe registered further down would
 * otherwise show up here as a faction that overrides collab copy.
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
  // The catalog overrides nothing today (that is the point of #1812), so the
  // override branch is exercised against a slug injected at runtime. This is
  // the mechanism a future voiced key would use; deleting the eight blocks must
  // not quietly delete the road back.
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

/**
 * #1812 — collab submission status speaks ONE vocabulary on every faction.
 *
 * This is the guard that keeps the ruling from eroding the next time a faction
 * is added. The first assertion is written against the catalog's SHAPE rather
 * than a slug list, so a tenth faction is caught without editing it.
 */
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
 * The shared block is the only tier there is now, so it may only use the
 * domain's own words (#1154, generalised by #1812). It shipped in one faction's
 * register — cast / weaving / woven — which meant the fallback read as somebody
 * else's diction. The nouns come from CONTEXT.md: **Submitted**
 * (`status = submitted`), and "filed"/"cast" are the words it tells you to
 * avoid for it.
 *
 * The key NAMES are exempt: this guard is about the values only. #1811 did move
 * the action names — `castAction`/`castFinalAction`/`pullBackAction` became
 * `doneAction`/`proposeAction`/`approveAction`/`withdrawAction` — but because
 * the MECHANIC moved under them (ADR-0079 split one button into three signals),
 * not because the wording changed.
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

  /**
   * #1832 — the four roster pills, in one capitalisation.
   *
   * `pillWeaving` read "not submitted": a collaborator who had ACCEPTED the
   * invitation and was mid-write, described by what they had not done and put
   * in the same negative frame as somebody who had not answered at all. The
   * count it was standing in for is already on the header tally (`castStatus`,
   * "{{cast}} of {{total}} submitted"), so the roster loses nothing — it says
   * it once, as a count, instead of as a negative on every row.
   *
   * Sentence case for all four, chosen once: they are standalone labels on a
   * pill (`.label-caption` sets `text-transform: none`, so the literal is what
   * ships), never fragments inside a sentence, and the design writes them
   * capitalised. Capitalising only the one the ruling names would read as an
   * accident next to three lower-case siblings.
   *
   * The duel pair (`duelPillSubmitted` / `duelPillWriting`) is deliberately left
   * lower-case: a praxis is either a collab or a duel side, so those two never
   * render beside these four, and #1832 scoped itself to the roster's set.
   */
  it('labels the roster states in sentence case', () => {
    // `pillCast` reads Approved since ADR-0079: `has_submitted` is a vote on the
    // live proposal now, not "this member filed their part".
    expect(collabCopy(null, 'pillCast')).toBe('Approved')
    expect(collabCopy(null, 'pillWeaving')).toBe('Accepted')
    expect(collabCopy(null, 'pillInvited')).toBe('Invited')
    expect(collabCopy(null, 'pillDeclined')).toBe('Declined')
    // Done rides alongside the four rather than replacing one of them.
    expect(collabCopy(null, 'pillDone')).toBe('Done')
  })
})
