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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
      tagline: '',
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

  // `numeral: 'roman'` is pinned once, in `__tests__/voteReframes.test.tsx`. It
  // no longer describes anything the PLATE draws — #1638 struck the numerals off
  // the discs and off the voters panel — but the faction still grades in roman
  // on its profile and faction bodies, so the declaration stands and belongs to
  // the shared table's own test rather than to this widget's.
})

describe('EphemeristsVote markup', () => {
  it('renders the shared login gate for an anonymous viewer', () => {
    mocks.user = null
    const html = render()
    expect(text(html)).toContain('Log in to vote')
    expect(html).not.toContain('aria-label="Rate')
  })

  it('renders five discs, each labelled with its metal', () => {
    mocks.user = currentUser()
    const html = render()
    // #1863 settled the star's screen-reader label on one shape for every
    // faction: `Rate {{value}} — {{label}}`. The metal is still the label.
    METALS.forEach((metal, index) => {
      expect(html).toContain(`Rate ${index + 1} — ${metal}`)
    })
    expect((html.match(/<button/g) ?? []).length).toBe(5)
  })

  /**
   * #1638 — THE SCAFFOLDING IS GONE. The metals ARE the scale, so nothing on
   * the plate restates it.
   *
   * All three removals are asserted in one place because they are one decision,
   * and because each fails silently on its own: a plate that keeps the dashed
   * rail still renders, still votes, and still looks deliberate.
   */
  it('strikes no numeral, threads no rail and glosses no caption (#1638)', () => {
    mocks.user = currentUser()
    const html = render(3)
    // The numeral pips: I–V struck on a night badge at each metal's edge. `III`
    // and `IV` rather than the whole set — a lone `I` or `V` could be a letter
    // in a word this widget grows later, and an assertion that can pass for the
    // wrong reason is not one.
    expect(text(html)).not.toContain('III')
    expect(text(html)).not.toContain('IV')
    // The dashed brass track the metals used to sit on, and its gold current.
    expect(html).not.toContain('eph-metal-rail')
    expect(html).not.toContain('repeating-linear-gradient')
    // The italic gloss caption naming the hovered tier, and its "· cast" tag.
    // Spelled out rather than asserted through the catalog: both keys were
    // DELETED with the caption, and a key kept alive by a negative assertion is
    // one the next dead-key sweep cannot tell from a live one.
    expect(text(html)).not.toContain('cast your metal')
    expect(text(html)).not.toContain('lead to platinum')
  })

  /**
   * #1638 — THE PER-TIER BURST. The fixed ray fan (10 rays, 16 at rank 5)
   * becomes a conic ring whose spoke pitch is set per metal, so the burst
   * densifies as the metal improves and rank reads off the ring rather than off
   * a numeral. That is the whole reason the numeral could go, which is why this
   * pins every step rather than just that a burst exists.
   */
  it('sets the burst spoke step per metal, 60° down to 22.5° (#1638)', () => {
    mocks.user = currentUser()
    const html = render(5)
    for (const step of ['60deg', '45deg', '36deg', '30deg', '22.5deg']) {
      expect(html).toContain(`--metal-step:${step}`)
    }
    // Each ring is inked in its OWN metal, not one accent for the ladder.
    for (const metal of METALS) {
      expect(html).toContain(`--metal-ink:var(--faction-ephemerists-metal-${metal})`)
    }
  })

  it('bursts only the reached metals', () => {
    mocks.user = currentUser()
    expect((render(2).match(/eph-metal-burst/g) ?? []).length).toBe(2)
    expect(render()).not.toContain('eph-metal-burst')
  })

  /**
   * #1638 — THE FRAME SURVIVES ITS OWN CLIP.
   *
   * `stepClip(7)` chamfers two corners, and a `border` painted at the border
   * box is cut away along both chamfers: the plate shipped with two open
   * corners. The fix is a brass GROUND with the sheet laid 1px inside it, both
   * stepped — the frame is what shows through, so the clip carries it instead
   * of shaving it.
   *
   * The seam is the pair of nested clips, because the visible defect is not
   * decidable in an SSR harness: the failure mode this pins is a future edit
   * putting the border back on the clipped element, which renders fine and
   * loses the corners again.
   */
  it('frames the plate as a stepped ground, not a clipped border (#1638)', () => {
    mocks.user = currentUser()
    const html = render(5)
    expect((html.match(/clip-path:polygon/g) ?? []).length).toBe(2)
    expect(html).toContain('background:var(--faction-ephemerists-plate-brass)')
    // No border on either stepped element — that is the bug, restated.
    const plate = html.slice(0, html.indexOf('<button'))
    expect(plate).not.toContain('border:1px solid')
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
   * The arithmetic was RE-DERIVED for #1638's conic ring, because the figures
   * #1633 recorded were trigonometry over a ray FAN and there is no fan left:
   * they turned on the angle of the ray nearest horizontal (`33.5·sin72° − 22 =
   * 9.86` for an ordinary disc, `39.5 − 25 = 14.5` at rank 5). A ring has no
   * nearest-horizontal spoke — it reaches its full radius in every direction —
   * so the projection is now just the overhang, `BURST_MARGIN / 2 = 12`, and it
   * is the same at every tier because the ring box grows with the disc.
   *
   * Two rings side by side therefore want `12 + 12 = 24`px rim-to-rim, which is
   * `--space-xl` exactly rather than the 0.36px-short fit the fan had. The
   * horizontal padding matches the gap so the end discs get the same room.
   *
   * The BLOCK padding opens to `--space-lg` (16), which #1633 explicitly left
   * to this issue: the fan's index-0 ray pointed straight up and reached 14.5px
   * into 12px of padding, and `stepClip(7)` cut it. The ring reaches 12px, so
   * 16 clears it by 4 and nothing is shaved.
   */
  it('holds the metals far enough apart for their bursts to clear (#1633)', () => {
    mocks.user = currentUser()
    const plate = render(5).match(/<div style="position:relative;display:flex[^"]*"/)?.[0] ?? ''
    expect(plate).toContain('gap:var(--space-xl)')
    expect(plate).toContain('padding:var(--space-lg) var(--space-xl)')
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
    expect(html).toContain('eph-metal-burst')
    expect(html).not.toContain('animation:')
  })
})

/**
 * The burst's 3.2s loop is PERPETUAL, so its `prefers-reduced-motion` guard is
 * an a11y floor rather than a polish item — and the component cannot be asked
 * about it, because the guard lives in the stylesheet. This is the seam.
 *
 * Partitioned by brace-counting rather than sliced by regex: `@media` blocks
 * nest, and a rule that merely sits NEAR a no-preference block reads as guarded
 * to anything shallower. A dropped `@media` opener is the exact failure — every
 * brace still balances, the stylesheet still builds, and the animation escapes
 * into the unguarded cascade.
 *
 * ponytail: this partition function is copied from `#1630`'s block in
 * `pages/characterProfile/__tests__/factionProfileBody.test.tsx`, which is the
 * only other place asserting the guard from the stylesheet. Ceiling: two copies.
 * A third consumer should lift it to a shared `src/__tests__/` helper rather
 * than make it three.
 */
describe('#1638 the metals burst sits behind the reduced-motion guard', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../../../index.css', import.meta.url)),
    'utf8',
  )

  /** The source split into (inside a no-preference block, outside it). */
  const partitionByGuard = (source: string): [string, string] => {
    const OPEN = '@media (prefers-reduced-motion: no-preference)'
    let inside = ''
    let outside = ''
    let cursor = 0
    for (;;) {
      const start = source.indexOf(OPEN, cursor)
      if (start < 0) {
        outside += source.slice(cursor)
        return [inside, outside]
      }
      outside += source.slice(cursor, start)
      let depth = 0
      let index = source.indexOf('{', start)
      const bodyStart = index
      for (; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1
        else if (source[index] === '}') {
          depth -= 1
          if (depth === 0) break
        }
      }
      inside += source.slice(bodyStart, index + 1)
      cursor = index + 1
    }
  }

  const [GUARDED, UNGUARDED] = partitionByGuard(css)

  it('animates only under no-preference', () => {
    const animates = /\.eph-metal-burst\s*\{[^}]*animation/
    expect(animates.test(GUARDED), 'guarded rule').toBe(true)
    expect(animates.test(UNGUARDED), 'UNguarded rule').toBe(false)
  })

  it('draws its ring at rest, so a stilled reader still sees the rank', () => {
    // The base rule carries the pigment and the mask but no `animation`: the
    // burst's MEANING is its spoke pitch, which must survive the guard.
    const base = UNGUARDED.match(/\.eph-metal-burst\s*\{[^}]*\}/)?.[0] ?? ''
    expect(base).toContain('--metal-step')
    expect(base).toContain('mask:')
  })

  it('retired the ray fan and the rail with the scaffolding', () => {
    // Comments stripped first: the block above still NAMES the three retired
    // rules, which is how the next reader learns they were deleted rather than
    // mislaid. Only declarations count here.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const retired of ['eph-metal-ray', 'eph-metal-rail', 'eph-metal-current']) {
      expect(declarations, retired).not.toContain(retired)
    }
  })
})
