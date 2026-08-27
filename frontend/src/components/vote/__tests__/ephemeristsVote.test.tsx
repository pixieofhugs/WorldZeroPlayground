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

import EphemeristsVote, { CastBurst, DISC_RUN } from '../EphemeristsVote'
import { METAL_SIGILS } from '../../factionMarks/ephemeristsPlate'
import { VOTE_REFRAMES, reframeLabel } from '../voteReframes'

/** No hex may reach the markup — every colour is a token. */
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

/** The critical sheet, where the plate's own spacing lives since #2236. */
const SHEET = readFileSync(fileURLToPath(new URL('../../../index.css', import.meta.url)), 'utf8')
/** The row's unconditional rule — the one outside the container query. */
const metalRow = () => SHEET.match(/^\.eph-metal-row \{[^}]*\}/m)?.[0] ?? ''
/** The container query's whole block — what the row does in a narrow plate. */
const narrowRow = () =>
  SHEET.slice(SHEET.indexOf('@container'), SHEET.indexOf('@container') + 320)

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
    // Both figures moved to `.eph-metal-row` in index.css (#2236) — they had to,
    // because an inline style beats a stylesheet and the narrow-plate rule that
    // yields them could not otherwise be written. Read there, so the clearance
    // is still asserted rather than quietly lost in the move.
    mocks.user = currentUser()
    expect(render(5)).toContain('class="eph-metal-row"')
    expect(metalRow()).toContain('gap: var(--space-lg) var(--space-xl)')
    expect(metalRow()).toContain('padding: var(--space-lg) var(--space-xl)')
  })

  /**
   * #2236 — THE DISCS ARE CIRCLES AT EVERY WIDTH.
   *
   * Reported from a phone: five ovals. The buttons carry a square `width` /
   * `height` and were ordinary flex items, so in any plate too narrow for the
   * row's intrinsic 370px they shrank on one axis only — ~31 × 44 at 402px,
   * which is out of round AND under the touch floor horizontally. Nothing about
   * the disc may give way (§6, WCAG ≥44): what yields is the spacing, and then
   * the line.
   *
   * The seam is split on purpose, because the harness has neither layout nor a
   * container. From the MARKUP: the discs are locked and the row may wrap. From
   * the STYLESHEET: the clearance is conditional on the plate's own width, not
   * the viewport's — the same widget sits on a phone and inside a 280px-floor
   * praxis card, so a media query would answer for one and lie about the other.
   */
  it('locks every disc out of round-losing shrink (#2236)', () => {
    mocks.user = currentUser()
    const html = render(5)
    // Five discs, five locks — the ovals were all five, not the odd one out.
    expect((html.match(/flex-shrink:0/g) ?? []).length).toBe(5)
    // Which is only safe because the row can spill onto a second line: locked
    // discs in a row that cannot wrap would be shaved by the plate's clip.
    expect(html).toContain('flex-wrap:wrap')
  })

  it('yields the clearance to the PLATE’s width, never the viewport’s (#2236)', () => {
    // The plate is the query container; the row is what answers.
    expect(SHEET).toContain('.eph-vote-plate { container-type: inline-size; }')
    expect(narrowRow()).toContain('.eph-metal-row')
    expect(narrowRow()).not.toContain('@media')
  })

  /**
   * #2315 — THE YIELD IS A RAMP, NOT A CLIFF, AND THAT IS THE WHOLE BUG.
   *
   * Reported as "voting icons are squished" on a narrow praxis card, with all
   * three of #2236's guards still in place. They are: nothing in either
   * stylesheet carries `flex-shrink` or `!important`, so the inline
   * `flex-shrink: 0` on each disc cannot be beaten and the discs are NOT
   * shrinking. What was wrong is the STEP.
   *
   * #2236 wrote one rung — the bottom one. The instant a plate dropped under
   * 372px the clearance fell from `--space-xl` (24) straight to `--space-xs`
   * (4), however much room the plate actually had: a 375px phone gives the
   * plate about 291px, where the five discs need 226 and there is room for
   * ~11px between them, and the row drew them 4px apart and dumped the other
   * 33px at the two ends via `justify-content: center`. Round discs, bunched
   * into the middle. That is what a reader calls squished.
   *
   * So the clearance is now a continuous function of the plate: the row seats
   * `DISC_RUN` of disc, four gaps and two end pads, which is `DISC_RUN + 6g`,
   * so `g = (100cqi − DISC_RUN) / 6` spends exactly the room there is. Clamped
   * to the same two rungs it moved between before, which makes the ramp meet
   * the un-queried rule EXACTLY at its ceiling — the query threshold stops
   * being a step at all.
   *
   * NOT MEASURED. This harness has no DOM and no layout, and there is no
   * browser here; the reproduction above is arithmetic over the sheet and the
   * component's own constants, and the render is eyeballing that is still owed.
   * What IS decidable is that the sheet's arithmetic and the component's agree.
   */
  it('spends the whole plate rather than dropping to one narrow rung (#2315)', () => {
    const narrow = narrowRow()
    // A ramp: one expression over the container's own inline size, floored and
    // capped at the two rungs the cliff used to jump between.
    expect(narrow, 'the clearance ramps').toContain('clamp(')
    expect(narrow, 'and it ramps against the PLATE').toContain('100cqi')
    expect(narrow, 'floor').toContain('var(--space-xs)')
    expect(narrow, 'ceiling').toContain('var(--space-xl)')
    // Gap and end padding are ONE figure, because a disc at the end of the row
    // wants the same air against the plate's edge as against its neighbour.
    expect(narrow).toMatch(/column-gap: var\(--eph-metal-air\)/)
    expect(narrow).toMatch(/padding-inline: var\(--eph-metal-air\)/)
    // The BLOCK padding is still off the query — it is the cast burst's
    // vertical clearance and never runs out — and so is the row gap, which is
    // what separates a wrapped ladder's two lines.
    expect(narrow).not.toContain('padding-block')
    expect(narrow).not.toContain('row-gap')
  })

  it('reads the disc run from the discs, so a resize cannot mis-space the row (#2315)', () => {
    // CSS cannot import a constant, so `DISC_RUN` is transcribed into the
    // sheet. This is the guard that transcription needs: change a disc size
    // without changing the sheet and the ramp silently spends the wrong room.
    expect(DISC_RUN, 'four discs and the haloed fifth').toBe(226)
    expect(narrowRow()).toContain(`${DISC_RUN}px`)
  })

  it('meets the wide rule exactly at the ramp’s ceiling, so the threshold is not a step (#2315)', () => {
    // Solving `DISC_RUN + 6g = W` at the ceiling gives the widest plate the
    // ramp still answers for. The query has to fire at or above it, or there
    // is a band where the row is queried but pinned — which is the cliff back.
    const rung = (name: string) =>
      Number(SHEET.match(new RegExp(`--space-${name}: (\\d+)px`))?.[1])
    const ceiling = DISC_RUN + 6 * rung('xl')
    expect(ceiling, 'the un-queried rule’s own intrinsic width').toBe(370)
    const threshold = Number(SHEET.match(/@container \(width < (\d+)px\)/)?.[1])
    expect(threshold).toBeGreaterThanOrEqual(ceiling)
    // And at the floor the row still seats all five before it has to wrap, so
    // the wrap stays the LAST resort rather than the common case.
    expect(DISC_RUN + 6 * rung('xs')).toBeLessThan(threshold)
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
   * #2235 REVERSES #2142 — THE PLATINUM SIGIL IS CRESCENT-LEFT.
   *
   * #2142 pinned this the other hand round, sun-with-dot LEFT and crescent
   * RIGHT, on an owner reference check. That ruling is WITHDRAWN: the classical
   * platinum compound puts the crescent on the LEFT with its back against a
   * sun-and-dot on the right, which is what the reference image on #2235 shows.
   * Do not "restore" #2142 as a regression fix.
   *
   * Measured, not matched: the crescent's cusps sit left of the sun's leftmost
   * point, so the compound reads moon-then-sun at every size. The four other
   * sigils are pinned by their opening move as well, because "fix platinum" is
   * exactly the edit that quietly renumbers a neighbour — and a mirrored sigil
   * renders perfectly.
   */
  it('draws platinum crescent-left, sun-right (#2235, reversing #2142)', () => {
    const platinum = METAL_SIGILS[4].glyph
    const parts = platinum.match(/M[^M]+/g) ?? []
    const startX = (d: string) => Number.parseFloat(d.slice(1))
    // Three subpaths: the crescent's two arcs, the sun's circle, and its dot.
    const crescent = parts.find((part) => part.includes('A6.5'))
    const sun = parts.find((part) => part.includes('a4.8'))
    const dot = parts.find((part) => part.includes('a1.15'))
    expect([crescent, sun, dot].every(Boolean)).toBe(true)
    // The crescent's cusps clear the sun entirely: centre less the 4.8 radius.
    expect(startX(crescent!)).toBeLessThan(startX(sun!) - 4.8)
    // Sun and dot are concentric — a dot off-centre reads as a second moon.
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
   * #2235 — LEAD READ AS A LOWERCASE "t". Right metal, wrong drawing: Saturn
   * is correct for lead and was never in question, but rank 1 shipped as one
   * hand-drawn scythe stroke with a bar through it, and was reported as a
   * letter rather than a sigil. Redrawn as the classical Saturn — a straight
   * stem, a crossbar crossing it near the top, and a bowl hanging off the stem
   * to the right.
   *
   * No test can prove a glyph is LEGIBLE: this harness has no layout, no
   * rasteriser and no eyes. What is assertable is the structure that makes the
   * mark a Saturn rather than a letter, and it is arithmetic on the path's own
   * coordinates.
   */
  it('draws lead as a Saturn — stem, crossing bar, bowl to the right (#2235)', () => {
    const [stem = '', bar = '', bowl = ''] = METAL_SIGILS[0].glyph.match(/M[^M]+/g) ?? []
    const [, stemX, stemTop, stemFoot] = /^M([\d.]+) ([\d.]+) V([\d.]+)/
      .exec(stem)!
      .map(Number)
    const [, barLeft, barY, barRight] = /^M([\d.]+) ([\d.]+) H([\d.]+)/.exec(bar)!.map(Number)
    // The bar CROSSES the stem — it overhangs on both sides.
    expect(barLeft).toBeLessThan(stemX)
    expect(barRight).toBeGreaterThan(stemX)
    // The stem rises above its bar and runs on well below it.
    expect(stemTop).toBeLessThan(barY)
    expect(stemFoot).toBeGreaterThan(barY + 8)
    // The bowl leaves the stem below the bar and swings clear to the right.
    const pairs = bowl.match(/[\d.]+ [\d.]+/g) ?? []
    const bowlXs = pairs.map((pair) => Number(pair.split(' ')[0]))
    const bowlYs = pairs.map((pair) => Number(pair.split(' ')[1]))
    expect(bowlXs[0]).toBe(stemX)
    expect(bowlYs[0]).toBeGreaterThan(barY)
    expect(Math.max(...bowlXs)).toBeGreaterThan(stemX + 3)
    // ...and stays inside the 24-unit square every sigil is drawn on.
    expect(Math.max(...bowlXs)).toBeLessThan(24)
    expect(Math.max(...bowlYs)).toBeLessThanOrEqual(stemFoot)
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
