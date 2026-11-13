/**
 * EphemeristsVote (#1207): the alchemical metals ladder. Words in
 * `votes:ephemerists.*`, numerals in `voteReframes`, plate here; all must move together.
 * SSR-only, so markup is also the reduced-motion state (animations are CSS classes).
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

import EphemeristsVote, { CastBurst, DISC_RUN } from '../EphemeristsVote'
import { METAL_SIGILS } from '../../factionMarks/ephemeristsPlate'
import { VOTE_REFRAMES, reframeLabel } from '../voteReframes'
import { readIndexCss } from '../../../test/indexCss'

const HEX = /#[0-9a-fA-F]{3,8}\b/

function currentUser(): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
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
    is_owner: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    can_vote: true,
    vote_level_required: 1,
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: 'Era 1',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  }
}

function render(currentValue?: number): string {
  return renderToStaticMarkup(
    <EphemeristsVote praxisId={7} currentValue={currentValue} points={16} totalVotes={4} />,
  )
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')

const METALS = ['lead', 'copper', 'silver', 'gold', 'platinum']

const SHEET = readIndexCss()
/** The row's rule outside the container query. */
const metalRow = () => SHEET.match(/^\.eph-metal-row \{[^}]*\}/m)?.[0] ?? ''
/** The container query block: the row in a narrow plate. */
const narrowRow = () =>
  SHEET.slice(SHEET.indexOf('@container'), SHEET.indexOf('@container') + 320)

describe('the metals vocabulary (#1207, ADR-0061)', () => {
  it('names the five tiers lead → platinum', () => {
    expect(VOTE_REFRAMES.ephemerists.tiers.map((tier) => tier.label)).toEqual(METALS)
  })

  it('renames the KEYS, so no key holds a word it does not say', () => {
    // Pins against a stale `apocryphal` key resolving to "lead".
    for (const value of [1, 2, 3, 4, 5]) {
      expect(reframeLabel('ephemerists', value)).toBe(METALS[value - 1])
    }
    for (const retired of ['apocryphal', 'disputed', 'plausible', 'corroborated', 'canonical']) {
      expect(METALS).not.toContain(retired)
    }
  })

  // `numeral: 'roman'` is pinned in `__tests__/voteReframes.test.tsx`; the plate
  // draws no numerals (#1638) but profile/faction bodies still do.
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
    // One SR label shape for every faction (#1863).
    METALS.forEach((metal, index) => {
      expect(html).toContain(`Rate ${index + 1} — ${metal}`)
    })
    expect((html.match(/<button/g) ?? []).length).toBe(5)
  })

  /** #1638: the metals ARE the scale, so nothing on the plate restates it. */
  it('strikes no numeral, threads no rail and glosses no caption (#1638)', () => {
    mocks.user = currentUser()
    const html = render(3)
    // `III`/`IV` only: a lone `I` or `V` could be a letter in a word.
    expect(text(html)).not.toContain('III')
    expect(text(html)).not.toContain('IV')
    expect(html).not.toContain('eph-metal-rail')
    expect(html).not.toContain('repeating-linear-gradient')
    // Literal strings, not catalog keys: the keys were deleted, and a negative
    // assertion would keep a dead key looking live.
    expect(text(html)).not.toContain('cast your metal')
    expect(text(html)).not.toContain('lead to platinum')
  })

  /** #2142: the resting plate is still; no ambient ring on reached discs. */
  it('halos no reached disc — the ambient ring is gone (#2142)', () => {
    mocks.user = currentUser()
    for (const rank of [1, 3, 5]) {
      expect(render(rank)).not.toContain('eph-metal-burst')
    }
    // The pitch lives on in the cast dial.
    expect(METAL_SIGILS.map((metal) => metal.burstStep)).toEqual([60, 45, 36, 30, 22.5])
  })

  /** #2142: rendered directly since the burst is click state and there is no DOM. */
  it('rules the cast dial at the struck metal\u2019s own pitch (#2142)', () => {
    for (const metal of METAL_SIGILS) {
      const html = renderToStaticMarkup(<CastBurst metal={metal} size={44} />)
      expect(html).toContain(`transparent 1.2deg ${metal.burstStep}deg`)
      expect(html).toContain(metal.color)
    }
  })

  /**
   * #2142: every layer mounts at inline `opacity: 0` and lives only in a deferred
   * keyframe, so `reduce` (or a missing sheet) shows no burst. Counted, because a
   * layer missing `opacity: 0` sticks on the plate unseen in any review.
   */
  it('rests every cast layer invisible, so reduced motion draws none of it (#2142)', () => {
    const html = renderToStaticMarkup(<CastBurst metal={METAL_SIGILS[3]} size={44} />)
    // 1 halo + 2 shock rings + 1 dial + 9 motes + 12 sparks.
    expect((html.match(/opacity:0/g) ?? []).length).toBe(25)
    expect(html).not.toContain('animation:')
    expect(html).not.toMatch(HEX)
  })

  /**
   * #1638: `stepClip(7)` cuts a `border` away at both chamfers. The frame is a
   * brass ground with the sheet 1px inside, both clipped; pins against the
   * border coming back on the clipped element.
   */
  it('frames the plate as a stepped ground, not a clipped border (#1638)', () => {
    mocks.user = currentUser()
    const html = render(5)
    expect((html.match(/clip-path:polygon/g) ?? []).length).toBe(2)
    // RULE brass: it is a line; mark brass is for things that are read (#2142).
    expect(html).toContain('background:var(--faction-ephemerists-plate-brass-rule)')
    const plate = html.slice(0, html.indexOf('<button'))
    expect(plate).not.toContain('border:1px solid')
  })

  it('keeps the design geometry: 44px discs, 50px at rank 5', () => {
    mocks.user = currentUser()
    const html = render()
    // Never below the 44px touch target.
    expect((html.match(/width:44px;height:44px/g) ?? []).length).toBe(4)
    expect(html).toContain('width:50px;height:50px')
  })

  /**
   * #1633: no layout here, so assert the clearance. Each ring overhangs
   * `BURST_MARGIN / 2 = 12`px at every tier, so two want 24 = `--space-xl`
   * rim-to-rim (end padding matches). Block padding `--space-lg` (16) clears
   * the 12px reach before `stepClip(7)` shaves it.
   */
  it('holds the metals far enough apart for their bursts to clear (#1633)', () => {
    // In `.eph-metal-row` (#2236): inline style would beat the narrow-plate rule.
    mocks.user = currentUser()
    expect(render(5)).toContain('class="eph-metal-row"')
    expect(metalRow()).toContain('gap: var(--space-lg) var(--space-xl)')
    expect(metalRow()).toContain('padding: var(--space-lg) var(--space-xl)')
  })

  /**
   * #2236: flex items shrank to ovals under 370px, below the 44px touch floor.
   * The disc never yields (WCAG); spacing does, then the line. Clearance keys
   * off the plate's width (a container query), since the same widget sits on a
   * phone and in a 280px praxis card.
   */
  it('locks every disc out of round-losing shrink (#2236)', () => {
    mocks.user = currentUser()
    const html = render(5)
    expect((html.match(/flex-shrink:0/g) ?? []).length).toBe(5)
    // Locked discs need wrap, or the plate's clip shaves them.
    expect(html).toContain('flex-wrap:wrap')
  })

  it('yields the clearance to the PLATE’s width, never the viewport’s (#2236)', () => {
    expect(SHEET).toContain('.eph-vote-plate { container-type: inline-size; }')
    expect(narrowRow()).toContain('.eph-metal-row')
    expect(narrowRow()).not.toContain('@media')
  })

  /**
   * #2315: a single narrow rung bunched the discs 4px apart mid-plate
   * ("squished"). The row is `DISC_RUN + 6g`, so `g = (100cqi − DISC_RUN) / 6`,
   * clamped xs..xl, meets the wide rule exactly at its ceiling. Not measured
   * in a browser; this only checks sheet and component arithmetic agree.
   */
  it('spends the whole plate rather than dropping to one narrow rung (#2315)', () => {
    const narrow = narrowRow()
    expect(narrow, 'the clearance ramps').toContain('clamp(')
    expect(narrow, 'and it ramps against the PLATE').toContain('100cqi')
    expect(narrow, 'floor').toContain('var(--space-xs)')
    expect(narrow, 'ceiling').toContain('var(--space-xl)')
    // Gap and end padding are one figure: same air at the edge as between discs.
    expect(narrow).toMatch(/column-gap: var\(--eph-metal-air\)/)
    expect(narrow).toMatch(/padding-inline: var\(--eph-metal-air\)/)
    // Block padding (burst clearance) and row gap stay off the query.
    expect(narrow).not.toContain('padding-block')
    expect(narrow).not.toContain('row-gap')
  })

  it('reads the disc run from the discs, so a resize cannot mis-space the row (#2315)', () => {
    // `DISC_RUN` is transcribed into the sheet; this guards the copy.
    expect(DISC_RUN, 'four discs and the haloed fifth').toBe(226)
    expect(narrowRow()).toContain(`${DISC_RUN}px`)
  })

  it('meets the wide rule exactly at the ramp’s ceiling, so the threshold is not a step (#2315)', () => {
    // The query must fire at or above the ramp's ceiling width, or the cliff returns.
    const rung = (name: string) =>
      Number(SHEET.match(new RegExp(`--space-${name}: (\\d+)px`))?.[1])
    const ceiling = DISC_RUN + 6 * rung('xl')
    expect(ceiling, 'the un-queried rule’s own intrinsic width').toBe(370)
    const threshold = Number(SHEET.match(/@container \(width < (\d+)px\)/)?.[1])
    expect(threshold).toBeGreaterThanOrEqual(ceiling)
    // At the floor all five still fit: wrap stays the last resort.
    expect(DISC_RUN + 6 * rung('xs')).toBeLessThan(threshold)
  })

  it('lights only the reached discs, and leaves the rest idle', () => {
    mocks.user = currentUser()
    const html = render(3)
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
    expect(html).toContain('eph-metal-sheen')
    expect(html).not.toContain('animation:')
  })

  /**
   * #2142: twelve `aria-hidden` glyphs cycle the seven planetary metals on the
   * shipped orbit `radius + 13` (the design's `size / 2 + 6` crowds the sigil).
   */
  it('orbits rank 5 with twelve glyphs cycling the seven planets (#2142)', () => {
    mocks.user = currentUser()
    const html = render(5)
    for (const planet of ['\u2644', '\u2640', '\u263d', '\u2609', '\u263f', '\u2643', '\u2642']) {
      expect(html).toContain(planet)
    }
    expect((html.match(/eph-metal-filing/g) ?? []).length).toBe(12)
    expect(html).toContain('font-size:var(--text-sm)')
    expect(render(4)).not.toContain('eph-metal-filing')
  })

  /**
   * #2235: the classical platinum compound is crescent LEFT, sun-and-dot right.
   * Do not "restore" #2142's mirrored version. The other four sigils are pinned
   * by their opening move so a platinum fix cannot renumber a neighbour.
   */
  it('draws platinum crescent-left, sun-right (#2235, reversing #2142)', () => {
    const platinum = METAL_SIGILS[4].glyph
    const parts = platinum.match(/M[^M]+/g) ?? []
    const startX = (d: string) => Number.parseFloat(d.slice(1))
    const crescent = parts.find((part) => part.includes('A6.5'))
    const sun = parts.find((part) => part.includes('a4.8'))
    const dot = parts.find((part) => part.includes('a1.15'))
    expect([crescent, sun, dot].every(Boolean)).toBe(true)
    expect(startX(crescent!)).toBeLessThan(startX(sun!) - 4.8)
    // An off-centre dot reads as a second moon.
    expect(startX(dot!)).toBe(startX(sun!))
    expect(METAL_SIGILS.map((metal) => metal.glyph.slice(0, 8))).toEqual([
      'M10.4 4.',
      'M12 4.4 ',
      'M15.8 4.',
      'M12 5 a7',
      'M7.2 7.2',
    ])
  })

  /**
   * #2235: lead read as a lowercase "t". Asserts the classical Saturn structure
   * from path coordinates (legibility itself is not testable here).
   */
  it('draws lead as a Saturn — stem, crossing bar, bowl to the right (#2235)', () => {
    const [stem = '', bar = '', bowl = ''] = METAL_SIGILS[0].glyph.match(/M[^M]+/g) ?? []
    const [, stemX, stemTop, stemFoot] = /^M([\d.]+) ([\d.]+) V([\d.]+)/
      .exec(stem)!
      .map(Number)
    const [, barLeft, barY, barRight] = /^M([\d.]+) ([\d.]+) H([\d.]+)/.exec(bar)!.map(Number)
    expect(barLeft).toBeLessThan(stemX)
    expect(barRight).toBeGreaterThan(stemX)
    expect(stemTop).toBeLessThan(barY)
    expect(stemFoot).toBeGreaterThan(barY + 8)
    const pairs = bowl.match(/[\d.]+ [\d.]+/g) ?? []
    const bowlXs = pairs.map((pair) => Number(pair.split(' ')[0]))
    const bowlYs = pairs.map((pair) => Number(pair.split(' ')[1]))
    expect(bowlXs[0]).toBe(stemX)
    expect(bowlYs[0]).toBeGreaterThan(barY)
    expect(Math.max(...bowlXs)).toBeGreaterThan(stemX + 3)
    // Inside the 24-unit sigil square.
    expect(Math.max(...bowlXs)).toBeLessThan(24)
    expect(Math.max(...bowlYs)).toBeLessThanOrEqual(stemFoot)
  })

  /** #2142: plate ground is the masthead band, but still a recess (gradient + inset). */
  it('anchors the plate ground to the masthead band, still recessed (#2142)', () => {
    mocks.user = currentUser()
    const html = render(3)
    expect(html).toContain(
      'radial-gradient(130% 170% at 50% -20%, var(--faction-ephemerists-plate-band), var(--faction-ephemerists-vote-plate-to))',
    )
    expect(html).toContain('box-shadow:inset 0 1px 8px')
    expect(html).not.toContain('--faction-ephemerists-vote-plate-from')
  })
})

/**
 * The cast burst's reduced-motion guard is an a11y floor, and it lives in CSS.
 * Brace-counted, not regexed, since `@media` blocks nest. Both sheets
 * (`index.css` + deferred `motion.ornament.css`, #2073) are concatenated so an
 * unguarded twin in either fails.
 *
 * ponytail: partition copied from `factionProfileBody.test.tsx`; a third
 * consumer should lift it to a shared `src/__tests__/` helper.
 */
describe('#2142 the cast burst sits behind the reduced-motion guard', () => {
  const css = [
    readIndexCss(),
    readFileSync(fileURLToPath(new URL('../../../motion.ornament.css', import.meta.url)), 'utf8'),
  ].join('\n')

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

  it('animates every cast layer only under no-preference (#2142)', () => {
    for (const layer of ['halo', 'ring', 'dial', 'mote', 'spark', 'sigil']) {
      const animates = new RegExp(`\\.eph-cast-${layer}\\s*\\{[^}]*animation`)
      expect(animates.test(GUARDED), `guarded .eph-cast-${layer}`).toBe(true)
      expect(animates.test(UNGUARDED), `UNguarded .eph-cast-${layer}`).toBe(false)
    }
  })

  it('leaves the cast NOTHING at rest — no stilled frame, no critical CSS', () => {
    // The burst is an event, so its stilled frame is nothing; its rest state is
    // inline, keeping it off the render-blocking sheet.
    for (const layer of ['halo', 'ring', 'dial', 'mote', 'spark', 'sigil']) {
      expect(UNGUARDED).not.toContain(`.eph-cast-${layer}`)
    }
  })

  it('retired the ray fan, the rail and the ambient ring with the scaffolding', () => {
    // Comments stripped: the sheets still name the retired rules in prose.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const retired of [
      'eph-metal-ray',
      'eph-metal-rail',
      'eph-metal-current',
      'eph-metal-burst', // #2142, in both sheets
    ]) {
      expect(declarations, retired).not.toContain(retired)
    }
  })
})
