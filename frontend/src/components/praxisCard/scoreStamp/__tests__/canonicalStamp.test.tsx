/**
 * ONE CANONICAL STAMP — the row ORDER, the subtotal, and where the total sits
 * (#2634).
 *
 * ## The seam
 *
 * `scoreBreakdown()` plus the nine rendered skins, read as static markup. That
 * pairing is the seam because the defect lived in the gap between them:
 * ADR-0049 gave the shared half row SELECTION and nothing else, so each skin
 * invented its own order, its own subtotal and its own labels for the same five
 * terms. Three orders, three subtotals and two copy registers coexisted for
 * months because nothing anywhere asserted a SEQUENCE — every existing case
 * checks which rows print, never in what order.
 *
 * So the assertions below are `indexOf` comparisons on one render, per skin. A
 * label appearing is not enough; it has to appear after the one above it and
 * before the one below it, and the total mark has to be last.
 *
 * The canonical stamp, from the owner's rulings of 2026-08-24:
 *
 *     base × mult      the multiplier is a CHIP on the base line, in all nine
 *     ──────────       the subtotal rule, gated on `mult !== null` ALONE
 *       subtotal       base × mult
 *     + meta
 *     + votes
 *     + habit
 *     ━━━━━━━━━━       the SEPARATING rule (ADR-0076), gated on `base !== null`
 *     [total mark]
 *
 * TWO RULES, ONE NEW. The subtotal rule is the one this issue adds to six
 * skins; the separating rule between the working block and the total mark is
 * ADR-0076's and is untouched (only na's MOVES, from over the working to under
 * it). Their gates are different and this file keeps them apart: the states
 * below deliberately include a praxis with working but no multiplier, which
 * draws the separating rule and no subtotal at all.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import '../../../../i18n'
import i18n from '../../../../i18n'
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

/**
 * The five shared row labels, read from the catalog rather than typed out —
 * `i18n`'s key type is generated from the JSON, so a renamed or deleted key
 * fails `tsc` here rather than turning an assertion vacuous.
 */
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
    // #2633: the model is `base × faction × duel + meta + votes + habit`, so the
    // metatask is NOT inside the multiplier and must not be inside its result.
    // The three hand-rolled subtotals all read `base + meta`, which was true
    // only under the formula that issue retired.
    const rows = scoreBreakdown(
      praxis({ task_point_value: 12, display_multiplier: 0.8, metatask_points: 20, score: 29.6 }),
    )
    expect(rows.subtotal).toBeCloseTo(9.6, 10)
  })

  it('is null exactly when the multiplier is — the gate is `mult` ALONE', () => {
    // Coven gated on `meta`, Everymen and UA on `meta && mult && base`. All
    // three are now one predicate, so a duel praxis with no metatask draws a
    // subtotal on every skin and a metatask with no multiplier draws none.
    expect(scoreBreakdown(praxis({ display_multiplier: 1 })).subtotal).toBeNull()
    expect(
      scoreBreakdown(praxis({ display_multiplier: 1, metatask_points: 20, score: 32 })).subtotal,
    ).toBeNull()
    expect(
      scoreBreakdown(praxis({ display_multiplier: 0.8, metatask_points: 0, score: 9.6 })).subtotal,
    ).toBeCloseTo(9.6, 10)
  })

  it('survives a ×0.0 duel side, which is a live multiplier and not an absent one', () => {
    // ADR-0052 — a Snide side that is currently behind legitimately shows ×0.00,
    // and `0` is a value. A truthiness gate anywhere would drop the row.
    const rows = scoreBreakdown(praxis({ display_multiplier: 0, score: 0 }))
    expect(rows.mult).toBe(0)
    expect(rows.subtotal).toBe(0)
  })

  it('needs no null branch for the base, because the two cannot disagree', () => {
    // `baseRestatesTotal` requires `mult === null`, so `mult !== null` implies
    // `base !== null`. The subtotal is therefore never orphaned from its own
    // base row, which is what lets a skin hang the chip off that row.
    for (const mult of [0, 0.8, 1.2, 2]) {
      const rows = scoreBreakdown(praxis({ display_multiplier: mult, score: 12 * mult }))
      expect(rows.base).not.toBeNull()
      expect(rows.subtotal).not.toBeNull()
    }
  })
})

/* ========================================================================== *
 * NO SKIN DOES ITS OWN ARITHMETIC
 * ========================================================================== */

describe('the subtotal is computed once, in the shared half (#2634)', () => {
  const dir = fileURLToPath(new URL('../', import.meta.url))
  const skins = readdirSync(dir).filter(
    (name) => name.endsWith('ScoreStamp.tsx') && name !== 'ScoreStamp.tsx',
  )

  it('finds all nine skins, so absence cannot be vacuous', () => {
    expect(skins).toHaveLength(9)
  })

  for (const name of skins) {
    it(`${name} derives no subtotal of its own`, () => {
      // COMMENTS ARE STRIPPED FIRST, and that is load-bearing rather than
      // tidy: several of these docblocks QUOTE `base + meta` while recording
      // what replaced it and why, so a raw scan would fail on the very prose
      // that documents the fix. Block comments and line comments both go; no
      // string literal in these files contains a comment opener.
      const code = readFileSync(`${dir}${name}`, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      expect(code, 'the old `base + meta`, true only under the pre-#2633 formula').not.toMatch(
        /\bbase\b\s*\+/,
      )
      expect(code, 'a locally multiplied base').not.toMatch(/\bbase\b\s*\*/)
      expect(code, 'the resolver is the only source of the figure').not.toMatch(
        /\(base\s*\?\?\s*0\)/,
      )
    })
  }
})

/* ========================================================================== *
 * THE ORDER
 * ========================================================================== */

/**
 * Each skin, with the words it prints for the four labelled rows. The stamps do
 * NOT share a copy register for the chip or the total — the chip is bare `×n`
 * everywhere and the total mark is the faction's device — so those two are
 * matched on their own tells rather than on a label.
 *
 * `total` is the fragment that proves the faction's own mark; it must come
 * LAST. It is deliberately not `formatPoints(total)`: on a state where a term
 * happens to equal the total the figure would match twice.
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
    /**
     * The sequence, as `[what, where]`. Positions are read off the TEXT for
     * labels and off the MARKUP for the mark, so the two are looked up on the
     * render each case makes.
     */
    it(`${name} reads base, subtotal, meta, votes, habit, then its mark`, () => {
      const markup = renderToStaticMarkup(render(EVERYTHING))
      const flat = text(markup)
      // The chip is bare — the operation, not a labelled term (the shape UA,
      // S.N.I.D.E. and WOW already drew and the other six adopt).
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
      // Positions are read off the TEXT, never the markup:
      // `--faction-coven-slip-row-base` and `-row-votes` are style-attribute
      // tokens a markup `indexOf` would find long before the row itself.
      expect(markup.indexOf(mark), `${name} draws its own total mark`).toBeGreaterThan(-1)
      for (let i = 1; i < sequence.length; i += 1) {
        expect(
          sequence[i][1],
          `${name}: ${sequence[i][0]} must follow ${sequence[i - 1][0]}`,
        ).toBeGreaterThan(sequence[i - 1][1])
      }

      // THE CHIP RIDES THE BASE LINE, asserted as "nothing else is between the
      // two" rather than as "the chip follows the label". Which comes first
      // inside the row is the skin's own drawing and two of the nine differ:
      // the Ephemerists cell is figures-left/words-right by #2285's ruling, so
      // its `×0.80` is printed before the word `base`. What the canonical stamp
      // fixes is that no OTHER row may come between them — that is what makes
      // the subtotal's rule have exactly one line above it.
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
      // Ruling 4 — totals sit at the bottom. na/Albescent was the only violator:
      // the ring stood above the rows and the tally hung below it as prose.
      const markup = renderToStaticMarkup(render(EVERYTHING))
      const flat = text(markup)
      const lastLabel = Math.max(
        flat.indexOf(LABEL.base),
        flat.indexOf(LABEL.meta),
        flat.indexOf(LABEL.votes),
        flat.indexOf(LABEL.habit),
      )
      // Compare on TEXT positions: the mark's own caption is the last words the
      // stamp prints, which is what "the total sits at the bottom" means to a
      // reader and to a screen reader alike.
      expect(flat.indexOf(formatPoints(38.6), lastLabel)).toBeGreaterThan(lastLabel)
    })

    it(`${name} draws no chip, no rule and no subtotal without a multiplier`, () => {
      // Ruling 2 — the subtotal is gated on `mult !== null` ALONE, which in era 1
      // is every non-duel praxis. Metatask, votes and habit are all live here, so
      // this is a full working block that still has no subtotal in it.
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
      // The state Coven, Everymen and UA all used to miss: a multiplier with
      // nothing added to the base. `9.6` is `12 × 0.80` through `formatPoints`,
      // which is what keeps `9.600000000000001` off the plate.
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
  it('the two prose keys are gone from the catalog', () => {
    // `card.stamp.fromVotes` ("+ 4 from votes") and `card.stamp.habitBonus`
    // ("+ 5 habit bonus") had four readers between them and the other five skins
    // used the bare labels. i18next returns the KEY when a string is missing, so
    // a surviving reader would print `card.stamp.fromVotes` and fail below.
    expect(i18n.exists('praxis:card.stamp.fromVotes')).toBe(false)
    expect(i18n.exists('praxis:card.stamp.habitBonus')).toBe(false)
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
