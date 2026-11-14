/**
 * One canonical stamp (#2634): row ORDER, the subtotal, and the total last.
 * ADR-0049 shared only row SELECTION, so nothing asserted a sequence; these are
 * `indexOf` comparisons on one render per skin.
 *
 *     base × mult      the multiplier is a CHIP on the base line
 *     ──────────       the subtotal rule, gated on `mult !== null` ALONE
 *       subtotal       base × mult
 *     + meta
 *     + votes
 *     + habit
 *     ━━━━━━━━━━       the SEPARATING rule (ADR-0076), gated on `base !== null`
 *     [total mark]
 *
 * The two rules have different gates; a praxis with working but no multiplier
 * draws the separating rule and no subtotal.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import '../../../../i18n'
import i18n from '../../../../i18n'
import praxisCatalog from '../../../../locales/en/praxis.json'
import type { PraxisCardOut } from '../../../../api/praxis'
import { scoreBreakdown } from '../scoreBreakdown'
import { formatPoints } from '../../../../utils/points'
import DefaultScoreStamp from '../DefaultScoreStamp'
import AlbescentScoreStamp from '../AlbescentScoreStamp'
import CovenScoreStamp from '../CovenScoreStamp'
import EphemeristsScoreStamp from '../EphemeristsScoreStamp'
import EverymenScoreStamp from '../EverymenScoreStamp'
import SingularityScoreStamp from '../SingularityScoreStamp'
import SnideScoreStamp from '../SnideScoreStamp'
import UaScoreStamp from '../UaScoreStamp'
import WowScoreStamp from '../WowScoreStamp'

function praxis(overrides: Record<string, unknown>): PraxisCardOut {
  return {
    task_point_value: 12,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    score: 12,
    ...overrides,
  } as PraxisCardOut
}

/** Strip tags so a copy assertion cannot be satisfied by an attribute value. */
const text = (html: string) => html.replace(/<[^>]*>/g, ' ')

/** Read from the catalog so a renamed key fails `tsc`, not vacuously. */
const LABEL = {
  base: i18n.t('praxis:card.stamp.base'),
  subtotal: i18n.t('praxis:card.stamp.subtotal'),
  meta: i18n.t('praxis:card.stamp.meta'),
  votes: i18n.t('praxis:card.stamp.votes'),
  habit: i18n.t('praxis:card.stamp.habit'),
}

/* ========================================================================== *
 * THE SHARED HALF
 * ========================================================================== */

describe('the subtotal is the multiplier applied to the base (#2634)', () => {
  it('is `base × mult`, and nothing else is folded into it', () => {
    // #2633: the metatask is outside the multiplier, so not in its result.
    const rows = scoreBreakdown(
      praxis({ task_point_value: 12, display_multiplier: 0.8, metatask_points: 20, score: 29.6 }),
    )
    expect(rows.subtotal).toBeCloseTo(9.6, 10)
  })

  it('is null exactly when the multiplier is — the gate is `mult` ALONE', () => {
    expect(scoreBreakdown(praxis({ display_multiplier: 1 })).subtotal).toBeNull()
    expect(
      scoreBreakdown(praxis({ display_multiplier: 1, metatask_points: 20, score: 32 })).subtotal,
    ).toBeNull()
    expect(
      scoreBreakdown(praxis({ display_multiplier: 0.8, metatask_points: 0, score: 9.6 })).subtotal,
    ).toBeCloseTo(9.6, 10)
  })

  it('survives a ×0.0 duel side, which is a live multiplier and not an absent one', () => {
    // ADR-0052: `0` is a live multiplier; a truthiness gate would drop it.
    const rows = scoreBreakdown(praxis({ display_multiplier: 0, score: 0 }))
    expect(rows.mult).toBe(0)
    expect(rows.subtotal).toBe(0)
  })

  it('needs no null branch for the base, because the two cannot disagree', () => {
    // `baseRestatesTotal` requires `mult === null`, so the chip always has a base row.
    for (const mult of [0, 0.8, 1.2, 2]) {
      const rows = scoreBreakdown(praxis({ display_multiplier: mult, score: 12 * mult }))
      expect(rows.base).not.toBeNull()
      expect(rows.subtotal).not.toBeNull()
    }
  })
})

/* ========================================================================== *
 * THE ORDER
 * ========================================================================== */

/**
 * `mark` proves the faction's own total device; not `formatPoints(total)`,
 * which could match a term equal to the total.
 */
const SKINS: {
  name: string
  render: (p: PraxisCardOut) => ReactElement
  /** The faction's total mark, as a markup fragment that appears exactly once. */
  mark: string
}[] = [
  { name: 'Default', render: (p) => <DefaultScoreStamp praxis={p} />, mark: 'spectrum-dial' },
  { name: 'Albescent', render: (p) => <AlbescentScoreStamp praxis={p} />, mark: 'spectrum-dial' },
  { name: 'Coven', render: (p) => <CovenScoreStamp praxis={p} />, mark: 'cvn-cauldron-sigil' },
  {
    name: 'Ephemerists',
    render: (p) => <EphemeristsScoreStamp praxis={p} />,
    mark: 'M50 8 L55.5 26 L44.5 26 Z',
  },
  { name: 'Everymen', render: (p) => <EverymenScoreStamp praxis={p} />, mark: 'ON THE RECORD' },
  {
    name: 'Singularity',
    render: (p) => <SingularityScoreStamp praxis={p} />,
    mark: '--faction-singularity-term-readout',
  },
  { name: 'Snide', render: (p) => <SnideScoreStamp praxis={p} />, mark: 'M27 12 C16 18 11 28 11 39' },
  { name: 'UA', render: (p) => <UaScoreStamp praxis={p} />, mark: '/factionMarks/enso.webp' },
  { name: 'WOW', render: (p) => <WowScoreStamp praxis={p} />, mark: '✦' },
]

/** Every term live at once — the state that exercises the whole sequence. */
const EVERYTHING = praxis({
  task_point_value: 12,
  display_multiplier: 0.8,
  metatask_points: 20,
  points_from_votes: 4,
  habit_bonus_points: 5,
  score: 38.6,
})

describe('every skin prints the working in ONE order (#2634)', () => {
  for (const { name, render, mark } of SKINS) {
    it(`${name} reads base, subtotal, meta, votes, habit, then its mark`, () => {
      const markup = renderToStaticMarkup(render(EVERYTHING))
      const flat = text(markup)
      const at = (needle: string) => {
        const index = flat.indexOf(needle)
        expect(index, `${name} prints ${JSON.stringify(needle)}`).toBeGreaterThan(-1)
        return index
      }
      const sequence: [string, number][] = [
        ['base', at(LABEL.base)],
        ['subtotal', at(LABEL.subtotal)],
        ['meta', at(LABEL.meta)],
        ['votes', at(LABEL.votes)],
        ['habit', at(LABEL.habit)],
      ]
      // Labels are positioned on TEXT: style tokens like `-row-base` would match markup.
      expect(markup.indexOf(mark), `${name} draws its own total mark`).toBeGreaterThan(-1)
      for (let i = 1; i < sequence.length; i += 1) {
        expect(
          sequence[i][1],
          `${name}: ${sequence[i][0]} must follow ${sequence[i - 1][0]}`,
        ).toBeGreaterThan(sequence[i - 1][1])
      }

      // Chip and base label may come in either order (Ephemerists is
      // figures-left, #2285); no other row may sit between them.
      const chipAt = at('×0.80')
      const baseAt = at(LABEL.base)
      const [lo, hi] = [Math.min(chipAt, baseAt), Math.max(chipAt, baseAt)]
      for (const [row, index] of sequence.slice(1)) {
        expect(
          index > lo && index < hi,
          `${name}: ${row} is printed between the base figure and its chip`,
        ).toBe(false)
      }
    })

    it(`${name} puts its total mark after the whole working`, () => {
      const markup = renderToStaticMarkup(render(EVERYTHING))
      const flat = text(markup)
      const lastLabel = Math.max(
        flat.indexOf(LABEL.base),
        flat.indexOf(LABEL.meta),
        flat.indexOf(LABEL.votes),
        flat.indexOf(LABEL.habit),
      )
      expect(flat.indexOf(formatPoints(38.6), lastLabel)).toBeGreaterThan(lastLabel)
    })

    it(`${name} draws no chip, no rule and no subtotal without a multiplier`, () => {
      // Full working, no multiplier: no subtotal.
      const flat = text(
        renderToStaticMarkup(
          render(
            praxis({
              display_multiplier: 1,
              metatask_points: 20,
              points_from_votes: 4,
              habit_bonus_points: 5,
              score: 41,
            }),
          ),
        ),
      )
      expect(flat, `${name} keeps its working`).toContain(LABEL.base)
      expect(flat, `${name} draws no chip`).not.toContain('×')
      expect(flat, `${name} draws no subtotal`).not.toContain(LABEL.subtotal)
    })

    it(`${name} prints the subtotal on a duel praxis with no metatask`, () => {
      const flat = text(
        renderToStaticMarkup(
          render(praxis({ display_multiplier: 0.8, metatask_points: 0, score: 9.6 })),
        ),
      )
      expect(flat).toContain(LABEL.subtotal)
      expect(flat).toContain('9.6')
      expect(flat, 'the float artifact never reaches the plate').not.toContain('9.600000')
    })
  }
})

/* ========================================================================== *
 * ONE COPY REGISTER
 * ========================================================================== */

describe('the ledger speaks in one register (#2634 ruling 4)', () => {
  it('holds exactly the keys the nine stamps still read', () => {
    // The two sentence keys and the multiplier's word are deleted (#2634,
    // #2821). Asserted as the whole SET off the catalog: never write a deleted
    // key literal here, since `factionCopyCollapse.test.ts` requires every
    // such string in source to resolve.
    expect(Object.keys(praxisCatalog.card.stamp).sort()).toEqual(
      [
        'base',
        'meta',
        'habit',
        'votes',
        'total',
        'subtotal',
        'tally',
        'onTheRecord',
        'points_one',
        'points_other',
        'pointsShort',
      ].sort(),
    )
  })

  for (const { name, render } of SKINS) {
    it(`${name} labels the two flat terms in the bare register`, () => {
      const flat = text(renderToStaticMarkup(render(EVERYTHING)))
      expect(flat).toContain(LABEL.votes)
      expect(flat).toContain(LABEL.habit)
      expect(flat, 'no prose survivor').not.toContain('from votes')
      expect(flat, 'no prose survivor').not.toContain('habit bonus')
      expect(flat, 'and no untranslated key').not.toContain('card.stamp.')
    })
  }
})
