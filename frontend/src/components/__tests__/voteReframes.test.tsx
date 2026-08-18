/**
 * Vote-reframe registry guard (issue #194).
 *
 * VOTE_REFRAMES must have an entry for every faction claiming the `vote` surface,
 * each with exactly tiers 1–5 bearing a non-empty label. Also verifies that the
 * Everymen archetype renders its tile labels from the registry so a label edit
 * in voteReframes.ts propagates without touching the archetype.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import { VOTE_REFRAMES, reframeLabel } from '../vote/voteReframes'
import EverymenVote from '../vote/EverymenVote'

// useVote and useAuth use browser hooks — stub them so server rendering works.
vi.mock('../vote/useVote', () => ({
  useVote: () => ({ user: { id: 1 }, selected: 0, saving: false, error: '', vote: vi.fn() }),
}))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, refetch: vi.fn() }),
}))

// ── Registry structure ────────────────────────────────────────────────────────

const REGISTERED_SLUGS = [
  'ephemerists',
  'everymen',
  'coven',
  'snide',
  'singularity',
  'ua',
] as const

describe('VOTE_REFRAMES registry', () => {
  for (const slug of REGISTERED_SLUGS) {
    it(`${slug} has tiers 1–5 each with a non-empty label`, () => {
      const reframe = VOTE_REFRAMES[slug]
      expect(reframe, `${slug} entry exists`).toBeDefined()
      expect(reframe.tiers).toHaveLength(5)
      for (let value = 1; value <= 5; value++) {
        const tier = reframe.tiers.find((t) => t.value === value)
        expect(tier, `${slug} tier ${value} exists`).toBeDefined()
        expect(tier!.label.trim(), `${slug} tier ${value} label non-empty`).not.toBe('')
      }
    })
  }

  it('ephemerists reframe has numeral: roman', () => {
    expect(VOTE_REFRAMES['ephemerists'].numeral).toBe('roman')
  })

  it('non-ephemerists reframes have no numeral (arabic default)', () => {
    for (const slug of REGISTERED_SLUGS.filter((s) => s !== 'ephemerists')) {
      expect(VOTE_REFRAMES[slug].numeral, `${slug} numeral`).toBeUndefined()
    }
  })
})

// ── Archetype renders labels from registry ───────────────────────────────────

describe('EverymenVote renders from registry', () => {
  const html = renderToStaticMarkup(<EverymenVote praxisId={1} />)

  /**
   * #2166 — the tier word reaches the viewer through the CONTROL, not through a
   * caption. The widget used to print the word under the gear row as well; that
   * line is gone on all nine skins, so the `aria-label` below is now the only
   * place the vocabulary surfaces here, and asserting the bare word appears
   * "somewhere in the markup" would pass off that same attribute twice.
   */
  it('buttons carry aria-labels matching registry tier labels', () => {
    for (const tier of VOTE_REFRAMES['everymen'].tiers) {
      expect(html, `aria-label for tier ${tier.value}`).toContain(
        `Rate ${tier.value} — ${tier.label}`
      )
    }
  })
})

// ── reframeLabel resolver (#195 voter breakdown) ─────────────────────────────

describe('reframeLabel', () => {
  it('labels a value in the task faction vocabulary', () => {
    expect(reframeLabel('ua', 5)).toBe('radiant')
    expect(reframeLabel('snide', 1)).toBe('meh')
  })

  it('labels albescent in plain numerals, exactly like unaffiliated (#783)', () => {
    // The inverse of what this case asserted. Albescent had its own "bear
    // witness" scale, Witnessed → Inscribed (#232) — and vote tiers render to
    // every voter on an Albescent-filed task, so the vocabulary announced the
    // society to people who had never been revealed to it. It now has no vote
    // voice, which is the same as having none: the arabic fallback.
    expect(reframeLabel('albescent', 3)).toBe(reframeLabel(null, 3))
    expect(reframeLabel('albescent', 5)).toBe('5')
  })

  it('falls back to the arabic number when no reframe exists', () => {
    expect(reframeLabel(null, 4)).toBe('4')
    expect(reframeLabel('nonexistent', 2)).toBe('2')
  })
})
