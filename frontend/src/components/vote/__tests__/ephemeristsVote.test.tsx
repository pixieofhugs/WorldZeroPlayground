/**
 * EphemeristsVote (#1207) — THE ALCHEMICAL METALS LADDER, replacing the
 * constellation attestation (#821).
 *
 * The seam is the rendered widget plus the tier vocabulary it reads: the words
 * live in `votes:ephemerists.*`, the numeral system in `voteReframes`, and the
 * plate/discs in this component. All three have to move together — a rename
 * that left the old keys holding new values, or a ladder that lost its roman
 * numerals, still renders and is still wrong.
 *
 * The harness is SSR-only (renderToStaticMarkup, no DOM, effects never run), so
 * everything is asserted from markup given props — which is also the
 * reduced-motion state, since every animation is a CSS class gated in index.css.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  user: null as CurrentUser | null,
  castVote: vi.fn(async () => ({}) as unknown),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refetch: async () => {} }),
}))
vi.mock('../../../api/votes', () => ({
  castVote: mocks.castVote,
}))

import EphemeristsVote from '../EphemeristsVote'
import { VOTE_REFRAMES, reframeLabel } from '../voteReframes'

/** No hex may reach the markup — every colour is a token. */
const HEX = /#[0-9a-fA-F]{3,8}\b/

function currentUser(): CurrentUser {
  return {
    account_id: 1,
    character: {
      id: 9,
      username: 'ada',
      display_name: 'Ada',
      bio: '',
      avatar_url: '',
      location: '',
      level: 8,
      score: 100,
      all_time_score: 100,
      faction_slug: 'ephemerists',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      badges: [],
      invitations: [],
    },
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    second_character_level_required: 5,
    era_name: 'Era 1',
    level_jump_reach: 0,
    level_jump_available: false,
  }
}

function render(currentValue?: number): string {
  return renderToStaticMarkup(
    <EphemeristsVote praxisId={7} currentValue={currentValue} points={16} totalVotes={4} />,
  )
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')

const METALS = ['lead', 'copper', 'silver', 'gold', 'platinum']

describe('the metals vocabulary (#1207, ADR-0061)', () => {
  it('names the five tiers lead → platinum', () => {
    expect(VOTE_REFRAMES.ephemerists.tiers.map((tier) => tier.label)).toEqual(METALS)
  })

  it('renames the KEYS, so no key holds a word it does not say', () => {
    // The archive vocabulary is gone from the catalog entirely — a stale
    // `apocryphal` key resolving to "lead" is the failure this pins.
    for (const value of [1, 2, 3, 4, 5]) {
      expect(reframeLabel('ephemerists', value)).toBe(METALS[value - 1])
    }
    for (const retired of ['apocryphal', 'disputed', 'plausible', 'corroborated', 'canonical']) {
      expect(METALS).not.toContain(retired)
    }
  })

  it('keeps the roman numerals — the discs carry I–V', () => {
    expect(VOTE_REFRAMES.ephemerists.numeral).toBe('roman')
  })
})

describe('EphemeristsVote markup', () => {
  it('renders the shared login gate for an anonymous viewer', () => {
    mocks.user = null
    const html = render()
    expect(text(html)).toContain('Log in to vote')
    expect(html).not.toContain('aria-label="Cast')
  })

  it('renders five discs, each labelled with its metal', () => {
    mocks.user = currentUser()
    const html = render()
    for (const metal of METALS) {
      expect(html).toContain(`Cast ${metal}`)
    }
    expect((html.match(/<button/g) ?? []).length).toBe(5)
  })

  it('strikes each disc with its roman numeral', () => {
    mocks.user = currentUser()
    const body = text(render())
    for (const numeral of ['I', 'II', 'III', 'IV', 'V']) {
      expect(body).toContain(numeral)
    }
  })

  it('keeps the design geometry: 44px discs, 50px at rank 5', () => {
    mocks.user = currentUser()
    const html = render()
    // Four ordinary discs plus the haloed top rank — never shrunk below the
    // 44px touch target, and never re-solved.
    expect((html.match(/width:44px;height:44px/g) ?? []).length).toBe(4)
    expect(html).toContain('width:50px;height:50px')
  })

  /**
   * #1633 — the bursts and sheens were colliding at the default gap.
   *
   * The seam is the plate's own declaration, because the collision itself is
   * unobservable here: this harness has no DOM and no layout. What IS decidable
   * from the component's constants is the CLEARANCE each disc's ornament needs,
   * and the plate has to be at least that wide between rims.
   *
   * A ray starts at `radius + 3` from the disc centre and runs `rayLength` past
   * that, so the ornament reaches `3 + 8.5` = 11.5px beyond an ordinary disc's
   * rim and `3 + 11.5` = 14.5px beyond rank 5's; rank 5's filings orbit 13px
   * out. Two neighbours therefore need roughly 24px between rims, and they had
   * `--space-md` (12). The same figure has to hold at the plate's own edges, or
   * the outermost bursts collide with the border instead of with each other.
   */
  it('holds the metals far enough apart for their bursts to clear (#1633)', () => {
    mocks.user = currentUser()
    const plate = render(5).match(/<div style="position:relative;display:flex[^"]*"/)?.[0] ?? ''
    expect(plate).toContain('gap:var(--space-xl)')
    // The side padding matches the gap: the end discs get the same room as the
    // ones in the middle.
    expect(plate).toContain('padding:var(--space-md) var(--space-xl)')
  })

  it('lights only the reached discs, and leaves the rest idle', () => {
    mocks.user = currentUser()
    const html = render(3)
    // The three reached discs each carry a sheen layer; the two idle ones do not.
    expect((html.match(/eph-metal-sheen/g) ?? []).length).toBe(3)
  })

  it('paints from the plate family and never the retired codex tokens', () => {
    mocks.user = currentUser()
    const html = render(5)
    expect(html).toContain('--faction-ephemerists-metal-')
    expect(html).not.toMatch(/--eph-[a-z]/)
    expect(html).not.toMatch(HEX)
  })

  it('gates every motion through a CSS class, never an inline animation', () => {
    mocks.user = currentUser()
    const html = render(5)
    expect(html).toContain('eph-metal-ray')
    expect(html).not.toContain('animation:')
  })

  it('speaks the idle caption in the faction voice', () => {
    mocks.user = currentUser()
    expect(text(render())).toContain('cast your metal')
  })
})
