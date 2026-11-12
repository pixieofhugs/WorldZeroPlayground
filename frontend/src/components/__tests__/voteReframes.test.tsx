/** Vote-reframe registry guard (#194). */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import { VOTE_REFRAMES, reframeLabel } from '../vote/voteReframes'
import EverymenVote from '../vote/EverymenVote'

vi.mock('../vote/useVote', () => ({
  useVote: () => ({ user: { id: 1 }, selected: 0, saving: false, error: '', vote: vi.fn() }),
}))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, refetch: vi.fn() }),
}))

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

describe('EverymenVote renders from registry', () => {
  const html = renderToStaticMarkup(<EverymenVote praxisId={1} />)

  /** #2166: the tier word surfaces only in the control's `aria-label`. */
  it('buttons carry aria-labels matching registry tier labels', () => {
    for (const tier of VOTE_REFRAMES['everymen'].tiers) {
      expect(html, `aria-label for tier ${tier.value}`).toContain(
        `Rate ${tier.value} — ${tier.label}`
      )
    }
  })
})

describe('reframeLabel', () => {
  it('labels a value in the task faction vocabulary', () => {
    expect(reframeLabel('ua', 5)).toBe('radiant')
    expect(reframeLabel('snide', 1)).toBe('meh')
  })

  it('labels albescent in plain numerals, exactly like unaffiliated (#783)', () => {
    // Tiers render to every voter, so a vocabulary would reveal the society.
    expect(reframeLabel('albescent', 3)).toBe(reframeLabel(null, 3))
    expect(reframeLabel('albescent', 5)).toBe('5')
  })

  it('falls back to the arabic number when no reframe exists', () => {
    expect(reframeLabel(null, 4)).toBe('4')
    expect(reframeLabel('nonexistent', 2)).toBe('2')
  })
})
