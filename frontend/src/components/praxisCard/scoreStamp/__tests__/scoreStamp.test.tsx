/**
 * The score stamp's two halves (ADR-0047, ADR-0049).
 *
 * `scoreBreakdown` is the SHARED half: one selector deciding which rows any
 * faction's stamp may show. It had no test before #839 — the row rules lived
 * only in a docstring, which is exactly how #821 shipped nine skins that each
 * re-decided them. These cases pin the rules so a faction slice cannot quietly
 * drop a row.
 *
 * The dispatch cases pin the other half: the stamp resolves per faction with
 * `Default*` fall-through, like every other surface (ADR-0039).
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import type { PraxisCardOut } from '../../../../api/praxis'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import { scoreBreakdown, formatMult } from '../scoreBreakdown'
import DefaultScoreStamp from '../DefaultScoreStamp'
import EverymenScoreStamp from '../EverymenScoreStamp'
import EphemeristsScoreStamp from '../EphemeristsScoreStamp'
import SnideScoreStamp from '../SnideScoreStamp'
import SingularityScoreStamp from '../SingularityScoreStamp'
import WowScoreStamp from '../WowScoreStamp'
import CovenScoreStamp from '../CovenScoreStamp'
import UaScoreStamp from '../UaScoreStamp'

/** No hex may reach a stamp's markup — every colour is a token (ADR-0049). */
const HEX = /#[0-9a-fA-F]{3,8}\b/

/** Strip tags so a copy assertion cannot be satisfied by an attribute value. */
const text = (html: string) => html.replace(/<[^>]*>/g, '')

/**
 * Overrides are loosely typed on purpose: several cases below feed `null` into
 * fields the API declares non-nullable, which is exactly the defensive `?? 0`
 * path in `scoreBreakdown` that a wire-shape drift would otherwise hit unseen.
 */
function praxis(overrides: Record<string, unknown>): PraxisCardOut {
  return {
    base_points: 12,
    display_multiplier: 0.8,
    metatask_points: 0,
    points_from_votes: 4,
    total: 13.6,
    ...overrides,
  } as PraxisCardOut
}

describe('scoreBreakdown row selection (ADR-0047)', () => {
  it('reads the #819 breakdown fields straight through', () => {
    expect(scoreBreakdown(praxis({}))).toEqual({
      base: 12,
      mult: 0.8,
      meta: null,
      votes: 4,
      total: 13.6,
    })
  })

  it('hides the mult row at ×1.0 and when absent (collab)', () => {
    expect(scoreBreakdown(praxis({ display_multiplier: 1 })).mult).toBeNull()
    expect(scoreBreakdown(praxis({ display_multiplier: null })).mult).toBeNull()
  })

  it('hides the meta row at 0 or below, shows it above', () => {
    expect(scoreBreakdown(praxis({ metatask_points: 0 })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: null })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: 3 })).meta).toBe(3)
  })

  it('always keeps the votes row — +0 is a real value, not an absent one', () => {
    expect(scoreBreakdown(praxis({ points_from_votes: 0 })).votes).toBe(0)
  })

  it('never derives vote points by subtraction (the old Merit assumption)', () => {
    // total is authoritative and unrelated to base/votes arithmetic here.
    const rows = scoreBreakdown(praxis({ base_points: 12, points_from_votes: 4, total: 99 }))
    expect(rows.votes).toBe(4)
    expect(rows.total).toBe(99)
  })

  it('treats missing numerics as zero rather than NaN', () => {
    expect(
      scoreBreakdown(
        praxis({ base_points: null, points_from_votes: null, total: null }),
      ),
    ).toEqual({ base: 0, mult: 0.8, meta: null, votes: 0, total: 0 })
  })

  it('formats the multiplier to two decimals', () => {
    expect(formatMult(0.8)).toBe('×0.80')
    expect(formatMult(2)).toBe('×2.00')
  })
})

describe('scoreStamp surface dispatch (ADR-0049)', () => {
  it('falls through to the Default stamp for every slug that has not claimed it', () => {
    for (const slug of ['albescent', 'na', null]) {
      expect(pickVariant(surfaceMap('scoreStamp'), slug, DefaultScoreStamp)).toBe(DefaultScoreStamp)
    }
  })

  it('gives S.N.I.D.E. and Singularity their own stamps (#842)', () => {
    expect(pickVariant(surfaceMap('scoreStamp'), 'snide', DefaultScoreStamp)).toBe(SnideScoreStamp)
    expect(pickVariant(surfaceMap('scoreStamp'), 'singularity', DefaultScoreStamp)).toBe(
      SingularityScoreStamp,
    )
  })

  it('gives Everymen and the Ephemerists their own stamps (#841)', () => {
    expect(pickVariant(surfaceMap('scoreStamp'), 'everymen', DefaultScoreStamp)).toBe(
      EverymenScoreStamp,
    )
    expect(pickVariant(surfaceMap('scoreStamp'), 'ephemerists', DefaultScoreStamp)).toBe(
      EphemeristsScoreStamp,
    )
  })

  /**
   * The one dispatch pair worth naming explicitly. ADR-0050's whole failure mode
   * is these two slugs holding each other's presentation, and a swap here would
   * still resolve, still render, and still be wrong — so assert the identity of
   * each, not merely that both are claimed.
   */
  it('gives WOW the chronicle plate and Coven the sticker, not the reverse (#840)', () => {
    expect(pickVariant(surfaceMap('scoreStamp'), 'wow', DefaultScoreStamp)).toBe(WowScoreStamp)
    expect(pickVariant(surfaceMap('scoreStamp'), 'coven', DefaultScoreStamp)).toBe(CovenScoreStamp)
  })

  it('gives UA its own stamp — the ensō (#857)', () => {
    expect(pickVariant(surfaceMap('scoreStamp'), 'ua', DefaultScoreStamp)).toBe(UaScoreStamp)
  })
})

/**
 * The five conditional states of design v2, on both #841 stamps. The failure
 * mode this guards is not a missing row — `scoreBreakdown` is tested above —
 * but a stamp that stops READING as itself when a row drops out: a tally whose
 * subtotal rule floats with nothing above it, or a rubric with no working over
 * it. Each state must still print the total and its own device.
 */
describe('#841 stamps across the conditional states (ADR-0047)', () => {
  const STATES = [
    ['base only', { display_multiplier: 1, metatask_points: 0, points_from_votes: 0, total: 12 }],
    ['+ votes', { display_multiplier: 1, metatask_points: 0, points_from_votes: 4, total: 16 }],
    ['× mult', { display_multiplier: 0.8, metatask_points: 0, points_from_votes: 0, total: 9.6 }],
    ['+ metatask', { display_multiplier: 1, metatask_points: 20, points_from_votes: 0, total: 32 }],
    ['full formula', { display_multiplier: 0.8, metatask_points: 20, points_from_votes: 4, total: 29.6 }],
  ] as const

  for (const [name, fields] of STATES) {
    it(`Everymen prints the tally and the roundel — ${name}`, () => {
      const html = text(renderToStaticMarkup(<EverymenScoreStamp praxis={praxis({ ...fields })} />))
      expect(html).toContain('TALLY')
      expect(html).toContain('ON THE RECORD')
      // The roundel carries the total whichever rows are present.
      expect(html).toContain(fields.total.toFixed(1))
      // The votes row survives at 0 — the deliberate ADR-0047 deviation.
      expect(html).toContain('votes')
      expect(html).not.toMatch(HEX)
    })

    it(`Ephemerists prints the working and the rubric — ${name}`, () => {
      const html = text(
        renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis({ ...fields })} />),
      )
      expect(html).toContain('base')
      expect(html).toContain('from votes')
      expect(html).toContain(fields.total.toFixed(1))
      expect(html).not.toMatch(HEX)
    })

    it(`UA prints the score box and the ensō — ${name}`, () => {
      const markup = renderToStaticMarkup(<UaScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expect(html).toContain('base')
      // The votes row survives at 0 — the deliberate ADR-0047 deviation.
      expect(html).toContain('from votes')
      expect(html).toContain(fields.total.toFixed(1))
      expect(html).toContain('points')
      // The total mark is the ensō, masked from the asset and tinted by a token.
      expect(markup).toContain('/factionMarks/enso.svg')
      expect(markup).toContain('var(--faction-ua-card-enso)')
      expect(markup).not.toMatch(HEX)
    })
  }

  for (const [name, fields] of STATES) {
    it(`WOW prints the working and keeps the star — ${name}`, () => {
      const html = text(renderToStaticMarkup(<WowScoreStamp praxis={praxis({ ...fields })} />))
      expect(html).toContain('base')
      expect(html).toContain('from votes')
      expect(html).toContain(fields.total.toFixed(1))
      // The retired ✦ survives here and only here — see ADR-0050 / the design
      // README's carve-out. Losing it is half of what #840 exists to fix.
      expect(html).toContain('✦')
      expect(html).not.toMatch(HEX)
    })

    it(`Coven prints the working and keeps the sparkle — ${name}`, () => {
      const html = text(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ ...fields })} />))
      expect(html).toContain('base')
      expect(html).toContain('from votes')
      expect(html).toContain(fields.total.toFixed(1))
      expect(html).toContain('✨')
      expect(html).not.toMatch(HEX)
    })
  }

  /**
   * The sticker is not a rectangle and the plate is not upright — #821 replaced
   * both with the same level bordered box. Geometry, unlike copy, has no other
   * assertion that would catch it going flat again.
   */
  it('keeps each faction its own geometry: WOW struck at -2deg, Coven a dashed sticker at -3deg', () => {
    const wow = renderToStaticMarkup(<WowScoreStamp praxis={praxis({})} />)
    const coven = renderToStaticMarkup(<CovenScoreStamp praxis={praxis({})} />)
    expect(wow).toContain('rotate(-2deg)')
    expect(coven).toContain('rotate(-3deg)')
    expect(coven).toContain('dashed')
  })

  it('shows the UA multiplier chip only when a multiplier is live', () => {
    const withMult = text(
      renderToStaticMarkup(<UaScoreStamp praxis={praxis({ display_multiplier: 0.8 })} />),
    )
    const withoutMult = text(
      renderToStaticMarkup(<UaScoreStamp praxis={praxis({ display_multiplier: 1 })} />),
    )
    expect(withMult).toContain('×0.80')
    expect(withoutMult).not.toContain('×')
  })

  it('draws the UA grouped subtotal only when a metatask AND a multiplier are both live', () => {
    const full = text(
      renderToStaticMarkup(
        <UaScoreStamp praxis={praxis({ display_multiplier: 0.8, metatask_points: 20 })} />,
      ),
    )
    const metaOnly = text(
      renderToStaticMarkup(
        <UaScoreStamp praxis={praxis({ display_multiplier: 1, metatask_points: 20 })} />,
      ),
    )
    // (base + meta) = 32, under the plate's rule.
    expect(full).toContain('group')
    expect(full).toContain('32')
    expect(metaOnly).not.toContain('group')
  })

  it('draws the Everymen subtotal rule only when a metatask AND a multiplier are both live', () => {
    const full = text(
      renderToStaticMarkup(
        <EverymenScoreStamp praxis={praxis({ display_multiplier: 0.8, metatask_points: 20 })} />,
      ),
    )
    const metaOnly = text(
      renderToStaticMarkup(
        <EverymenScoreStamp praxis={praxis({ display_multiplier: 1, metatask_points: 20 })} />,
      ),
    )
    expect(full).toContain('group')
    expect(metaOnly).not.toContain('group')
  })
})

/**
 * The same five states on the #842 stamps, whose total marks are TYPOGRAPHIC —
 * a numeral carrying its own device rather than a drawn one. The failure mode
 * is the same: a working that stops reading as itself when a row drops out.
 * Both faction stamps also format the numbers in their own voice, which
 * ADR-0047 permits (it fixes which rows exist, not their notation), so the
 * assertions below are deliberately notation-aware.
 */
describe('#842 stamps across the conditional states (ADR-0047)', () => {
  const STATES = [
    ['base only', { display_multiplier: 1, metatask_points: 0, points_from_votes: 0, total: 12 }],
    ['+ votes', { display_multiplier: 1, metatask_points: 0, points_from_votes: 4, total: 16 }],
    ['× mult', { display_multiplier: 0.8, metatask_points: 0, points_from_votes: 0, total: 9.6 }],
    ['+ metatask', { display_multiplier: 1, metatask_points: 20, points_from_votes: 0, total: 32 }],
    ['full formula', { display_multiplier: 0.8, metatask_points: 20, points_from_votes: 4, total: 29.6 }],
  ] as const

  for (const [name, fields] of STATES) {
    it(`S.N.I.D.E. prints the working and the total in pts — ${name}`, () => {
      const html = text(renderToStaticMarkup(<SnideScoreStamp praxis={praxis({ ...fields })} />))
      expect(html).toContain('base')
      expect(html).toContain('from votes')
      expect(html).toContain(fields.total.toFixed(1))
      expect(html).toContain('pts')
      expect(html).not.toMatch(HEX)
    })

    it(`Singularity prints the register and the two-decimal total — ${name}`, () => {
      const html = text(
        renderToStaticMarkup(<SingularityScoreStamp praxis={praxis({ ...fields })} />),
      )
      expect(html).toContain('base')
      expect(html).toContain('tot')
      // The terminal pads its output: two decimals, and a zero-padded votes row.
      expect(html).toContain(fields.total.toFixed(2))
      expect(html).toContain(`+${String(fields.points_from_votes).padStart(2, '0')}`)
      expect(html).not.toMatch(HEX)
    })

    it(`the unaffiliated sheet prints the working and the total — ${name}`, () => {
      const html = text(renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ ...fields })} />))
      expect(html).toContain('base')
      expect(html).toContain('from votes')
      expect(html).toContain(fields.total.toFixed(1))
      expect(html).toContain('points')
      expect(html).not.toMatch(HEX)
    })
  }
})
