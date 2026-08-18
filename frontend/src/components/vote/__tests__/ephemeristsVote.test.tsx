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

import EphemeristsVote, { CastBurst } from '../EphemeristsVote'
import { METAL_SIGILS } from '../../factionMarks/ephemeristsPlate'
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
    can_apply_metatask: false,
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
   * #2142 — THE RESTING PLATE IS STILL.
   *
   * #1638 haloed every reached disc with a perpetual conic ring at that metal's
   * spoke pitch, so rank could be read off the densification; the owner struck
   * it — five haloed discs at once is fog, and 60° against 45° is not a
   * distinction anyone reads at 44px. Checked at three ranks because rank 5 is
   * where five of them stood at once and rank 1 is where a single stray one
   * would hide.
   */
  it('halos no reached disc — the ambient ring is gone (#2142)', () => {
    mocks.user = currentUser()
    for (const rank of [1, 3, 5]) {
      expect(render(rank)).not.toContain('eph-metal-burst')
    }
    // The PITCH is not retired — it moved to the cast dial, which is the whole
    // reason `burstStep` survives on the metals table.
    expect(METAL_SIGILS.map((metal) => metal.burstStep)).toEqual([60, 45, 36, 30, 22.5])
  })

  /**
   * #2142 — THE CAST DIAL carries the pitch now, and it is the one part of the
   * burst that is not a firework: an instrument taking a measurement.
   *
   * Rendered directly rather than through a click, because the burst is
   * click-driven state and this harness has no DOM. The seam is the same either
   * way — the pitch that reaches CSS is the STRUCK metal's own `burstStep`, so
   * casting platinum throws a visibly finer dial (22.5°) than casting lead (60°).
   */
  it('rules the cast dial at the struck metal\u2019s own pitch (#2142)', () => {
    for (const metal of METAL_SIGILS) {
      const html = renderToStaticMarkup(<CastBurst metal={metal} size={44} />)
      expect(html).toContain(`transparent 1.2deg ${metal.burstStep}deg`)
      // Every layer is inked in that metal, never in one accent for the ladder.
      expect(html).toContain(metal.color)
    }
  })

  /**
   * #2142 — THE BURST IS ENTIRELY MOTION, which is what keeps it off the
   * critical CSS: every layer is mounted invisible from an inline style and gets
   * its whole visible life from a keyframe in the deferred sheet. A reader on
   * `reduce`, or one whose deferred sheet never arrives, therefore sees NO burst
   * rather than a frozen one — which is the required reduced-motion rendering.
   *
   * Counted rather than sampled: a layer that forgets its `opacity: 0` is a
   * spark, mote or halo stuck permanently on the plate, and it is invisible in
   * every review where the sheet did load.
   */
  it('rests every cast layer invisible, so reduced motion draws none of it (#2142)', () => {
    const html = renderToStaticMarkup(<CastBurst metal={METAL_SIGILS[3]} size={44} />)
    // 1 halo + 2 shock rings + 1 dial + 9 motes + 12 sparks.
    expect((html.match(/opacity:0/g) ?? []).length).toBe(25)
    expect(html).not.toContain('animation:')
    expect(html).not.toMatch(HEX)
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
    // The mount is the RULE brass since #2141's mark/rule split (#2142) — it is
    // a line, and the mark brass is reserved for things that are read.
    expect(html).toContain('background:var(--faction-ephemerists-plate-brass-rule)')
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
    expect(html).toContain('eph-metal-sheen')
    expect(html).not.toContain('animation:')
  })

  /**
   * #2142 — RANK 5 ORBITS THE SEVEN PLANETARY METALS.
   *
   * Six 3px gold dots called "iron filings" stood here, naming one metal and
   * drawing none. Twelve marks now cycle the seven classical correspondences at
   * 9px (`--text-sm`), `aria-hidden`, on the SHIPPED orbit of `radius + 13`: the
   * design's tighter `size / 2 + 6` crowds twelve 9px glyphs onto the rim, where
   * they compete with the platinum sigil inside it.
   */
  it('orbits rank 5 with twelve glyphs cycling the seven planets (#2142)', () => {
    mocks.user = currentUser()
    const html = render(5)
    for (const planet of ['\u2644', '\u2640', '\u263d', '\u2609', '\u263f', '\u2643', '\u2642']) {
      expect(html).toContain(planet)
    }
    // Twelve mounts over seven symbols: five of them are struck twice.
    expect((html.match(/eph-metal-filing/g) ?? []).length).toBe(12)
    // Label tier, not content tier — and a token, so the ratchet holds.
    expect(html).toContain('font-size:var(--text-sm)')
    // Only the fully transmuted disc draws them.
    expect(render(4)).not.toContain('eph-metal-filing')
  })

  /**
   * #2142 — THE PLATINUM SIGIL WAS MIRRORED. The compound is sun-with-dot on the
   * LEFT and crescent on the RIGHT; it shipped the other hand round, with the
   * dotted sun at x=15.6. Owner checked it against a reference image.
   *
   * The four sigils that were already correct are pinned by their opening move
   * as well, because "fix platinum" is exactly the edit that quietly renumbers a
   * neighbour — and a mirrored sigil renders perfectly.
   */
  it('draws platinum sun-left, crescent-right (#2142)', () => {
    const platinum = METAL_SIGILS[4].glyph
    // The sun and its dot open the path on the left; the crescent's big arc
    // follows on the right.
    expect(platinum).toContain('a1.15')
    expect(platinum.indexOf('M6.4')).toBeLessThan(platinum.indexOf('M16.8'))
    expect(platinum).not.toContain('15.6')
    expect(METAL_SIGILS.map((metal) => metal.glyph.slice(0, 8))).toEqual([
      'M6.2 7.4',
      'M12 4.4 ',
      'M15.8 4.',
      'M12 5 a7',
      'M6.4 7.2',
    ])
  })

  /**
   * #2142 — THE PLATE'S GROUND IS THE MASTHEAD BAND. The vote plate used to
   * have a blue of its own (`-vote-plate-from`) that belonged to no other
   * Ephemerists surface; the plate and the band are now one metal catching light
   * two ways. It is still a RECESS — the radial gradient and the inset top
   * shadow both survive, which is the half of the ruling that is easy to lose on
   * the way to "the plate goes flat".
   */
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
 * The cast burst is the loudest thing this widget does — a halo, two rings, a
 * turning dial, nine motes and twelve sparks, on the viewer's own click — so its
 * `prefers-reduced-motion` guard is an a11y floor rather than a polish item.
 * The component cannot be asked about it, because the guard lives in the
 * stylesheet. This is the seam.
 *
 * Partitioned by brace-counting rather than sliced by regex: `@media` blocks
 * nest, and a rule that merely sits NEAR a no-preference block reads as guarded
 * to anything shallower. A dropped `@media` opener is the exact failure — every
 * brace still balances, the stylesheet still builds, and the animation escapes
 * into the unguarded cascade.
 *
 * TWO SHEETS, ONE QUESTION (#2073). The ladder's animations live in
 * `src/motion.ornament.css`, delivered past first paint; the resting states are
 * in `index.css`. "Is the burst guarded, and is there no unguarded twin" is a
 * question about the pair, not about either file, so both are read and
 * concatenated — which is also what keeps the assertions honest, since an
 * unguarded `animation`, or a stray declaration for a cast layer, reintroduced
 * in EITHER sheet must still fail.
 *
 * ponytail: this partition function is copied from `#1630`'s block in
 * `pages/characterProfile/__tests__/factionProfileBody.test.tsx`, which is the
 * only other place asserting the guard from the stylesheet. Ceiling: two copies.
 * A third consumer should lift it to a shared `src/__tests__/` helper rather
 * than make it three.
 */
describe('#2142 the cast burst sits behind the reduced-motion guard', () => {
  const css = ['../../../index.css', '../../../motion.ornament.css']
    .map((sheet) => readFileSync(fileURLToPath(new URL(sheet, import.meta.url)), 'utf8'))
    .join('\n')

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
    // All six, because the burst is where a dropped gate would hurt most: it is
    // the loudest thing this widget does, and it fires on the viewer's own
    // click, which is precisely the moment a reader who asked for stillness is
    // looking at it.
    for (const layer of ['halo', 'ring', 'dial', 'mote', 'spark', 'sigil']) {
      const animates = new RegExp(`\\.eph-cast-${layer}\\s*\\{[^}]*animation`)
      expect(animates.test(GUARDED), `guarded .eph-cast-${layer}`).toBe(true)
      expect(animates.test(UNGUARDED), `UNguarded .eph-cast-${layer}`).toBe(false)
    }
  })

  it('leaves the cast NOTHING at rest — no stilled frame, no critical CSS', () => {
    // The inverse of the pre-#2142 assertion, and deliberately so. The ambient
    // ring had to survive the guard because its spoke pitch WAS the rank; the
    // cast burst is an event, so its stilled frame is correctly nothing at all.
    // Neither sheet may declare paint for it — the layers carry their box, their
    // ink and their `opacity: 0` inline, which is what keeps a ~1.6s ornament
    // off the render-blocking stylesheet entirely.
    for (const layer of ['halo', 'ring', 'dial', 'mote', 'spark', 'sigil']) {
      expect(UNGUARDED).not.toContain(`.eph-cast-${layer}`)
    }
  })

  it('retired the ray fan, the rail and the ambient ring with the scaffolding', () => {
    // Comments stripped first: the blocks in both sheets still NAME the retired
    // rules, which is how the next reader learns they were deleted rather than
    // mislaid. Only declarations count here.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const retired of [
      'eph-metal-ray',
      'eph-metal-rail',
      'eph-metal-current',
      // #2142. Both halves went: the keyframes and the gated rule in
      // motion.ornament.css, and the base rule that carried the conic gradient
      // and the mask in index.css.
      'eph-metal-burst',
    ]) {
      expect(declarations, retired).not.toContain(retired)
    }
  })
})
