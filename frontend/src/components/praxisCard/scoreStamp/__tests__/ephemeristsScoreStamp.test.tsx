/**
 * The Ephemerists score stamp reads working-then-total, and its crown is not
 * clipped (#2145, #2122). Static markup only: no geometry is measurable.
 *
 * `clip-path` clips descendants, so the overhanging crown was cut. Markup cannot
 * see a clip, but a descendant can never precede its ancestor's opening tag, so
 * `crown index < clip index` proves the crown is outside the clipped panel.
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

/** The rose's north needle, drawn only by `CompassRose`. */
const NORTH = 'M50 8 L55.5 26 L44.5 26 Z'
/** The stepped octagon the rose replaces on this surface. */
const OCTAGON = 'M30 4 L70 4 L96 30'
/** `TaskCrown`'s disc token. */
const CROWN = 'var(--fdl-disc)'
/** The panel's chamfer clip. */
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
    // The overhang is the design (#2122). No root pad either (#2634 §5): see
    // the component header.
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
    // The multiplier is a wordless chip now (#2634, #2821).
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
    expect(html).toContain('color:var(--faction-ephemerists-plate-ochre)')
    // One ink per row (#2285); never the 1.78:1 `-plate-band-quiet`.
    expect(html).toContain('color:var(--faction-ephemerists-plate-caption)')
    expect(html).not.toContain('color:var(--faction-ephemerists-plate-quiet)')
    // The retired ochre chip was 3.00:1 at 11px.
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
    // The Latin cast is aria-hidden; English is the resting frame (#2148).
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
 * One arrangement for every line (#2285), asserted PER ROW against one shape so
 * a new row cannot arrive off-pattern: figure span before label span, shared
 * face and size, one colour per row. The grid is asserted once on the panel.
 */
describe('every line of the working reads figure-then-word (#2285)', () => {
  type Span = { style: string; text: string }

  const decl = (span: Span, prop: string) =>
    span.style.split(';').find((d) => d.startsWith(`${prop}:`)) ?? `no ${prop}`

  /**
   * A row, found by its label. The label cell is a gloss stack (#2148), so the
   * anchor is its `sr-only` copy; the cell is the styled span opening just
   * before it.
   */
  function row(html: string, label: string) {
    const marker = `<span class="sr-only">${label}</span>`
    const at = html.indexOf(marker)
    expect(at, `the ${label} row is printed`).toBeGreaterThan(0)
    const cellAt = html.lastIndexOf('<span style="', at)
    const style = html.slice(cellAt).match(/^<span style="([^"]*)"/)![1]
    // The figure cell is found by its voice (`FIGURE`'s face + `--text-xl`),
    // since the base cell now wraps the chip and is not a leaf (#2634).
    const figureAt = html.lastIndexOf('<span style="font-family:var(--font-faction-engraved);font-size:var(--text-xl)', cellAt)
    expect(figureAt, `the ${label} row's figure cell`).toBeGreaterThan(-1)
    const figureStyle = html.slice(figureAt).match(/^<span style="([^"]*)"/)![1]
    const inner = html.slice(figureAt).replace(/^<span style="[^"]*"[^>]*>/, '')
    const figureText = inner.slice(0, inner.search(/</))
    // The whole cell, tags stripped, for #2821's no-word guard.
    const figureAll = html.slice(figureAt, cellAt).replace(/<[^>]*>/g, '')
    return {
      figure: { style: figureStyle, text: figureText, all: figureAll },
      label: { style, text: label },
    }
  }

  const ROWS = [
    { label: 'base', figure: '18' },
    { label: 'meta', figure: '+3' },
    { label: 'votes', figure: '+4' },
    { label: 'habit', figure: '+2' },
  ]
  // Every row live at once, so the four can be compared.
  const html = render({ habit_bonus_points: 2, task_point_value: 18, display_multiplier: 1.5 })

  for (const { label, figure } of ROWS) {
    it(`puts the figure before the word on the ${label} row`, () => {
      const cells = row(html, label)
      expect(cells.figure.text, `${label}'s figure opens before its word`).toBe(figure)
    })

    it(`sets the ${label} row's figure and word in ONE ink`, () => {
      const cells = row(html, label)
      expect(decl(cells.figure, 'color')).toBe(decl(cells.label, 'color'))
    })

    it(`sets the ${label} row in the shared figure and label voices`, () => {
      const cells = row(html, label)
      expect(decl(cells.figure, 'font-family')).toBe('font-family:var(--font-faction-engraved)')
      expect(decl(cells.figure, 'font-size')).toBe('font-size:var(--text-xl)')
      expect(decl(cells.label, 'font-family')).toBe('font-family:var(--font-faction-engraved)')
      expect(decl(cells.label, 'font-size')).toBe('font-size:var(--text-md)')
    })
  }

  it('lays the cell out as two columns, figures against words', () => {
    expect(html).toContain('grid-template-columns:auto 1fr')
    expect(html, 'the base row no longer pushes its figure to the far end').not.toContain(
      'justify-content:space-between',
    )
  })

  it('keeps the multiplier out of the addition, on the base line (#2634)', () => {
    const cells = row(html, 'base')
    expect(cells.figure.text, 'the base figure still opens its own cell').toBe('18')
    expect(html, 'the ratio, in the number column').toContain('×1.50')
    // No word for it, read off the cell's SHAPE (#2821): `i18n.t` on a deleted
    // key returns its path, which would make an absence check vacuous. Do not
    // spell that path here: `factionCopyCollapse.test.ts` scans source raw.
    expect(cells.figure.all, 'the base cell is its figure and the ratio, no word').toBe('18×1.50')
    // The subtotal's brass rule spans both columns.
    expect(html).toContain('grid-column:1 / -1')
  })
})

/**
 * The limb (#2145 §1): 48 ticks at 7.5°, long every sixth, and only the eight
 * long ones below 100px (short ticks would render ~0.4px, a grey wash).
 * Counted off the rendered `d`: the count IS the instrument.
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
    // The needle tip is r42 (`M50 8`).
    const html = rose(128)
    expect(html).toContain('r="43"')
    expect(html).not.toContain('r="41"')
  })

  it('retires the four ordinal ticks — every 45° is already a long one', () => {
    expect(rose(128)).not.toContain('M16.8 16.8')
  })
})
