/**
 * The score stamp's two halves (ADR-0047, ADR-0049, ADR-0076).
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

/** Strip tags so a copy assertion cannot be satisfied by an attribute value. */
const text = (html: string) => html.replace(/<[^>]*>/g, '')

/**
 * Overrides are loosely typed on purpose: several cases below feed `null` into
 * fields the API declares non-nullable, which is exactly the defensive `?? 0`
 * path in `scoreBreakdown` that a wire-shape drift would otherwise hit unseen.
 */
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
      // #2634 — the multiplier's result, written as the product rather than as
      // `9.6`, because that is not what a double holds: `12 * 0.8` is
      // `9.600000000000001` and the rounding belongs to `formatPoints` at the
      // render sites, not to the resolver.
      subtotal: 12 * 0.8,
      total: 13.6,
    })
  })

  it('hides the mult row at exactly 1.0', () => {
    expect(scoreBreakdown(praxis({ display_multiplier: 1 })).mult).toBeNull()
  })

  it('shows a 0.0 multiplier — a losing Snide duel side is not a hidden row', () => {
    // ADR-0053: the multiplier is never absent, and ×0.0 is a real, live value.
    expect(scoreBreakdown(praxis({ display_multiplier: 0, score: 4 })).mult).toBe(0)
  })

  it('hides the meta row at 0 or below, shows it above', () => {
    expect(scoreBreakdown(praxis({ metatask_points: 0 })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: null })).meta).toBeNull()
    expect(scoreBreakdown(praxis({ metatask_points: 3 })).meta).toBe(3)
  })

  /**
   * ADR-0076 reverses ADR-0047 here, and only here. The votes row used to be the
   * one declared exception to the suppression policy — "an absent row cannot say
   * 'nobody has voted yet'" — and is now the fifth null beside `mult`, `meta` and
   * `habit`, so every skin gates it the way it already gates those.
   */
  it('drops the votes row at zero and keeps it above (ADR-0076)', () => {
    expect(scoreBreakdown(praxis({ points_from_votes: 0 })).votes).toBeNull()
    expect(scoreBreakdown(praxis({ points_from_votes: 4 })).votes).toBe(4)
  })

  /**
   * #1131. The base row is the one row whose content can be entirely implied by
   * the total mark: with no multiplier, no metatask and no votes the stamp said
   * `10.0 POINTS` and then `BASE 10`. Under ADR-0076 the tally leaves with it, so
   * this is the state that reads as a bare total.
   */
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
      // No multiplier, no subtotal — the #2634 gate, and the reason a bare stamp
      // draws no rule and no chip either.
      subtotal: null,
      total: 10,
    })
  })

  it('brings the base row back the moment any term moves the figure', () => {
    const bare = { task_point_value: 10, display_multiplier: 1, metatask_points: 0, points_from_votes: 0 }
    // Each of the three terms, alone, is enough to make the base row explain
    // something — which is why a stamp may hang its multiplier chip off it.
    expect(scoreBreakdown(praxis({ ...bare, points_from_votes: 4, score: 14 })).base).toBe(10)
    expect(scoreBreakdown(praxis({ ...bare, metatask_points: 3, score: 13 })).base).toBe(10)
    expect(scoreBreakdown(praxis({ ...bare, display_multiplier: 1.1, score: 11 })).base).toBe(10)
  })

  it('keeps the base row when the score disagrees with its own terms', () => {
    // A `score` that has drifted from the terms behind it must stay legible.
    // Hiding the row here would collapse two different numbers into one mark.
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
 * #1617 — UA's habit bonus, at the SHARED seam: `scoreBreakdown` row selection.
 *
 * The backend half (PR #1659) stamps `habit_bonus_points` at seal time and puts
 * it on the wire; nothing read it. The issue's §4 is why that is a defect and
 * not a nicety — *"a term that scores without appearing there is how a card and
 * a detail page start disagreeing"*. A praxis whose total is 5 higher than its
 * own working is a stamp that cannot be checked.
 *
 * The bonus is FLAT and sits OUTSIDE the multiplier (owner ruling, restated at
 * `backend/schemas/praxis.py:173`): `(base + meta) × mult + votes + habit`. So
 * it is its own term here, never folded into `base` and never multiplied.
 */
describe('the habit bonus is a term of the breakdown (#1617)', () => {
  it('reads the bonus through as its own row', () => {
    expect(scoreBreakdown(praxis({ habit_bonus_points: 5, score: 18.6 })).habit).toBe(5)
  })

  /**
   * The same rule every other term now follows — ADR-0076 folded the votes row
   * into it too. The bonus is 0 for every faction but UA and for every
   * character's FIRST praxis, so a permanent `+0 habit` would print on all but a
   * handful of cards on the site and mean nothing.
   */
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
    // Without the base row the sheet would state 15 over `+ 5 habit bonus` and
    // leave the other 10 unaccounted for.
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
 * #1444 — a stamp may only name a number somebody banked.
 *
 * #1373 shipped the ruling that a `failed` praxis contributes 0 to its author's
 * score, and `hidden` never contributed at all: `_UNSCORED_MODERATION_STATUSES`
 * in `backend/services/character_stats.py` is the ONE predicate naming that
 * pair. The card kept stamping its computed total anyway, so the failed banner
 * and a `13.6 POINTS` mark sat in the same frame, and only one of them was true.
 *
 * The gate is on the DISPATCHER rather than a card slot because ADR-0049 made
 * this component the single mount for every surface that shows a total — the
 * nine cards, the nine praxis-detail rails, the composer's waiting slip. A gate
 * at `desktop/shared.tsx` would leave the same untrue figure on the detail page
 * one click away.
 *
 * Both halves are asserted deliberately: a stamp that hides on `failed` and a
 * stamp that hides ALWAYS produce the same first assertion.
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
    // `_UNSCORED_MODERATION_STATUSES` excludes `flagged` for the same reason:
    // a flagged praxis is still counted, so its total is still banked.
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

  /**
   * Albescent claims the surface (#2501, epic #2496) — the LAST faction with a
   * roster to do so. It used to sit in the fall-through list above, which is why
   * this pair replaces it there rather than being added beside it.
   */
  it('gives Albescent its own stamp — the last roster faction to claim one (#2501)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'albescent'))).toBe(
      AlbescentScoreStamp,
    )
  })

  it('wraps the na stamp WHOLE — the hook element and nothing else (epic ruling 4)', () => {
    // "Upgrade, never replace." The delta is one class for the cascade to reach
    // the two spectra through; strip it and the two stamps are byte-identical.
    // A forked anatomy — a re-implemented row, a re-derived total, one extra
    // span — fails here, which is the property a markup-contains check would
    // miss.
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
    // And the two mounts the cascade dresses are UNDER that hook. The equality
    // above cannot see this: it would still hold the day `DefaultScoreStamp`
    // re-inlines its ramps, at which point `.alb-moves .spectrum-rule` and
    // `.alb-moves .spectrum-dial` match nothing and the whole tell goes quiet
    // with every test in the repo green. `spectrumClasses.test.tsx` and
    // `pointsMarkUnification.test.tsx` hold the na side of each; this is the
    // pairing with the dresser.
    // This fixture has a working out (`praxis()` defaults carry votes and a
    // multiplier), so the rule over it is drawn. The BAND across the top edge
    // was what this line named until #2559 took it off — the mount that is
    // there in EVERY state, base-only included, is the ring.
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

  /**
   * The one dispatch pair worth naming explicitly. ADR-0050's whole failure mode
   * is these two slugs holding each other's presentation, and a swap here would
   * still resolve, still render, and still be wrong — so assert the identity of
   * each, not merely that both are claimed.
   */
  it('gives WOW the chronicle plate and Coven the sticker, not the reverse (#840)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'wow'))).toBe(WowScoreStamp)
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'coven'))).toBe(CovenScoreStamp)
  })

  it('gives UA its own stamp — the ensō (#857)', () => {
    expect(resolvedArchetype(resolveVariant(surfaceMap('scoreStamp'), 'ua'))).toBe(UaScoreStamp)
  })
})

/**
 * The five conditional states of design v2, shared by both stamp waves below.
 *
 * `showsBase` is part of the state, not a detail of one skin: 'base only' is the
 * #1131 empty state, where the figure equals the total and the row would print it
 * twice, so every stamp must OMIT it there and print it in the other four.
 *
 * `showsVotes` is ADR-0076's half of the same idea, and the two are NOT the same
 * flag: '× mult' and '+ metatask' keep the base row while the tally stays away.
 * `showsBase` doubles as "this stamp has some working at all", because a null
 * base coincides with every other term being absent — which is what the
 * separating rule between the working and the total mark is gated on.
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

/**
 * Every stamp labels the row from the same key, so one assertion covers all
 * eight: the label is present exactly when the resolver kept the figure.
 */
function expectBaseRow(html: string, showsBase: boolean, baseLabel = 'base') {
  if (showsBase) expect(html).toContain(baseLabel)
  else expect(html).not.toContain(baseLabel)
}

/**
 * The same, for the tally — ADR-0076: no votes, no votes row.
 *
 * The default label was `'from votes'` until #2634. Four skins read the sentence
 * key `card.stamp.fromVotes` while the other five read the bare `card.stamp.votes`,
 * so this helper needed an override on five of its nine callers and the ledger
 * read in two registers. One register now, one default, no overrides.
 */
function expectVotesRow(html: string, showsVotes: boolean, votesLabel = 'votes') {
  if (showsVotes) expect(html).toContain(votesLabel)
  else expect(html).not.toContain(votesLabel)
}

/**
 * The Ephemerists' rows used to be the same rows under different NAMES (#1637):
 * the labels were kanji and the English rode on `title`. #1909 CUT all five of
 * those strings — they were the only faction-specific score-stamp labels in the
 * app, on a surface the audit ruled generic — so each row now prints the SHARED
 * label it was glossed with. The one that is not simply the shared default is
 * the tally: the gloss said "from votes", the shared sentence key
 * `card.stamp.fromVotes` interpolates a figure, and the row sets its own `+ N`
 * outside the label (#1637's bound), so it takes `card.stamp.votes`.
 */
const EPHEMERISTS_LABEL = { base: 'base', points: 'points', votes: 'votes' } as const

/**
 * Coven's arched Points plate (#2019) — the elliptical head over a die-cut foot.
 * The plate is what holds the working, so this fragment is Coven's entry in the
 * "no working, no rule" family below; the braid it replaced was the same test
 * one identity earlier.
 */
const COVEN_ARCH = '92px 92px 20px 20px / 108px 108px 20px 20px'

/**
 * The five conditional states of design v2, on both #841 stamps. The failure
 * mode this guards is not a missing row — `scoreBreakdown` is tested above —
 * but a stamp that stops READING as itself when a row drops out: a tally whose
 * subtotal rule floats with nothing above it, or a rubric with no working over
 * it. Each state must still print the total and its own device.
 */
describe('#841 stamps across the conditional states (ADR-0047)', () => {
  for (const { name, fields, showsBase, showsVotes } of STATES) {
    it(`Everymen prints the tally and the roundel — ${name}`, () => {
      const html = text(renderToStaticMarkup(<EverymenScoreStamp praxis={praxis({ ...fields })} />))
      // The tally stamp is the working's frame, so it is struck only when there
      // is working to fill it: a `TALLY` header over an empty form is the
      // orphaned rule ADR-0076 warns about.
      if (showsBase) expect(html).toContain('TALLY')
      else expect(html).not.toContain('TALLY')
      expect(html).toContain('ON THE RECORD')
      // The roundel carries the total whichever rows are present.
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
      // The ruled plate holds the working; with no working it would be an empty
      // bordered box under the ensō (ADR-0076).
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
      // The gold→plum hairline separates the working from the total, so it goes
      // when the working does (ADR-0076). Matched on the gradient, not on the
      // gold token — the ✦ below wears that too.
      if (showsBase) expect(markup).toContain('linear-gradient(90deg')
      else expect(markup).not.toContain('linear-gradient(90deg')
      expect(html).toContain(formatPoints(fields.score))
      // The retired ✦ survives here and only here — see ADR-0050 / the design
      // README's carve-out. Losing it is half of what #840 exists to fix.
      expect(html).toContain('✦')
      expect(html).not.toMatch(HEX)
    })

    it(`Coven prints the working and keeps the cauldron — ${name}`, () => {
      const markup = renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      // #2019 moved the tally onto the plate as a ✦-bulleted row, so it takes
      // `card.stamp.votes` and sets its own `+ N` — the same bound the
      // Ephemerists row already sits inside (#1637). Since #2634 that is the
      // shared default, because the other four skins came to meet it.
      expectVotesRow(html, showsVotes)
      // The plate holds the working, so it is drawn only when there IS working:
      // an arch over an empty block is the orphaned rule ADR-0076 warns about,
      // and it replaces the braid #1209 had ruling the slip.
      if (showsBase) expect(markup).toContain(COVEN_ARCH)
      else expect(markup).not.toContain(COVEN_ARCH)
      expect(markup).not.toContain('cvn-braid')
      expect(html).toContain(formatPoints(fields.score))
      // The `✨` retired with the slip — the cauldron is the total mark now, and
      // it is the one object that survives every state (#2019).
      expect(html).not.toContain('✨')
      expect(markup).toContain('cvn-cauldron-sigil')
      expect(html).not.toMatch(HEX)
    })
  }

  /**
   * #1207 — the Ephemerists stamp crossed from THE CODEX to the Valley plate.
   * The rows are unchanged (they are `scoreBreakdown`'s, asserted above); what
   * moves is the whole presentation, and the tell that it moved is the token
   * family. A skin that still reads `--eph-*` is painting the retired
   * illuminated-codex ground on a papyrus card, which renders fine and is wrong.
   */
  it('strikes the Ephemerists total in the plate compass rose, not the codex rubric', () => {
    const markup = renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis({})} />)
    expect(markup).toContain('--faction-ephemerists-plate-')
    expect(markup).not.toMatch(/--eph-[a-z]/)
    // The shared `CompassRose`, carrying the total (#2145). The stepped octagon
    // on its lotus base stood here; the rose is the mark the task card already
    // struck, and #2042's ruling is that a faction's points mark is ONE drawing.
    expect(markup).toContain('M50 8 L55.5 26 L44.5 26 Z')
    expect(markup).not.toContain('M30 4 L70 4 L96 30')
    // The codex's stuck-label tilt is gone: this cell is cut, not stuck on.
    expect(markup).not.toContain('rotate(-1deg)')
  })

  /**
   * The sticker is not a rectangle and the plate is not upright — #821 replaced
   * both with the same level bordered box. Geometry, unlike copy, has no other
   * assertion that would catch it going flat again.
   */
  it('keeps each faction its own geometry: WOW struck at -2deg, Coven arched over a cauldron', () => {
    const wow = renderToStaticMarkup(<WowScoreStamp praxis={praxis({})} />)
    const coven = renderToStaticMarkup(<CovenScoreStamp praxis={praxis({})} />)
    expect(wow).toContain('rotate(-2deg)')
    // #2019: Coven's own signature is no longer a TILT. The slip was pinned
    // crooked and its gold chip counter-rotated to read level on it; the plate
    // and the cauldron are a symmetrical composition and stand upright, so a
    // stamp that still leans is one that never left the sticker.
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

  /**
   * #2634 re-cut both of these gates, and the figure with them.
   *
   * They read "only when a metatask AND a multiplier are both live", and printed
   * `base + meta` — 32 on the fixture below. #2633 moved the metatask out of the
   * multiplier, so the subtotal is what the multiplier applies to and nothing
   * else: `12 × 0.80 = 9.6`, on a metatask praxis and on a bare duel side alike.
   * The metatask no longer bears on whether the row exists.
   */
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
 * The same five states on the #842 stamps, whose total marks are TYPOGRAPHIC —
 * a numeral carrying its own device rather than a drawn one. The failure mode
 * is the same: a working that stops reading as itself when a row drops out.
 * Both faction stamps also format the numbers in their own voice, which
 * ADR-0047 permits (it fixes which rows exist, not their notation), so the
 * assertions below are deliberately notation-aware.
 */
describe('#842 stamps across the conditional states (ADR-0047)', () => {
  for (const { name, fields, showsBase, showsVotes } of STATES) {
    it(`S.N.I.D.E. prints the working and the total in pts — ${name}`, () => {
      const markup = renderToStaticMarkup(<SnideScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // The torn-off perforation is the tag's rule between the typed working and
      // the total, so it tears nothing off an empty tag (ADR-0076).
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
      // The word, not the abbreviation (#1966). `toContain('tot')` passed on
      // either, which is why the label read TOT for as long as it did.
      expect(html).toContain('total')
      // The terminal pads its output: two decimals, and a zero-padded votes row —
      // which is exactly the `+00` ADR-0076 stops it printing.
      expect(html).toContain(formatPoints(fields.score))
      expectVotesRow(html, showsVotes, `+${String(fields.points_from_votes).padStart(2, '0')}`)
      // The read-out's rule sits between the register and the total; an empty
      // register has no register to rule off.
      if (showsBase) expect(markup).toContain('--faction-singularity-stamp-rule')
      else expect(markup).not.toContain('--faction-singularity-stamp-rule')
      expect(html).not.toMatch(HEX)
    })

    it(`the unaffiliated sheet prints the working and the total — ${name}`, () => {
      const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      expectVotesRow(html, showsVotes)
      // THE SPECTRUM RULE is what only a sheet with working draws — the stamp's
      // one rule, under the rows or between them and the tally. In the base-only
      // state the mark is alone and no row survives (ADR-0076), and a tally
      // block implies rows (votes un-suppress the base row), so the rule is
      // present exactly when there is working to show.
      //
      // This used to read `--faction-default-card-muted`, on the stated grounds
      // that the ink dressed the rows and the tally "and nothing else on the
      // sheet". #2042 made that false: the total mark is
      // `DefaultPointsRing` now and it letters its unit in the same ink, so the
      // proxy stopped distinguishing a sheet with working from one without. It
      // then read `min-width:6px`, the grey leader hairline, until #2520 traded
      // both grey lines on this sheet for the one spectrum rule.
      if (showsBase) expect(markup).toContain('position:relative;height:2px')
      else expect(markup).not.toContain('position:relative;height:2px')
      expect(html).toContain(formatPoints(fields.score))
      expect(html).toContain('points')
      expect(html).not.toMatch(HEX)
    })
  }
})

/**
 * #1131 and ADR-0076 on every registered stamp at once. Both rules live in
 * `scoreBreakdown`, but each skin still has to ACT on the null — nine files build
 * their own row arrays from the resolver's nulls, and a skin that interpolates a
 * term straight into JSX would render an empty label instead of dropping the row.
 * So this asserts the state on all eight rather than trusting the resolver test.
 *
 * The state is the commonest one on the site: a freshly submitted praxis, before
 * anyone votes, under `era_1`'s neutral ×1.0 — which is also what the composer's
 * waiting surface shows the moment you submit, where a praxis is base-only by
 * definition. Under ADR-0076 it reads as the total alone.
 */
describe('a base-only score reads as a bare total on every stamp (ADR-0076)', () => {
  /**
   * Each stamp with the three things this case reads off it — the base label and
   * the votes label it must NOT print, and the markup fragment that draws its
   * separating rule between the working and the total mark. Seven say the labels
   * in English; the Ephemerists say them in kanji (#1637), and handing in 'base'
   * there would assert nothing at all.
   *
   * The rule fragment is the second half of the ruling: with zero rows left, a
   * braid / hairline / perforation / bordered plate would rule off an empty
   * block. The Ephemerists draw no such rule — their cell is the frame — so they
   * have nothing to check here.
   */
  const STAMPS = [
    // `position:relative;height:2px` is the na sheet's one spectrum rule, drawn
    // wherever its working ends (#2520) — see the note in the conditional-states
    // block above for the two proxies that came before it.
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
      // The total mark stays — under ADR-0049 it is the faction's signature
      // device, so it is the one number that never drops out. #1866: a whole
      // score prints WHOLE, so the figure that survives is `10`, not `10.0`
      // (nor Singularity's old `10.00`).
      expect(html).not.toContain('10.0')
      // The tally goes with it: no votes, no votes row (ADR-0076).
      expect(html).not.toMatch(votesLabel)
      if (rule) expect(markup).not.toContain(rule)
      // The label is gone, not blanked, and the total mark is the one survivor:
      // the figure is stated exactly once (#1131). Counted as a substring rather
      // than with `\b`, because several stamps butt the unit straight onto the
      // numeral ('10points', '10pts') and there is no word boundary there.
      expect(html.split('10')).toHaveLength(2)
    })
  }
})

/**
 * The rebuilt unaffiliated stamp (#1091, epic #1085) — the Unaffiliated praxis
 * detail design's score rail, which is the same object as the `na` card stamp.
 *
 * What is pinned here is what a rebuild could quietly lose: the design's own
 * arithmetic. It computes a multiplier from the VOTE AVERAGE, labels the result
 * "Faction ×1.17", puts meta OUTSIDE that multiplier, and prints votes as a
 * COUNT. None of it is built — `scoreBreakdown()` is the resolver and the rows
 * below are its rules, not this skin's.
 */
describe('the rebuilt unaffiliated stamp keeps the real model (#1091)', () => {
  it('hides the multiplier chip under a neutral era and shows it otherwise', () => {
    // era_1 neutralises own/other_task_modifier to 1.0 for every faction, so
    // the chip is dark today and lights up on its own if an era configures one.
    //
    // It was a `mult` ROW until #2634 and is a bare chip on the base line now,
    // so the WORD is gone and the ratio is the whole of it — the shape UA,
    // S.N.I.D.E. and WOW already drew. What goes with the chip is the subtotal
    // and its rule; the gate is one and the same.
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
    // ADR-0047 kept `+ 0 from votes` here on the grounds that an absent row
    // cannot say "nobody has voted yet". ADR-0076 overturns that for this row
    // and this row only; the mult row above is still hidden at ×1.0 for the
    // reason it always was.
    const unvoted = text(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={praxis({ points_from_votes: 0, score: 12 })} />,
      ),
    )
    expect(unvoted).not.toContain('from votes')
  })

  it('states votes as POINTS, never as a count of voters', () => {
    // `points_from_votes` is a points figure. The design printed "4 votes" as a
    // tally of people; the payload carries no such number and none is invented.
    const html = text(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={praxis({ points_from_votes: 7, score: 19 })} />,
      ),
    )
    expect(html).toContain('votes+7')
  })

  it('keeps a total mark and the working rule, both from tokens', () => {
    const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({})} />)
    // The mark is the shared spectrum ring (#2042). It was this design's STRUCK
    // DISC — pinned here as its `rotate(-7deg)` tilt — until the owner ruled that
    // the point card takes the task card's mark; `na` was drawing one points mark
    // twice. What the assertion is for is unchanged: a rebuild must not lose the
    // mark, because under ADR-0049 it is the one figure that never drops out.
    // Both ramps moved into index.css in #2497 — `.spectrum-dial` for the
    // ring's conic annulus, `.spectrum-rule` for the rule over the working —
    // so the classes are what the markup carries now. The promise is the same
    // one, one indirection further out: a shared cut, never a pasted literal.
    //
    // `.spectrum-rule` named the BAND across the top edge until #2559 removed
    // it (ADR-0083 §3b). It still holds here because this fixture has a working
    // out; `.spectrum-dial` is the one that holds unconditionally.
    expect(markup).toContain('spectrum-dial')
    expect(markup).toContain('spectrum-rule')
    expect(markup).not.toMatch(HEX)
  })
})

/**
 * #1894 — the unaffiliated disc's trailing margin is conditional on there being
 * something below it to be separated FROM.
 *
 * The seam is the rendered markup of `DefaultScoreStamp`: whether the disc's
 * wrapper emits `margin-bottom`. ADR-0076 and #1131 between them can empty the
 * whole lower half of this sheet — no rows, no tally — and the margin then had
 * nothing to separate, so it sat as dead space inside a symmetrically padded box
 * and pushed the disc off centre. The owner ruled the BOX shrinks: no
 * `min-height` pinned to whatever a one-row stamp happens to measure today.
 *
 * The metatask case below is the one that decides how the condition may be
 * spelled. `hasWorking` (rows OR flat terms) and the flat-terms block's own
 * guard (flat terms only) are NOT the same predicate: a sealed metatask praxis
 * nobody has voted on has rows and no flat terms, so gating the flat-terms block
 * on `hasWorking` would hang its rule under the working with nothing beneath it —
 * exactly the orphaned rule ADR-0076 exists to prevent.
 */
describe('the unaffiliated disc shrink-wraps when nothing follows it (#1894)', () => {
  const bareFields = {
    task_point_value: 10,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
  }

  /**
   * THE SEPARATOR'S SPACE MOVED WITH THE SEPARATOR (#2634). It was
   * `margin-bottom` on the DISC's wrapper, because the disc led the sheet; the
   * ring is last now and the gap belongs to the spectrum rule between the
   * working and the mark. The property this reads is that gap, wherever it
   * hangs — present exactly when there is working to be separated from.
   */
  const GAP = 'margin:var(--space-sm) 0 var(--space-md)'

  it('draws no separating gap when the sheet is the mark alone', () => {
    const markup = renderToStaticMarkup(
      <DefaultScoreStamp praxis={praxis({ ...bareFields, score: 10 })} />,
    )
    // Nothing renders above the mark, so the box wraps to padding + mark +
    // padding and the mark is dead-centre.
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
    // The flat terms are ROWS since #2634 rather than a prose block of their
    // own, so the tally's absence is read off the shared label instead of off
    // the block's `margin-top`. `not.toContain('votes')` is the whole check the
    // old `margin-top:var(--space-sm)` proxy was standing in for.
    const markup = renderToStaticMarkup(
      <DefaultScoreStamp praxis={praxis({ ...bareFields, metatask_points: 3, score: 13 })} />,
    )
    expect(markup).toContain('meta')
    expect(text(markup)).not.toContain('votes')
    expect(text(markup)).not.toContain('habit')
  })
})

/**
 * The stamp's prop type is structural (#1079). `ScoredPraxis` always claimed to
 * be satisfied by BOTH payload shapes (ADR-0053), but the component prop was
 * pinned to `PraxisCardOut`, so the detail/composer payload could only reach a
 * stamp through a cast — and a cast would have hidden a genuinely missing field
 * instead of failing the build.
 *
 * These cases pin the claim from the other side: a real `PraxisOut` literal,
 * with no `as` anywhere, both type-checks and renders the SAME markup a card
 * payload renders. If a skin ever starts reading a card-only field, the literal
 * below stops compiling — which is the whole point of widening rather than
 * casting.
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
 * #1637 IS RETIRED, and #1909 is what retired it.
 *
 * The Ephemerists used to label their score in kanji — 基 / 点 / 票 / 習 — with
 * the English on `title`. The copy audit CUT all five strings: they were the
 * only faction-specific score-stamp labels in the app, on a surface it ruled
 * generic, and the shared gloss each glyph carried is now the visible label.
 *
 * #1637's own BOUND survives the change and is still the thing worth guarding:
 * the cost of not decoding a label may never be a NUMBER. A skin that renders
 * 四 for a vote count would render fine, read beautifully, and be the defect.
 * So the numerals case stays exactly as written, and the label cases invert to
 * absences — because the way a faction-only label comes back onto a settled
 * surface is a voice pass, which only a negative assertion can catch.
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
    // #1909 cut the kanji that WERE the labels, with the English hidden on a
    // `title`. #2148 inverts that arrangement rather than undoing it: the
    // English is the label and the accessible name, and the casts are decoration
    // inside an `aria-hidden` stack. So what is forbidden is a glyph standing
    // where a word should be — asserted as the two kanji that are not cast at
    // all, plus the shape of the ones that are.
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
    // #2285 made the tally figure a cell of its own — the sign and the numeral
    // are one figure now, and the label is the next cell along, so the space
    // that separated them in one run of text is gone with the run.
    expect(html).toContain('+4')
    // Whole, so no decimal — the kanji labels do not change the notation (#1866).
    expect(html).toContain('52')
    expect(html).not.toContain('52.0')
    // The one thing that would break the bound: a number written as a glyph.
    expect(html).not.toMatch(/[〇一二三四五六七八九十百千万]/)
  })

  it('needs no glossed abbreviation, because nothing is abbreviated', () => {
    const markup = full()
    // The whole `<abbr title=…>` reveal existed to expand a glyph. With the
    // label itself in English there is nothing to expand — and an `<abbr>` with
    // no expansion is a dotted underline promising a lookup that is not there.
    expect(markup).not.toContain('<abbr ')
    expect(markup).not.toContain('tabindex="0"')
    // The plate's `text-transform: none` overrides existed for the same reason:
    // uppercasing does nothing to a kanji but cost it the override.
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
 * #1617 at the OTHER seam: the eight skins' rendered markup.
 *
 * `scoreBreakdown` deciding the row is only half of it — #1131 is the standing
 * proof that each skin still has to ACT on the resolver, and a skin that ignores
 * the term renders perfectly while stamping a total 5 points above its own
 * working. So every registered stamp is asserted, not just UA's: the bonus is a
 * `FactionConfig` field defaulted to 0, and the faction that holds it is an ERA's
 * choice. UA is the only one in Era 1.
 */
describe('every stamp shows the habit bonus when one is banked (#1617)', () => {
  /**
   * Each stamp with the LABEL it prints and the whole LINE it prints.
   *
   * The line is spelled out per faction rather than pattern-matched, because
   * `5 × 0.80 = 4` is the bug this guards and 4 is already on every one of these
   * sheets as the votes figure — a bare numeral assertion would go green on it.
   * All eight label the row in English since #1909 cut the Ephemerists' four
   * kanji; only the surrounding notation differs. Singularity zero-pads (`+05`)
   * — its declared terminal notation, the same one its votes row already uses.
   */
  const STAMPS = [
    // The na sheet's `+ 5 habit bonus` prose went with #2634's one-register
    // ruling: it is a two-column ledger row like the other four now.
    ['the unaffiliated sheet', DefaultScoreStamp, 'habit', 'habit+5'],
    ['Everymen', EverymenScoreStamp, 'habit', 'habit+5'],
    // #2285 put the figure and the word in two columns of the cell's grid, so
    // they butt together once the tags are stripped — the same shape Coven's
    // note below describes. The label and the notation are unchanged.
    ['the Ephemerists', EphemeristsScoreStamp, 'habit', '+5habit'],
    ['S.N.I.D.E.', SnideScoreStamp, 'habit', 'habit +5'],
    ['Singularity', SingularityScoreStamp, 'habit', 'habit+05'],
    ['WOW', WowScoreStamp, 'habit', 'habit +5'],
    // #2019 set the working as label/figure pairs at opposite ends of a flex
    // row, so the two butt together once the tags are stripped. The label and
    // the notation are unchanged — this issue changed no copy.
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
      // …and the bonus is not quietly rolled into the base figure either: the
      // sheet still states the task's own 12.
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
 * ONE SPECTRUM RULE PER STAMP, in every state (#2520, epic #2496).
 *
 * `Score-Stamp.dc.html` draws three columns — shipped (a flat 1px grey line),
 * na (a 2px STATIC spectrum rule) and Albescent (that same stamp with the rule
 * travelling and the ring turning). #2501 built the third column and skipped the
 * second, so the society's stamp animated a rule the unaffiliated stamp did not
 * have and the two differed STRUCTURALLY, when the design says they differ only
 * by motion. This is the second column.
 *
 * The seam is the rendered markup of `DefaultScoreStamp`, and the claim is
 * COUNTABLE: **at most one spectrum rule per stamp, and none when there is no
 * working out.** A presence check would pass against a rule per row, which is
 * the shape the board's own comment rejects — "one spectrum rule per stamp is
 * enough".
 *
 * THE BAND ACROSS THE TOP EDGE IS NO LONGER ONE OF THE COUNT (#2559). This
 * describe used to assert 1 and 2 — band plus rule. #2042 made the disc
 * {@link DefaultPointsRing}, a spectrum ring, so the band became the SECOND
 * structural rainbow on one object and came off under ADR-0083 §3b ("one
 * carrier per object"). The counts are 0 and 1 now, and the ring's
 * `.spectrum-dial` is this stamp's one carrier.
 *
 * The four cases are the board's four fixtures. Base-only draws no breakdown at
 * all (#1131 / ADR-0076), so it draws no rule either: the ring is the whole
 * spectrum on it.
 *
 * `position: relative` on the rule is not decoration. `.alb-moves
 * .spectrum-rule:empty::before` is absolutely positioned, so a rule that is not itself
 * a containing block hands Albescent's travelling child the stamp PLATE, and the
 * ramp paints over the working out.
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
    // The leader line each row ran out to its figure. The figures keep their
    // column — `margin-left:auto` on the value does what the spacer did.
    expect(markup).not.toContain('min-width:6px')
    expect(markup).toContain('margin-left:auto')
  })

  /**
   * #2634 REVERSED THIS, and the reversal is the assertion.
   *
   * It read "prints the rule under the TOTAL, above the working" — the owner's
   * ruling of 2026-08-23, taken so the one rule could never be orphaned at the
   * foot of a sheet whose total was on TOP. Totals sit at the bottom on all nine
   * stamps now, so the rule sits where the other eight put theirs: under the
   * whole working, above the mark. The orphan guard below is unchanged and still
   * passes, because the ring is what now follows it in every state.
   */
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

  // THE ORPHAN GUARD (owner ruling 2026-08-23, ADR-0076).
  //
  // This is the assertion the position exists for, and it is why the rule is
  // anchored under the total rather than under the working. Anchored below, a
  // sealed metatask nobody has voted on has rows and NO flat terms, so the rule
  // became the last thing on the sheet with nothing beneath it — the orphan
  // ADR-0076 was written to stop, and the reversal the old comment on
  // `DefaultScoreStamp` warned against by name before #2520 removed it.
  //
  // Stated as "something always follows the rule" rather than as an index
  // comparison against one row label, so it keeps holding if the breakdown
  // grows a row this suite does not know about.
  for (const [name, p] of Object.entries(STATES)) {
    if (name === 'base only') continue
    it(`never leaves the rule orphaned — ${name}`, () => {
      const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis(p)} />)
      const at = markup.indexOf(RULE)
      expect(at, 'the rule is drawn at all').toBeGreaterThan(-1)
      // Everything after the rule's own closing tag must still carry ink, not
      // just the plate's closing markup. `</span>` and not `/>`: React does not
      // self-close a void-less element, so a `/>` search runs straight past the
      // rule and makes this assertion vacuous — which it was, until the probe
      // that was supposed to fail did not.
      const close = markup.indexOf('</span>', at)
      expect(close, "the rule's closing tag").toBeGreaterThan(-1)
      const after = markup.slice(close + '</span>'.length)
      expect(text(after).trim(), 'nothing follows the rule').not.toBe('')
    })
  }
})
