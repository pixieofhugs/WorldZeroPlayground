/**
 * The Ephemerists score stamp reads WORKING-THEN-TOTAL, and its crown stops
 * being cut off (#2145, #2122).
 *
 * THE SEAM IS THE RENDERED MARKUP of `EphemeristsScoreStamp`
 * (`renderToStaticMarkup`; this repo has no jsdom, so effects never run and no
 * geometry is measurable) plus, for the compass rose's limb, the rose rendered
 * on its own at both sizes it is mounted at.
 *
 * ## Why the crown is asserted by ORDER and not by a subtree
 *
 * #2122 is a screenshot with no words: the Ephemerists task crown is sliced
 * along a diagonal. The cause is one CSS fact — **`clip-path` clips
 * descendants** — meeting one layout fact: the stamp's panel carried
 * `stepClip(7)` and the crown was a child of it, deliberately hung outside the
 * box at `top:-13 right:-12` so it overhangs. Everything outside the polygon is
 * cut, so the overhang is exactly the part that disappears.
 *
 * A string of markup cannot see a clip. What it CAN see is that a node appears
 * before the opening tag of the clipped element, and a descendant never can —
 * so `crown index < clip index` is a one-directional proof that the crown is
 * not inside the clipped panel. That is the whole fix and the whole assertion.
 *
 * THE FIX BELONGS HERE AND NOWHERE ELSE, which is a finding rather than an
 * assumption. `stepClip` has two consumers (this stamp and `EphemeristsVote`,
 * which mounts no crown), no other faction's stamp clips at all, and the one
 * other Ephemerists crown — `EphemeristsFactionBody`'s at `top:-14 right:-10`
 * — is already a sibling of the card inside a `position:relative` wrapper,
 * which is the shape this file adopts.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import i18n from '../../../../i18n'
import type { PraxisCardOut } from '../../../../api/praxis'
import EphemeristsScoreStamp from '../EphemeristsScoreStamp'
import { CompassRose } from '../../../factionMarks/ephemeristsPlate'

function praxis(overrides: Record<string, unknown>): PraxisCardOut {
  return {
    task_point_value: 12,
    display_multiplier: 1.5,
    metatask_points: 3,
    points_from_votes: 4,
    habit_bonus_points: 0,
    is_top_for_task: false,
    score: 26.5,
    ...overrides,
  } as PraxisCardOut
}

const render = (overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis(overrides)} />)

/** The rose's north needle — the mark only `CompassRose` draws. */
const NORTH = 'M50 8 L55.5 26 L44.5 26 Z'
/** The stepped octagon the rose replaces on this surface. */
const OCTAGON = 'M30 4 L70 4 L96 30'
/** `TaskCrown`'s own disc token — the crown, wherever it lands. */
const CROWN = 'var(--fdl-disc)'
/** The panel's chamfer, and the thing that was doing the cutting. */
const CLIP = 'clip-path:polygon(7px 0'

describe('the crown is not a child of the clipped panel (#2122)', () => {
  it('renders the crown BEFORE the clipped panel opens', () => {
    const html = render({ is_top_for_task: true })
    const crown = html.indexOf(CROWN)
    const clip = html.indexOf(CLIP)
    expect(crown, 'the crown is drawn at all').toBeGreaterThan(-1)
    expect(clip, 'the panel is still chamfered').toBeGreaterThan(-1)
    // A descendant cannot precede its ancestor's opening tag.
    expect(crown, 'the crown must sit outside the clip').toBeLessThan(clip)
  })

  it('still hangs the crown outside the panel, which is the design', () => {
    // The overhang is the point — #2122 is fixed by moving the clip, never by
    // pulling the crown inside the box or shrinking it.
    expect(render({ is_top_for_task: true })).toContain('top:-13px;right:-12px')
  })

  it('draws no crown when the praxis is not top for its task', () => {
    expect(render()).not.toContain(CROWN)
  })

  it('still lets the mounting surface suppress it (ADR-0028)', () => {
    const suppressed = renderToStaticMarkup(
      <EphemeristsScoreStamp praxis={praxis({ is_top_for_task: true })} showCrown={false} />,
    )
    expect(suppressed).not.toContain(CROWN)
  })
})

describe('the stamp reads working-then-total (#2145)', () => {
  it('strikes the total in the compass rose, not the stepped octagon', () => {
    const html = render()
    expect(html, 'the rose').toContain(NORTH)
    expect(html, 'the octagon it replaces').not.toContain(OCTAGON)
  })

  it('puts every working row ABOVE the rose', () => {
    const html = render()
    const rose = html.indexOf(NORTH)
    for (const row of ['card.stamp.base', 'card.stamp.mult', 'card.stamp.meta', 'card.stamp.votes']) {
      const at = html.indexOf(i18n.t(`praxis:${row}`))
      expect(at, `${row} is printed`).toBeGreaterThan(-1)
      expect(at, `${row} comes before the rose`).toBeLessThan(rose)
    }
  })

  it('lets the plate fall away when there is nothing but a total', () => {
    // `base === null` is `scoreBreakdown`'s own "no working at all" predicate.
    const bare = render({
      task_point_value: 10,
      display_multiplier: 1,
      metatask_points: 0,
      points_from_votes: 0,
      score: 10,
    })
    expect(bare, 'the rose stands alone').toContain(NORTH)
    expect(bare, 'no chamfered panel around an empty block').not.toContain(CLIP)
  })

  it('inks the metatask line in the ochre and the votes line in the quiet', () => {
    const html = render()
    // The foreign award, ochre — 4.97:1 light / 4.99:1 dark on the panel cell.
    expect(html).toContain('color:var(--faction-ephemerists-plate-ochre)')
    // NOT `-plate-band-quiet`, which is a DISC ink: 1.80:1 on this panel in
    // light. See the note in the stamp for the measurement.
    expect(html).toContain('color:var(--faction-ephemerists-plate-quiet)')
    // The ochre chip is gone: it was `-plate-disc` on `-plate-ochre`, 3.00:1,
    // at 11px — a normal-text pairing scraping the LARGE-text floor.
    expect(html).not.toContain('background:var(--faction-ephemerists-plate-ochre)')
  })

  it('sets the figure and its unit in the disc’s own two inks', () => {
    const html = render()
    expect(html, 'the total, 7.59:1 on the disc').toContain(
      'color:var(--faction-ephemerists-plate-band-ink)',
    )
    expect(html, 'the unit, 8.37:1 on the disc').toContain(
      'color:var(--faction-ephemerists-plate-band-quiet)',
    )
  })

  it('labels the total “points”, in English (#2145 §5)', () => {
    expect(render().replace(/<[^>]*>/g, '')).toContain(i18n.t('praxis:card.stamp.points'))
    expect(render()).not.toContain('PVNCTA')
  })
})

/**
 * THE LIMB (#2145 §1). 48 ticks at 7.5°, long every sixth, and only the eight
 * long ones below 100px — at the stamp's 84px the 40 short ticks render about
 * 0.4px each and the browser turns the limb into a grey wash.
 *
 * Counted off the rendered `d`, because the count IS the graduation: a limb
 * that drops to 24 ticks or forgets the size rule renders perfectly and is a
 * different instrument.
 */
describe('the compass rose carries a graduated limb (#2145)', () => {
  const rose = (size: number) => renderToStaticMarkup(<CompassRose size={size} />)
  const ticks = (html: string) => (html.match(/M[\d.]+ [\d.]+L[\d.]+ [\d.]+/g) ?? []).length

  it('draws all 48 at the task card’s 128px', () => {
    expect(ticks(rose(128))).toBe(48)
  })

  it('draws the eight long ones alone at the praxis card’s 84px', () => {
    expect(ticks(rose(84))).toBe(8)
  })

  it('keeps the full limb at the phone task card’s 112px', () => {
    expect(ticks(rose(112))).toBe(48)
  })

  it('rules the limb in the rule brass, which is one value in both themes', () => {
    expect(rose(128)).toContain('var(--faction-ephemerists-plate-brass-rule)')
  })

  it('moves the inner rim clear of the north needle’s tip', () => {
    // The tip is r42 (`M50 8`), so the r41 rim it shipped with ran through it.
    const html = rose(128)
    expect(html).toContain('r="43"')
    expect(html).not.toContain('r="41"')
  })

  it('retires the four ordinal ticks — every 45° is already a long one', () => {
    expect(rose(128)).not.toContain('M16.8 16.8')
  })
})
