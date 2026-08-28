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
    // The 13px is now written against the panel's own clearance (#2634 §5):
    // the root pads above the brass mount, and an absolutely positioned child
    // resolves against that padding box, so the offset has to subtract it back
    // out or the ♛ floats in the new gap instead of overhanging the corner.
    expect(render({ is_top_for_task: true })).toContain(
      'top:calc(var(--space-sm) - 13px);right:-12px',
    )
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
    // `card.stamp.mult` left this list with #2634: the ratio is a bare chip on
    // the base line now and carries no word, exactly as it never did on the
    // three stamps that already drew one. The subtotal takes its place.
    const rows = [
      i18n.t('praxis:card.stamp.base'),
      i18n.t('praxis:card.stamp.subtotal'),
      i18n.t('praxis:card.stamp.meta'),
      i18n.t('praxis:card.stamp.votes'),
    ]
    for (const row of rows) {
      const at = html.indexOf(row)
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

  it('inks the metatask line in the ochre, and every other line in the caption', () => {
    const html = render()
    // The foreign award, ochre — 4.98:1 light / 4.99:1 dark on the panel cell.
    expect(html).toContain('color:var(--faction-ephemerists-plate-ochre)')
    // #2285 put each line's figure in its LABEL's colour, so the caption gold is
    // now the cell's ink and `-plate-quiet` has no reader here. It was never
    // `-plate-band-quiet`, a DISC ink measuring 1.78:1 on this panel in light.
    expect(html).toContain('color:var(--faction-ephemerists-plate-caption)')
    expect(html).not.toContain('color:var(--faction-ephemerists-plate-quiet)')
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

  it('labels the total “points”, in English (#2145 §5, #2148)', () => {
    // #2145's ruling was that this label is a CONSUMER of the faction's script
    // rotation and not a place to hardcode Latin, which #2148 made literal: the
    // Latin cast is in the markup, drawn by the shared gloss, but the English is
    // the resting frame and the only thing an assistive reader is offered.
    const html = render()
    const english = i18n.t('praxis:card.stamp.points', { count: 26.5 })
    expect(html).toContain(`<span class="sr-only">${english}</span>`)
    const at = html.indexOf('PVNCTA')
    const stack = html.lastIndexOf('class="eph-turn', at)
    expect(stack, 'the Latin cast is drawn by the shared gloss').toBeGreaterThan(0)
    expect(html.slice(stack, at), 'and that stack is aria-hidden').toContain('aria-hidden="true"')
  })
})

/**
 * ONE ARRANGEMENT FOR EVERY LINE (#2285).
 *
 * THE SEAM IS THE SAME RENDERED MARKUP, read as an ordered list of `<span>`s.
 * The defect is not that any one row is wrong — each was internally coherent —
 * but that the three rows of a three-term addition disagreed with each other:
 * base put its word first and its figure at the far end of a `space-between`
 * row, metatask put its word first and its figure beside it, the tally put its
 * figure first, and two of the three coloured a figure differently from its own
 * label. So the assertions below are made PER ROW against one shared shape,
 * which is what makes a fourth row (the habit bonus) unable to arrive
 * off-pattern: adding a row that disagrees fails the same three checks.
 *
 * A string of markup cannot see a column, but it can see everything the column
 * is made of: the figure's span opening before its label's, the same face and
 * size on every figure and on every label, and one colour inside a row. The
 * cell's `grid-template-columns` is asserted once, on the panel itself.
 */
describe('every line of the working reads figure-then-word (#2285)', () => {
  type Span = { style: string; text: string }

  const decl = (span: Span, prop: string) =>
    span.style.split(';').find((d) => d.startsWith(`${prop}:`)) ?? `no ${prop}`

  /**
   * A row, found by its label — the figure cell, and the label CELL.
   *
   * Since #2148 the word is a gloss stack inside the label cell, so that cell is
   * no longer a leaf and `spans()` cannot see it. The `sr-only` copy of the word
   * is the anchor instead: the label cell is the styled span that opens
   * immediately before it, and the figure is the last leaf that closed before
   * that. The row's VOICE is what these assertions read, and it still lives on
   * the cell — which is the point, since a per-cast font would be exactly the
   * drift #2285 forbids.
   */
  function row(html: string, label: string) {
    const marker = `<span class="sr-only">${label}</span>`
    const at = html.indexOf(marker)
    expect(at, `the ${label} row is printed`).toBeGreaterThan(0)
    const cellAt = html.lastIndexOf('<span style="', at)
    const style = html.slice(cellAt).match(/^<span style="([^"]*)"/)![1]
    // THE FIGURE CELL IS FOUND BY ITS VOICE, not as "the last leaf that closed"
    // (#2634). The base row's figure cell holds the ratio chip beside the
    // number now, so it is no longer a leaf and the old backwards scan returned
    // the CHIP's inner span — reporting `×1.50` at `--text-lg` as the base row's
    // figure and its voice. `FIGURE` spreads the deco face first, so the cell's
    // style string opens with it and no other span on the plate does.
    const figureAt = html.lastIndexOf('<span style="font-family:var(--font-faction-deco)', cellAt)
    expect(figureAt, `the ${label} row's figure cell`).toBeGreaterThan(-1)
    const figureStyle = html.slice(figureAt).match(/^<span style="([^"]*)"/)![1]
    const inner = html.slice(figureAt).replace(/^<span style="[^"]*"[^>]*>/, '')
    // The cell's own text, up to whatever it wraps — the chip, or nothing.
    const figureText = inner.slice(0, inner.search(/</))
    return { figure: { style: figureStyle, text: figureText }, label: { style, text: label } }
  }

  /** Base, the multiplier's two terms aside, and the three lines added to it. */
  const ROWS = [
    { label: 'base', figure: '18' },
    { label: 'meta', figure: '+3' },
    { label: 'votes', figure: '+4' },
    { label: 'habit', figure: '+2' },
  ]
  // 12 base points, ×1.5, +3 metatask, +4 votes, +2 habit — every row at once,
  // which is the only state in which the four can be compared to each other.
  const html = render({ habit_bonus_points: 2, task_point_value: 18, display_multiplier: 1.5 })

  for (const { label, figure } of ROWS) {
    it(`puts the figure before the word on the ${label} row`, () => {
      const cells = row(html, label)
      expect(cells.figure.text, `${label}'s figure opens before its word`).toBe(figure)
    })

    it(`sets the ${label} row's figure and word in ONE ink`, () => {
      // The ruling: the column position tells a number from its label, so
      // colour never has to — and no row may carry two.
      const cells = row(html, label)
      expect(decl(cells.figure, 'color')).toBe(decl(cells.label, 'color'))
    })

    it(`sets the ${label} row in the shared figure and label voices`, () => {
      const cells = row(html, label)
      // One face and one size across the figures...
      expect(decl(cells.figure, 'font-family')).toBe('font-family:var(--font-faction-deco)')
      expect(decl(cells.figure, 'font-size')).toBe('font-size:var(--text-xl)')
      // ...and one across the labels.
      expect(decl(cells.label, 'font-family')).toBe('font-family:var(--font-faction-engraved)')
      expect(decl(cells.label, 'font-size')).toBe('font-size:var(--text-md)')
    })
  }

  it('lays the cell out as two columns, figures against words', () => {
    // Per-row flexboxes cannot do this: each would size its own two columns.
    expect(html).toContain('grid-template-columns:auto 1fr')
    expect(html, 'the base row no longer pushes its figure to the far end').not.toContain(
      'justify-content:space-between',
    )
  })

  it('keeps the multiplier out of the addition, on the base line (#2634)', () => {
    // It is still a ratio in a ruled chip and still not a term being added —
    // what changed is where it stands. It rode a row of its own spanning both
    // columns; the owner ruled it onto the BASE line on all nine stamps, so it
    // sits in the number column beside the figure it multiplies, and the
    // subtotal's rule then has exactly one line above it.
    //
    // #2285's two-column read is intact: the chip is a NUMBER, so the word
    // column still holds nothing but words — which is also why the chip gave up
    // its `mult` label. A chip on the base line names itself.
    const cells = row(html, 'base')
    expect(cells.figure.text, 'the base figure still opens its own cell').toBe('18')
    expect(html, 'the ratio, in the number column').toContain('×1.50')
    expect(html, 'and no word for it').not.toContain(i18n.t('praxis:card.stamp.mult'))
    // The subtotal's brass rule is the one thing that spans both columns now.
    expect(html).toContain('grid-column:1 / -1')
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
