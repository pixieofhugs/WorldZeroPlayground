/**
 * Score stamp (ADR-0047, ADR-0049, ADR-0076): `scoreBreakdown`'s shared row
 * rules (#839), and per-faction dispatch with `Default*` fall-through.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import type { PraxisCardOut, PraxisOut } from '../../../../api/praxis'
import type { ScoreStampProps } from '../ScoreStamp'
import { resolveVariant } from '../../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../../factions/lazyArchetype'
import { surfaceMap } from '../../../../factions'
import { scoreBreakdown, formatMult } from '../scoreBreakdown'
import { formatPoints } from '../../../../utils/points'
import { applyCastTally } from '../../../vote/useVotedPraxis'
import { recordCastTally, castTally, __resetCastTallies } from '../../../../utils/castTallies'
import ScoreStamp from '../ScoreStamp'
import DefaultScoreStamp from '../DefaultScoreStamp'
import EverymenScoreStamp from '../EverymenScoreStamp'
import EphemeristsScoreStamp from '../EphemeristsScoreStamp'
import SnideScoreStamp from '../SnideScoreStamp'
import SingularityScoreStamp from '../SingularityScoreStamp'
import WowScoreStamp from '../WowScoreStamp'
import CovenScoreStamp from '../CovenScoreStamp'
import UaScoreStamp from '../UaScoreStamp'
import AlbescentScoreStamp from '../AlbescentScoreStamp'

/** No hex may reach a stamp's markup — every colour is a token (ADR-0049). */
const HEX = /#[0-9a-fA-F]{3,8}\b/

/** Strip tags so attribute values can't satisfy a copy assertion. */
const text = (html: string) => html.replace(/<[^>]*>/g, '')

/** Loosely typed: some cases feed `null` to non-nullable fields (the `?? 0` path). */
function praxis(overrides: Record<string, unknown>): PraxisCardOut {
  return {
    task_point_value: 12,
    display_multiplier: 0.8,
    metatask_points: 0,
    points_from_votes: 4,
    habit_bonus_points: 0,
    score: 13.6,
    ...overrides,
  } as PraxisCardOut
}

describe('scoreBreakdown row selection (ADR-0053)', () => {
  it('reads the breakdown fields straight through', () => {
    expect(scoreBreakdown(praxis({}))).toEqual({
      base: 12,
      mult: 0.8,
      meta: null,
      habit: null,
      votes: 4,
      // The raw product (#2634): rounding belongs to `formatPoints`.
      subtotal: 12 * 0.8,
      total: 13.6,
    })
  })

  it('hides the mult row at exactly 1.0', () => {
    expect(scoreBreakdown(praxis({ display_multiplier: 1 })).mult).toBeNull()
  })

  it('shows a 0.0 multiplier — a losing Snide duel side is not a hidden row', () => {
    // ADR-0053: ×0.0 is a real, live value.
    expect(scoreBreakdown(praxis({ display_multiplier: 0, score: 4 })).mult).toBe(0)
  })

  it('hides the meta row at 0 or below, shows it above', () => {
    expect(scoreBreakdown(praxis({ metatask_points: 0 })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: null })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: 3 })).meta).toBe(3)
  })

  it('drops the votes row at zero and keeps it above (ADR-0076)', () => {
    expect(scoreBreakdown(praxis({ points_from_votes: 0 })).votes).toBeNull()
    expect(scoreBreakdown(praxis({ points_from_votes: 4 })).votes).toBe(4)
  })

  /** #1131: with nothing moving the figure, base would only restate the total. */
  it('hides the base row when it would only restate the total', () => {
    const bare = praxis({
      task_point_value: 10,
      display_multiplier: 1,
      metatask_points: 0,
      points_from_votes: 0,
      habit_bonus_points: 0,
      score: 10,
    })
    expect(scoreBreakdown(bare)).toEqual({
      base: null,
      mult: null,
      meta: null,
      habit: null,
      votes: null,
      // No multiplier, no subtotal (#2634).
      subtotal: null,
      total: 10,
    })
  })

  it('brings the base row back the moment any term moves the figure', () => {
    const bare = { task_point_value: 10, display_multiplier: 1, metatask_points: 0, points_from_votes: 0 }
    expect(scoreBreakdown(praxis({ ...bare, points_from_votes: 4, score: 14 })).base).toBe(10)
    expect(scoreBreakdown(praxis({ ...bare, metatask_points: 3, score: 13 })).base).toBe(10)
    expect(scoreBreakdown(praxis({ ...bare, display_multiplier: 1.1, score: 11 })).base).toBe(10)
  })

  it('keeps the base row when the score disagrees with its own terms', () => {
    // A drifted score must stay legible, not collapse into one mark.
    const drifted = praxis({
      task_point_value: 10,
      display_multiplier: 1,
      metatask_points: 0,
      points_from_votes: 0,
      habit_bonus_points: 0,
      score: 99,
    })
    expect(scoreBreakdown(drifted).base).toBe(10)
  })

  it('never derives vote points by subtraction (the old Merit assumption)', () => {
    // score is authoritative and unrelated to base/votes arithmetic here.
    const rows = scoreBreakdown(praxis({ task_point_value: 12, points_from_votes: 4, score: 99 }))
    expect(rows.votes).toBe(4)
    expect(rows.total).toBe(99)
  })

  it('treats missing numerics as zero rather than NaN', () => {
    expect(
      scoreBreakdown(
        praxis({ task_point_value: null, points_from_votes: null, score: null }),
      ),
    ).toEqual({
      base: 0,
      mult: 0.8,
      meta: null,
      habit: null,
      votes: null,
      subtotal: 0,
      total: 0,
    })
  })

  it('formats the multiplier to two decimals', () => {
    expect(formatMult(0.8)).toBe('×0.80')
    expect(formatMult(2)).toBe('×2.00')
  })
})

/**
 * #1617: UA's habit bonus is FLAT and outside the multiplier:
 * `(base + meta) × mult + votes + habit` (`backend/schemas/praxis.py`).
 */
describe('the habit bonus is a term of the breakdown (#1617)', () => {
  it('reads the bonus through as its own row', () => {
    expect(scoreBreakdown(praxis({ habit_bonus_points: 5, score: 18.6 })).habit).toBe(5)
  })

  /** The bonus is 0 almost everywhere, so a `+0 habit` row would mean nothing. */
  it('hides the row at 0 or below — the default on every faction but UA', () => {
    expect(scoreBreakdown(praxis({ habit_bonus_points: 0 })).habit).toBeNull()
    expect(scoreBreakdown(praxis({ habit_bonus_points: null })).habit).toBeNull()
    expect(scoreBreakdown(praxis({ habit_bonus_points: 5 })).habit).toBe(5)
  })

  it('brings the base row back when the bonus is the only term moving the figure', () => {
    const habitOnly = praxis({
      task_point_value: 10,
      display_multiplier: 1,
      metatask_points: 0,
      points_from_votes: 0,
      habit_bonus_points: 5,
      score: 15,
    })
    // Otherwise 10 of the 15 would be unaccounted for.
    expect(scoreBreakdown(habitOnly).base).toBe(10)
  })
})

describe('useVotedPraxis merge feeds the stamp breakdown (#912)', () => {
  beforeEach(() => {
    __resetCastTallies()
  })

  it('moves both the votes row and the total on a fresh cast, before any refetch', () => {
    const base = praxis({ id: 1, voter_count: 2, points_from_votes: 4, score: 13.6 })
    // What the POST returns for a first cast of 5 here (#1382).
    recordCastTally(1, { points_from_votes: 9, voter_count: 3 })
    const tally = castTally(1)
    if (!tally) throw new Error('expected a published cast tally')
    const voted = applyCastTally(base, tally)
    expect(scoreBreakdown(voted)).toEqual(
      expect.objectContaining({ votes: 9, total: 18.6 }),
    )
  })
})

/**
 * #1444: no stamp on a praxis that banked nothing (`failed`/`hidden`, per
 * `_UNSCORED_MODERATION_STATUSES`). Gated on the dispatcher so every surface
 * showing a total obeys it. The visible case proves it isn't "hide always".
 */
describe('the stamp leaves an unscored praxis (#1444)', () => {
  /** `task_faction_slug: null` resolves to the eagerly-imported Default stamp. */
  const unscorable = (moderation_status: string) =>
    praxis({ moderation_status, task_faction_slug: null, is_top_for_task: false })

  it('renders nothing on a failed praxis — the banner is the honest signal', () => {
    expect(renderToStaticMarkup(<ScoreStamp praxis={unscorable('failed')} />)).toBe('')
  })

  it('renders nothing on a hidden praxis — the other half of the same pair', () => {
    expect(renderToStaticMarkup(<ScoreStamp praxis={unscorable('hidden')} />)).toBe('')
  })

  it('still stamps a visible praxis — otherwise the gate is "hide always"', () => {
    const html = text(renderToStaticMarkup(<ScoreStamp praxis={unscorable('visible')} />))
    expect(html).toContain('13.6')
    expect(html).toContain('points')
  })

  it('still stamps a flagged praxis — a flag is awaiting a ruling, not a ruling', () => {
    // A flag awaits a ruling; the praxis still counts.
    expect(text(renderToStaticMarkup(<ScoreStamp praxis={unscorable('flagged')} />))).toContain(
      '13.6',
    )
  })
})

describe('scoreStamp surface dispatch (ADR-0049)', () => {
  it('falls through to the Default stamp for every slug that has not claimed it', () => {
    for (const slug of ['na', null]) {
      expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), slug))).toBe(DefaultScoreStamp)
    }
  })

  it('gives Albescent its own stamp — the last roster faction to claim one (#2501)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'albescent'))).toBe(
      AlbescentScoreStamp,
    )
  })

  it('wraps the na stamp WHOLE — the hook element and nothing else (epic ruling 4)', () => {
    // "Upgrade, never replace": the na stamp wrapped whole in one hook class.
    const scored = praxis({
      task_faction_slug: 'albescent',
      is_top_for_task: false,
      moderation_status: 'visible',
    })
    const props = { praxis: scored } as unknown as ScoreStampProps
    const dressed = renderToStaticMarkup(<AlbescentScoreStamp {...props} />)
    expect(dressed).toBe(
      `<div class="alb-stamp alb-moves">${renderToStaticMarkup(<DefaultScoreStamp {...props} />)}</div>`,
    )
    // Equality can't see the cascade's mounts; assert they sit under the hook.
    expect(dressed, 'the rule over the working the spectrum rule travels on').toContain(
      'spectrum-rule',
    )
    expect(dressed, 'the annulus the spectrum dial turns').toContain('spectrum-dial')
  })

  it('gives S.N.I.D.E. and Singularity their own stamps (#842)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'snide'))).toBe(SnideScoreStamp)
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'singularity'))).toBe(
      SingularityScoreStamp,
    )
  })

  it('gives Everymen and the Ephemerists their own stamps (#841)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'everymen'))).toBe(
      EverymenScoreStamp,
    )
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'ephemerists'))).toBe(
      EphemeristsScoreStamp,
    )
  })

  /** ADR-0050: these two once swapped presentations; assert each identity. */
  it('gives WOW the chronicle plate and Coven the sticker, not the reverse (#840)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'wow'))).toBe(WowScoreStamp)
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'coven'))).toBe(CovenScoreStamp)
  })

  it('gives UA its own stamp — the ensō (#857)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'ua'))).toBe(UaScoreStamp)
  })
})

/**
 * Design v2's five states. `showsBase` is false only for base-only (#1131) and
 * doubles as "has working" (gates the separating rule); `showsVotes` is
 * ADR-0076's separate flag.
 */
const STATES = [
  {
    name: 'base only',
    fields: { display_multiplier: 1, metatask_points: 0, points_from_votes: 0, score: 12 },
    showsBase: false,
    showsVotes: false,
  },
  {
    name: '+ votes',
    fields: { display_multiplier: 1, metatask_points: 0, points_from_votes: 4, score: 16 },
    showsBase: true,
    showsVotes: true,
  },
  {
    name: '× mult',
    fields: { display_multiplier: 0.8, metatask_points: 0, points_from_votes: 0, score: 9.6 },
    showsBase: true,
    showsVotes: false,
  },
  {
    name: '+ metatask',
    fields: { display_multiplier: 1, metatask_points: 20, points_from_votes: 0, score: 32 },
    showsBase: true,
    showsVotes: false,
  },
  {
    name: 'full formula',
    fields: { display_multiplier: 0.8, metatask_points: 20, points_from_votes: 4, score: 29.6 },
    showsBase: true,
    showsVotes: true,
  },
] as const

/** Label present exactly when the resolver kept the figure. */
function expectBaseRow(html: string, showsBase: boolean, baseLabel = 'base') {
  if (showsBase) expect(html).toContain(baseLabel)
  else expect(html).not.toContain(baseLabel)
}

/** Same for the tally (ADR-0076). */
function expectVotesRow(html: string, showsVotes: boolean, votesLabel = 'votes') {
  if (showsVotes) expect(html).toContain(votesLabel)
  else expect(html).not.toContain(votesLabel)
}

/** Ephemerists use the shared labels since #1909 cut their kanji. */
const EPHEMERISTS_LABEL = { base: 'base', points: 'points', votes: 'votes' } as const

/** Coven's arched Points plate (#2019); drawn only when there is working. */
const COVEN_ARCH = '92px 92px 20px 20px / 108px 108px 20px 20px'

/** Each state must still print the total and the stamp's own device. */
describe('#841 stamps across the conditional states (ADR-0047)', () => {
  for (const { name, fields, showsBase, showsVotes } of STATES) {
    it(`Everymen prints the tally and the roundel — ${name}`, () => {
      const html = text(renderToStaticMarkup(<EverymenScoreStamp praxis={praxis({ ...fields })} />))
      // No working, no TALLY header (ADR-0076).
      if (showsBase) expect(html).toContain('TALLY')
      else expect(html).not.toContain('TALLY')
      expect(html).toContain('ON THE RECORD')
      expect(html).toContain(formatPoints(fields.score))
      expectVotesRow(html, showsVotes)
      expectBaseRow(html, showsBase)
      expect(html).not.toMatch(HEX)
    })

    it(`Ephemerists prints the working and the rubric — ${name}`, () => {
      const html = text(
        renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis({ ...fields })} />),
      )
      expectBaseRow(html, showsBase, EPHEMERISTS_LABEL.base)
      expectVotesRow(html, showsVotes, EPHEMERISTS_LABEL.votes)
      expect(html).toContain(formatPoints(fields.score))
      expect(html).not.toMatch(HEX)
    })

    it(`UA prints the score box and the ensō — ${name}`, () => {
      const markup = renderToStaticMarkup(<UaScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // The ruled plate holds the working (ADR-0076).
      if (showsBase) expect(markup).toContain('--faction-ua-card-box-bg')
      else expect(markup).not.toContain('--faction-ua-card-box-bg')
      expect(html).toContain(formatPoints(fields.score))
      expect(html).toContain('points')
      // The total mark is the ensō, masked from the asset and tinted by a token.
      expect(markup).toContain('/factionMarks/enso.webp')
      expect(markup).toContain('var(--faction-ua-card-enso)')
      expect(markup).not.toMatch(HEX)
    })
  }

  for (const { name, fields, showsBase, showsVotes } of STATES) {
    it(`WOW prints the working and keeps the star — ${name}`, () => {
      const markup = renderToStaticMarkup(<WowScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // The hairline goes with the working; matched on the gradient (✦ is gold too).
      if (showsBase) expect(markup).toContain('linear-gradient(90deg')
      else expect(markup).not.toContain('linear-gradient(90deg')
      expect(html).toContain(formatPoints(fields.score))
      // The ✦ survives only here (ADR-0050, #840).
      expect(html).toContain('✦')
      expect(html).not.toMatch(HEX)
    })

    it(`Coven prints the working and keeps the cauldron — ${name}`, () => {
      const markup = renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // The plate is drawn only when there is working (ADR-0076).
      if (showsBase) expect(markup).toContain(COVEN_ARCH)
      else expect(markup).not.toContain(COVEN_ARCH)
      expect(markup).not.toContain('cvn-braid')
      expect(html).toContain(formatPoints(fields.score))
      // The cauldron is the total mark now (#2019).
      expect(html).not.toContain('✨')
      expect(markup).toContain('cvn-cauldron-sigil')
      expect(html).not.toMatch(HEX)
    })
  }

  /** #1207: the Ephemerists stamp moved off the codex (`--eph-*`) to the plate family. */
  it('strikes the Ephemerists total in the plate compass rose, not the codex rubric', () => {
    const markup = renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis({})} />)
    expect(markup).toContain('--faction-ephemerists-plate-')
    expect(markup).not.toMatch(/--eph-[a-z]/)
    // The shared `CompassRose` (#2145; #2042: one points mark per faction).
    expect(markup).toContain('M50 8 L55.5 26 L44.5 26 Z')
    expect(markup).not.toContain('M30 4 L70 4 L96 30')
    // The codex's stuck-label tilt is gone: this cell is cut, not stuck on.
    expect(markup).not.toContain('rotate(-1deg)')
  })

  /** Geometry has no other guard against going flat again (#821). */
  it('keeps each faction its own geometry: WOW struck at -2deg, Coven arched over a cauldron', () => {
    const wow = renderToStaticMarkup(<WowScoreStamp praxis={praxis({})} />)
    const coven = renderToStaticMarkup(<CovenScoreStamp praxis={praxis({})} />)
    expect(wow).toContain('rotate(-2deg)')
    // #2019: Coven's plate stands upright.
    expect(coven).not.toContain('rotate(-3deg)')
    expect(coven).toContain(COVEN_ARCH)
    expect(coven).toContain('cvn-cauldron-sigil')
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

  /** #2634: the subtotal is base × mult, gated on the multiplier alone. */
  it('draws the UA subtotal on the multiplier alone, at base × mult', () => {
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
    const multOnly = text(
      renderToStaticMarkup(
        <UaScoreStamp praxis={praxis({ display_multiplier: 0.8, metatask_points: 0 })} />,
      ),
    )
    expect(full).toContain('subtotal')
    expect(full, 'the multiplier applied to the base, not to base + meta').toContain('9.6')
    expect(full, 'and never the old sum').not.toContain('32')
    expect(metaOnly, 'no multiplier, no subtotal').not.toContain('subtotal')
    expect(multOnly, 'a duel side with no metatask still shows one').toContain('subtotal')
  })

  it('draws the Everymen subtotal rule on the multiplier alone', () => {
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
    const multOnly = text(
      renderToStaticMarkup(
        <EverymenScoreStamp praxis={praxis({ display_multiplier: 0.8, metatask_points: 0 })} />,
      ),
    )
    expect(full).toContain('subtotal')
    expect(full).toContain('9.6')
    expect(metaOnly).not.toContain('subtotal')
    expect(multOnly).toContain('subtotal')
  })
})

/**
 * The same states on the #842 stamps, whose total marks are typographic and
 * whose notation is their own (ADR-0047 fixes rows, not notation).
 */
describe('#842 stamps across the conditional states (ADR-0047)', () => {
  for (const { name, fields, showsBase, showsVotes } of STATES) {
    it(`S.N.I.D.E. prints the working and the total in pts — ${name}`, () => {
      const markup = renderToStaticMarkup(<SnideScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // The perforation rules off working, so none on an empty tag (ADR-0076).
      if (showsBase) expect(markup).toContain('2px dashed')
      else expect(markup).not.toContain('2px dashed')
      expect(html).toContain(formatPoints(fields.score))
      expect(html).toContain('pts')
      expect(html).not.toMatch(HEX)
    })

    it(`Singularity prints the register and the two-decimal total — ${name}`, () => {
      const markup = renderToStaticMarkup(
        <SingularityScoreStamp praxis={praxis({ ...fields })} />,
      )
      const html = text(markup)
      expectBaseRow(html, showsBase)
      // The word, not `tot` (#1966).
      expect(html).toContain('total')
      // Zero-padded votes: the `+00` ADR-0076 stops it printing.
      expect(html).toContain(formatPoints(fields.score))
      expectVotesRow(html, showsVotes, `+${String(fields.points_from_votes).padStart(2, '0')}`)
      if (showsBase) expect(markup).toContain('--faction-singularity-stamp-rule')
      else expect(markup).not.toContain('--faction-singularity-stamp-rule')
      expect(html).not.toMatch(HEX)
    })

    it(`the unaffiliated sheet prints the working and the total — ${name}`, () => {
      const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // The spectrum rule is present exactly when there is working (#2520).
      if (showsBase) expect(markup).toContain('position:relative;height:2px')
      else expect(markup).not.toContain('position:relative;height:2px')
      expect(html).toContain(formatPoints(fields.score))
      expect(html).toContain('points')
      expect(html).not.toMatch(HEX)
    })
  }
})

/**
 * #1131 + ADR-0076 on every stamp: each skin builds its own rows, so each must
 * drop a null row rather than blank it. Base-only is the commonest state (a
 * fresh praxis under era_1's ×1.0) and reads as the total alone.
 */
describe('a base-only score reads as a bare total on every stamp (ADR-0076)', () => {
  /** Per stamp: base label, votes label, separating-rule fragment (null: none). */
  const STAMPS = [
    ['the unaffiliated sheet', DefaultScoreStamp, 'base', /votes/, 'position:relative;height:2px'],
    ['Everymen', EverymenScoreStamp, 'base', /votes/, 'TALLY'],
    ['the Ephemerists', EphemeristsScoreStamp, EPHEMERISTS_LABEL.base, /票/, null],
    ['S.N.I.D.E.', SnideScoreStamp, 'base', /votes/, '2px dashed'],
    ['Singularity', SingularityScoreStamp, 'base', /votes/, '--faction-singularity-stamp-rule'],
    ['WOW', WowScoreStamp, 'base', /votes/, 'linear-gradient(90deg'],
    ['Coven', CovenScoreStamp, 'base', /votes/, COVEN_ARCH],
    ['UA', UaScoreStamp, 'base', /votes/, '--faction-ua-card-box-bg'],
  ] as const

  /** No multiplier, no metatask, no votes: base IS the total. */
  const bare = praxis({
    task_point_value: 10,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    score: 10,
  })

  for (const [name, Stamp, baseLabel, votesLabel, rule] of STAMPS) {
    it(`${name} states the figure once, with no tally and no orphaned rule`, () => {
      const markup = renderToStaticMarkup(<Stamp praxis={bare} />)
      const html = text(markup)
      expect(html).not.toContain(baseLabel)
      // The total mark stays; whole scores print whole (#1866).
      expect(html).not.toContain('10.0')
      expect(html).not.toMatch(votesLabel)
      if (rule) expect(markup).not.toContain(rule)
      // Figure stated exactly once (#1131). Substring count: units butt onto numerals.
      expect(html.split('10')).toHaveLength(2)
    })
  }
})

/**
 * The rebuilt unaffiliated stamp (#1091): the design's own arithmetic (vote-
 * average multiplier, votes as a count) is not built; `scoreBreakdown` rules.
 */
describe('the rebuilt unaffiliated stamp keeps the real model (#1091)', () => {
  it('hides the multiplier chip under a neutral era and shows it otherwise', () => {
    // era_1 is neutral (1.0), so the chip is dark today. Chip and subtotal share a gate.
    const neutral = text(
      renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ display_multiplier: 1 })} />),
    )
    expect(neutral).not.toContain('×')
    expect(neutral).not.toContain('subtotal')

    const live = text(
      renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ display_multiplier: 1.1 })} />),
    )
    expect(live).toContain('×1.10')
    expect(live, 'and its result directly beneath').toContain('subtotal')
    expect(live).toContain('13.2')
  })

  it('shows the metatask row only when metatask points are live', () => {
    const sealed = text(
      renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ metatask_points: 4 })} />),
    )
    expect(sealed).toContain('meta')
    expect(sealed).toContain('+4')
    expect(
      text(renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ metatask_points: 0 })} />)),
    ).not.toContain('meta')
  })

  it('drops the votes tally at zero — the total says it (ADR-0076)', () => {
    // ADR-0076 overturns ADR-0047 for this row only.
    const unvoted = text(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={praxis({ points_from_votes: 0, score: 12 })} />,
      ),
    )
    expect(unvoted).not.toContain('from votes')
  })

  it('states votes as POINTS, never as a count of voters', () => {
    // A points figure; the payload has no voter count and none is invented.
    const html = text(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={praxis({ points_from_votes: 7, score: 19 })} />,
      ),
    )
    expect(html).toContain('votes+7')
  })

  it('keeps a total mark and the working rule, both from tokens', () => {
    const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({})} />)
    // The shared spectrum ring (#2042); ramps are classes (#2497).
    expect(markup).toContain('spectrum-dial')
    expect(markup).toContain('spectrum-rule')
    expect(markup).not.toMatch(HEX)
  })
})

/**
 * #1894: the separating gap exists only when working precedes the mark, so a
 * bare sheet shrink-wraps and the mark centres. A sealed, unvoted metatask has
 * rows but no tally — that case pins how the condition may be spelled.
 */
describe('the unaffiliated disc shrink-wraps when nothing follows it (#1894)', () => {
  const bareFields = {
    task_point_value: 10,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
  }

  /** The gap between working and mark (moved off the disc in #2634). */
  const GAP = 'margin:var(--space-sm) 0 var(--space-md)'

  it('draws no separating gap when the sheet is the mark alone', () => {
    const markup = renderToStaticMarkup(
      <DefaultScoreStamp praxis={praxis({ ...bareFields, score: 10 })} />,
    )
    expect(markup).not.toContain(GAP)
    expect(markup, 'and no rule to hang it off').not.toContain('spectrum-rule')
  })

  it('keeps it whenever any working precedes — rows, votes or a habit bonus', () => {
    const working = {
      votes: praxis({ ...bareFields, points_from_votes: 4, score: 14 }),
      metatask: praxis({ ...bareFields, metatask_points: 3, score: 13 }),
      habit: praxis({ ...bareFields, habit_bonus_points: 5, score: 15 }),
      multiplier: praxis({ ...bareFields, display_multiplier: 1.1, score: 11 }),
    }
    for (const [name, p] of Object.entries(working)) {
      expect(renderToStaticMarkup(<DefaultScoreStamp praxis={p} />), name).toContain(GAP)
    }
  })

  it('draws no tally row on a metatask praxis nobody has voted on', () => {
    const markup = renderToStaticMarkup(
      <DefaultScoreStamp praxis={praxis({ ...bareFields, metatask_points: 3, score: 13 })} />,
    )
    expect(markup).toContain('meta')
    expect(text(markup)).not.toContain('votes')
    expect(text(markup)).not.toContain('habit')
  })
})

/**
 * #1079: a real `PraxisOut` literal, no cast, satisfies the stamp props and
 * renders the same markup as a card payload. A skin reading a card-only field
 * breaks the build here.
 */
describe('PraxisOut satisfies the stamp contract without a cast (#1079)', () => {
  /** A complete detail payload — every field spelled out, nothing asserted. */
  const detail: PraxisOut = {
    id: 7,
    task_id: 3,
    task_title: 'Walk the long way home',
    task_point_value: 12,
    task_level_required: 1,
    task_faction_slug: null,
    type: 'solo',
    status: 'submitted',
    title: 'The long way',
    body_text: null,
    moderation_status: 'visible',
    admin_note: null,
    flagged_at: null,
    submitted_at: '2026-07-28T00:00:00Z',
    submit_proposed_at: null,
    created_by_id: 5,
    created_by_display_name: 'Wanderer',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_at: '2026-07-27T00:00:00Z',
    updated_at: '2026-07-28T00:00:00Z',
    members: [],
    invites: [],
    media_items: [],
    score: 13.6,
    metatask_points: 0,
    display_multiplier: 0.8,
    points_from_votes: 4,
    habit_bonus_points: 0,
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
    viewer_can_vote: true,
    viewer_vote: null,
    voter_count: 0,
  }

  it('type-checks as ScoreStampProps — the assertion is the assignment itself', () => {
    const props: ScoreStampProps = { praxis: detail }
    expect(props.praxis.score).toBe(13.6)
  })

  it('renders byte-identically from a detail payload and a card payload', () => {
    const fromDetail = renderToStaticMarkup(<DefaultScoreStamp praxis={detail} />)
    const fromCard = renderToStaticMarkup(
      <DefaultScoreStamp praxis={praxis({ is_top_for_task: false, task_faction_slug: null })} />,
    )
    expect(fromDetail).toBe(fromCard)
  })

  it('carries the crown flag through, so the detail payload can wear a crown', () => {
    const crowned = renderToStaticMarkup(
      <DefaultScoreStamp praxis={{ ...detail, is_top_for_task: true }} />,
    )
    const bare = renderToStaticMarkup(<DefaultScoreStamp praxis={detail} />)
    expect(crowned).not.toBe(bare)
    expect(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={{ ...detail, is_top_for_task: true }} showCrown={false} />,
      ),
    ).toBe(bare)
  })

  it('feeds the dispatcher its slug from a detail payload too', () => {
    const covenDetail: PraxisOut = { ...detail, task_faction_slug: 'coven' }
    expect(
      resolvedArchetype(
        resolveVariant(surfaceMap('scoreStamp'), covenDetail.task_faction_slug),
      ),
    ).toBe(CovenScoreStamp)
  })
})

/**
 * #1909 cut the Ephemerists' kanji labels. #1637's bound still holds: a
 * numeral may never be a glyph. Label cases are absences so a voice pass can't
 * bring them back unseen.
 */
describe('the Ephemerists score stamp reads in the shared words (#1909)', () => {
  /** A praxis with every row live, so all three substituted labels are drawn. */
  const full = () =>
    renderToStaticMarkup(
      <EphemeristsScoreStamp
        praxis={praxis({
          task_point_value: 40,
          display_multiplier: 1.2,
          metatask_points: 0,
          points_from_votes: 4,
          habit_bonus_points: 0,
          score: 52,
        })}
      />,
    )

  it('prints the shared English, and no glyph as a LABEL (#1909, #2148)', () => {
    const html = text(full())
    expect(html).toContain('base')
    expect(html).toContain('points')
    expect(html).toContain('votes')
    // #2148: English is the label; remaining kanji are aria-hidden ornament.
    for (const glyph of ['票', '習']) {
      expect(html, `${glyph} is a retired label`).not.toContain(glyph)
    }
    const markup = full()
    for (const glyph of ['基', '点']) {
      expect(
        markup.slice(markup.indexOf(glyph) - 600, markup.indexOf(glyph)),
        `${glyph} is ornament inside the gloss, never the label`,
      ).toContain('aria-hidden="true"')
    }
  })

  it('leaves every numeral Western — undecoded, the arithmetic still checks out', () => {
    const html = text(full())
    expect(html).toContain('40')
    expect(html).toContain('×1.20')
    // Sign and numeral are one cell (#2285).
    expect(html).toContain('+4')
    // Whole, so no decimal (#1866).
    expect(html).toContain('52')
    expect(html).not.toContain('52.0')
    // The one thing that would break the bound: a number written as a glyph.
    expect(html).not.toMatch(/[〇一二三四五六七八九十百千万]/)
  })

  it('needs no glossed abbreviation, because nothing is abbreviated', () => {
    const markup = full()
    // No glyph to expand, so no `<abbr>` reveal.
    expect(markup).not.toContain('<abbr ')
    expect(markup).not.toContain('tabindex="0"')
    expect(markup).not.toContain('text-transform:none')
  })

  it('leaves every other faction reading in English', () => {
    const html = text(renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({})} />))
    expect(html).toContain('base')
    expect(html).toContain('points')
    expect(html).toContain('votes')
    expect(html).not.toMatch(/[基点票計]/)
  })
})

/**
 * #1617 on the skins' markup: each skin must act on the term. The bonus is an
 * era's `FactionConfig` choice, so every stamp is asserted, not just UA's.
 */
describe('every stamp shows the habit bonus when one is banked (#1617)', () => {
  /** Label and whole line per stamp; a bare numeral would pass on the votes 4. */
  const STAMPS = [
    ['the unaffiliated sheet', DefaultScoreStamp, 'habit', 'habit+5'],
    ['Everymen', EverymenScoreStamp, 'habit', 'habit+5'],
    // Figure and word are separate grid cells (#2285), so they butt together.
    ['the Ephemerists', EphemeristsScoreStamp, 'habit', '+5habit'],
    ['S.N.I.D.E.', SnideScoreStamp, 'habit', 'habit +5'],
    ['Singularity', SingularityScoreStamp, 'habit', 'habit+05'],
    ['WOW', WowScoreStamp, 'habit', 'habit +5'],
    // Label/figure pairs at opposite row ends (#2019).
    ['Coven', CovenScoreStamp, 'habit', 'habit+5'],
    ['UA', UaScoreStamp, 'habit', '+ 5 habit'],
  ] as const

  /** `12 × 0.8 + 4 votes + 5 habit = 18.6`. The multiplier is live on purpose. */
  const banked = praxis({ habit_bonus_points: 5, score: 18.6 })
  /** The same praxis without the bonus — the state of nearly every praxis. */
  const none = praxis({ habit_bonus_points: 0, score: 13.6 })

  for (const [name, Stamp, label, line] of STAMPS) {
    it(`${name} prints the bonus flat, and drops the row at 0`, () => {
      const html = text(renderToStaticMarkup(<Stamp praxis={banked} />))
      expect(html).toContain(line)
      // The total mark never moves off the payload's own figure.
      expect(html).toContain('18.6')
      // …nor rolled into the base figure.
      expect(html).not.toContain('17')

      expect(text(renderToStaticMarkup(<Stamp praxis={none} />))).not.toContain(label)
    })
  }

  it('leaves the Ephemerists numeral Western, like every other figure of theirs', () => {
    const html = text(renderToStaticMarkup(<EphemeristsScoreStamp praxis={banked} />))
    expect(html).toContain('+5')
    expect(html).not.toMatch(/[〇一二三四五六七八九十百千万]/)
  })

  it('labels the habit row in the shared word, not a kanji (#1909)', () => {
    const markup = renderToStaticMarkup(<EphemeristsScoreStamp praxis={banked} />)
    expect(text(markup)).toContain('habit')
    expect(markup).not.toContain('習')
    expect(markup).not.toContain('title="habit"')
  })
})

/**
 * One spectrum rule per na stamp (#2520): 0 for base-only, else exactly 1. The
 * ring's `.spectrum-dial` is the other carrier (the top band went, ADR-0083
 * §3b). The rule's `position: relative` contains Albescent's absolutely
 * positioned `::before`, which would otherwise paint over the working.
 */
describe('the na stamp rules its working in the spectrum (#2520)', () => {
  const fields = {
    task_point_value: 12,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
  }
  /** Every `.spectrum-rule` mount on the plate, counted by the shared class. */
  const spectra = (markup: string) => markup.split('spectrum-rule').length - 1
  const RULE = 'position:relative;height:2px'

  const STATES = {
    'base only': { ...fields, score: 12 },
    '+ metatask': { ...fields, metatask_points: 20, score: 32 },
    '+ votes': { ...fields, points_from_votes: 4, score: 16 },
    both: { ...fields, metatask_points: 20, points_from_votes: 4, score: 36 },
  }

  for (const [name, p] of Object.entries(STATES)) {
    const bare = name === 'base only'
    it(`draws ${bare ? 'no' : 'exactly one'} spectrum rule — ${name}`, () => {
      const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis(p)} />)
      expect(spectra(markup)).toBe(bare ? 0 : 1)
      if (bare) expect(markup).not.toContain(RULE)
      else expect(markup).toContain(RULE)
    })
  }

  it('drops the grey divider, and the grey leader hairlines with it', () => {
    const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis(STATES.both)} />)
    // The votes divider the spectrum rule replaces.
    expect(markup).not.toContain('border-top:1px solid var(--faction-default-card-line)')
    // `margin-left:auto` on the value replaces the leader spacer.
    expect(markup).not.toContain('min-width:6px')
    expect(markup).toContain('margin-left:auto')
  })

  /** #2634: totals sit at the bottom on all nine stamps, so the rule goes above the mark. */
  it('prints the rule under the WORKING, above the total', () => {
    const markup = renderToStaticMarkup(
      <DefaultScoreStamp praxis={praxis(STATES['+ metatask'])} />,
    )
    expect(markup.indexOf(RULE), 'below the last working row').toBeGreaterThan(
      markup.lastIndexOf('meta'),
    )
    expect(markup.indexOf(RULE), 'and above the spectrum ring').toBeLessThan(
      markup.indexOf('spectrum-dial'),
    )
  })

  // Orphan guard (ADR-0076): something must always follow the rule.
  for (const [name, p] of Object.entries(STATES)) {
    if (name === 'base only') continue
    it(`never leaves the rule orphaned — ${name}`, () => {
      const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis(p)} />)
      const at = markup.indexOf(RULE)
      expect(at, 'the rule is drawn at all').toBeGreaterThan(-1)
      // `</span>`, not `/>`: React doesn't self-close it, and `/>` made this vacuous.
      const close = markup.indexOf('</span>', at)
      expect(close, "the rule's closing tag").toBeGreaterThan(-1)
      const after = markup.slice(close + '</span>'.length)
      expect(text(after).trim(), 'nothing follows the rule').not.toBe('')
    })
  }
})
