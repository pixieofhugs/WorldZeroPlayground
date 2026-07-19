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
  'wow',
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

  it('renders all five tier labels from voteReframes', () => {
    for (const tier of VOTE_REFRAMES['everymen'].tiers) {
      expect(html, `tier ${tier.value} label "${tier.label}"`).toContain(tier.label)
    }
  })

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
    expect(reframeLabel('ua', 5)).toBe('masterwork')
    expect(reframeLabel('snide', 1)).toBe('meh')
  })

  it('labels albescent in plain numbers, like any unthemed slug (#783)', () => {
    // The "bear witness" vocabulary (Unseeing → Inscribed) was a PLAIN-TEXT
    // tell: reframeLabel looks the slug up dynamically, so voter tiles on an
    // Albescent task spelled the society out in its own words to every viewer,
    // with no bespoke component involved. A secret society hiding in plain
    // sight gets the same arabic numerals an unaffiliated task gets.
    expect(reframeLabel('albescent', 3)).toBe(reframeLabel('na', 3))
    expect(reframeLabel('albescent', 5)).toBe('5')
  })

  it('falls back to the arabic number when no reframe exists', () => {
    expect(reframeLabel(null, 4)).toBe('4')
    expect(reframeLabel('nonexistent', 2)).toBe('2')
  })
})
