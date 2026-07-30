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
import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../../../i18n'
import type { PraxisCardOut, PraxisOut } from '../../../../api/praxis'
import type { ScoreStampProps } from '../ScoreStamp'
import { pickVariant } from '../../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../../factions/lazyArchetype'
import { surfaceMap } from '../../../../factions'
import { scoreBreakdown, formatMult } from '../scoreBreakdown'
import { applyVoteDelta } from '../../../vote/useVotedPraxis'
import { recordVote, tallyDelta, __resetVoteOverrides } from '../../../vote/voteOverrides'
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
    task_point_value: 12,
    display_multiplier: 0.8,
    metatask_points: 0,
    points_from_votes: 4,
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
      votes: 4,
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

  it('always keeps the votes row — +0 is a real value, not an absent one', () => {
    expect(scoreBreakdown(praxis({ points_from_votes: 0 })).votes).toBe(0)
  })

  /**
   * #1131. The base row is the one row whose content can be entirely implied by
   * the total mark: with no multiplier, no metatask and no votes the stamp said
   * `10.0 POINTS` and then `BASE 10`. The votes row is NOT part of this — the
   * owner was offered "hide base and `+0 from votes`" and declined it, so the
   * empty state is the mark plus the tally.
   */
  it('hides the base row when it would only restate the total', () => {
    const bare = praxis({
      task_point_value: 10,
      display_multiplier: 1,
      metatask_points: 0,
      points_from_votes: 0,
      score: 10,
    })
    expect(scoreBreakdown(bare)).toEqual({
      base: null,
      mult: null,
      meta: null,
      votes: 0,
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
    ).toEqual({ base: 0, mult: 0.8, meta: null, votes: 0, total: 0 })
  })

  it('formats the multiplier to two decimals', () => {
    expect(formatMult(0.8)).toBe('×0.80')
    expect(formatMult(2)).toBe('×2.00')
  })
})

describe('useVotedPraxis merge feeds the stamp breakdown (#912)', () => {
  beforeEach(() => {
    __resetVoteOverrides()
  })

  it('moves both the votes row and the total on an active override, before any refetch', () => {
    const base = praxis({ id: 1, voter_count: 2, points_from_votes: 4, score: 13.6 })
    recordVote(1, 5, null)
    const delta = tallyDelta(1)
    if (!delta) throw new Error('expected an active override')
    const voted = applyVoteDelta(base, delta)
    expect(scoreBreakdown(voted)).toEqual(
      expect.objectContaining({ votes: 9, total: 18.6 }),
    )
  })
})

describe('scoreStamp surface dispatch (ADR-0049)', () => {
  it('falls through to the Default stamp for every slug that has not claimed it', () => {
    for (const slug of ['albescent', 'na', null]) {
      expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), slug, DefaultScoreStamp))).toBe(DefaultScoreStamp)
    }
  })

  it('gives S.N.I.D.E. and Singularity their own stamps (#842)', () => {
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'snide', DefaultScoreStamp))).toBe(SnideScoreStamp)
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'singularity', DefaultScoreStamp))).toBe(
      SingularityScoreStamp,
    )
  })

  it('gives Everymen and the Ephemerists their own stamps (#841)', () => {
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'everymen', DefaultScoreStamp))).toBe(
      EverymenScoreStamp,
    )
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'ephemerists', DefaultScoreStamp))).toBe(
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
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'wow', DefaultScoreStamp))).toBe(WowScoreStamp)
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'coven', DefaultScoreStamp))).toBe(CovenScoreStamp)
  })

  it('gives UA its own stamp — the ensō (#857)', () => {
    expect(resolvedArchetype(pickVariant(surfaceMap('scoreStamp'), 'ua', DefaultScoreStamp))).toBe(UaScoreStamp)
  })
})

/**
 * The five conditional states of design v2, shared by both stamp waves below.
 *
 * `showsBase` is part of the state, not a detail of one skin: 'base only' is the
 * #1131 empty state, where the figure equals the total and the row would print it
 * twice, so every stamp must OMIT it there and print it in the other four.
 */
const STATES = [
  {
    name: 'base only',
    fields: { display_multiplier: 1, metatask_points: 0, points_from_votes: 0, score: 12 },
    showsBase: false,
  },
  {
    name: '+ votes',
    fields: { display_multiplier: 1, metatask_points: 0, points_from_votes: 4, score: 16 },
    showsBase: true,
  },
  {
    name: '× mult',
    fields: { display_multiplier: 0.8, metatask_points: 0, points_from_votes: 0, score: 9.6 },
    showsBase: true,
  },
  {
    name: '+ metatask',
    fields: { display_multiplier: 1, metatask_points: 20, points_from_votes: 0, score: 32 },
    showsBase: true,
  },
  {
    name: 'full formula',
    fields: { display_multiplier: 0.8, metatask_points: 20, points_from_votes: 4, score: 29.6 },
    showsBase: true,
  },
] as const

/**
 * Every stamp labels the row from the same key, so one assertion covers all
 * eight: the label is present exactly when the resolver kept the figure.
 */
function expectBaseRow(html: string, showsBase: boolean) {
  if (showsBase) expect(html).toContain('base')
  else expect(html).not.toContain('base')
}

/**
 * The five conditional states of design v2, on both #841 stamps. The failure
 * mode this guards is not a missing row — `scoreBreakdown` is tested above —
 * but a stamp that stops READING as itself when a row drops out: a tally whose
 * subtotal rule floats with nothing above it, or a rubric with no working over
 * it. Each state must still print the total and its own device.
 */
describe('#841 stamps across the conditional states (ADR-0047)', () => {
  for (const { name, fields, showsBase } of STATES) {
    it(`Everymen prints the tally and the roundel — ${name}`, () => {
      const html = text(renderToStaticMarkup(<EverymenScoreStamp praxis={praxis({ ...fields })} />))
      expect(html).toContain('TALLY')
      expect(html).toContain('ON THE RECORD')
      // The roundel carries the total whichever rows are present.
      expect(html).toContain(fields.score.toFixed(1))
      // The votes row survives at 0 — the deliberate ADR-0047 deviation.
      expect(html).toContain('votes')
      expectBaseRow(html, showsBase)
      expect(html).not.toMatch(HEX)
    })

    it(`Ephemerists prints the working and the rubric — ${name}`, () => {
      const html = text(
        renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis({ ...fields })} />),
      )
      expectBaseRow(html, showsBase)
      expect(html).toContain('from votes')
      expect(html).toContain(fields.score.toFixed(1))
      expect(html).not.toMatch(HEX)
    })

    it(`UA prints the score box and the ensō — ${name}`, () => {
      const markup = renderToStaticMarkup(<UaScoreStamp praxis={praxis({ ...fields })} />)
      const html = text(markup)
      expectBaseRow(html, showsBase)
      // The votes row survives at 0 — the deliberate ADR-0047 deviation.
      expect(html).toContain('from votes')
      expect(html).toContain(fields.score.toFixed(1))
      expect(html).toContain('points')
      // The total mark is the ensō, masked from the asset and tinted by a token.
      expect(markup).toContain('/factionMarks/enso.webp')
      expect(markup).toContain('var(--faction-ua-card-enso)')
      expect(markup).not.toMatch(HEX)
    })
  }

  for (const { name, fields, showsBase } of STATES) {
    it(`WOW prints the working and keeps the star — ${name}`, () => {
      const html = text(renderToStaticMarkup(<WowScoreStamp praxis={praxis({ ...fields })} />))
      expectBaseRow(html, showsBase)
      expect(html).toContain('from votes')
      expect(html).toContain(fields.score.toFixed(1))
      // The retired ✦ survives here and only here — see ADR-0050 / the design
      // README's carve-out. Losing it is half of what #840 exists to fix.
      expect(html).toContain('✦')
      expect(html).not.toMatch(HEX)
    })

    it(`Coven prints the working and keeps the sparkle — ${name}`, () => {
      const html = text(renderToStaticMarkup(<CovenScoreStamp praxis={praxis({ ...fields })} />))
      expectBaseRow(html, showsBase)
      expect(html).toContain('from votes')
      expect(html).toContain(fields.score.toFixed(1))
      expect(html).toContain('✨')
      expect(html).not.toMatch(HEX)
    })
  }

  /**
   * The sticker is not a rectangle and the plate is not upright — #821 replaced
   * both with the same level bordered box. Geometry, unlike copy, has no other
   * assertion that would catch it going flat again.
   */
  it('keeps each faction its own geometry: WOW struck at -2deg, Coven pinned crooked at -3deg under a braid', () => {
    const wow = renderToStaticMarkup(<WowScoreStamp praxis={praxis({})} />)
    const coven = renderToStaticMarkup(<CovenScoreStamp praxis={praxis({})} />)
    expect(wow).toContain('rotate(-2deg)')
    expect(coven).toContain('rotate(-3deg)')
    // #1209: the DASHED edge went with the pink marker sticker — it existed to
    // match a die-cut this faction no longer draws. The braid is what rules a
    // Coven surface, so that is what the working is tallied under now.
    expect(coven).toContain('cvn-braid')
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
  for (const { name, fields, showsBase } of STATES) {
    it(`S.N.I.D.E. prints the working and the total in pts — ${name}`, () => {
      const html = text(renderToStaticMarkup(<SnideScoreStamp praxis={praxis({ ...fields })} />))
      expectBaseRow(html, showsBase)
      expect(html).toContain('from votes')
      expect(html).toContain(fields.score.toFixed(1))
      expect(html).toContain('pts')
      expect(html).not.toMatch(HEX)
    })

    it(`Singularity prints the register and the two-decimal total — ${name}`, () => {
      const html = text(
        renderToStaticMarkup(<SingularityScoreStamp praxis={praxis({ ...fields })} />),
      )
      expectBaseRow(html, showsBase)
      expect(html).toContain('tot')
      // The terminal pads its output: two decimals, and a zero-padded votes row.
      expect(html).toContain(fields.score.toFixed(2))
      expect(html).toContain(`+${String(fields.points_from_votes).padStart(2, '0')}`)
      expect(html).not.toMatch(HEX)
    })

    it(`the unaffiliated sheet prints the working and the total — ${name}`, () => {
      const html = text(renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ ...fields })} />))
      expectBaseRow(html, showsBase)
      expect(html).toContain('from votes')
      expect(html).toContain(fields.score.toFixed(1))
      expect(html).toContain('points')
      expect(html).not.toMatch(HEX)
    })
  }
})

/**
 * #1131 on every registered stamp at once. The rule lives in `scoreBreakdown`,
 * but each skin still has to ACT on the null — nine files built their own row
 * arrays from the resolver's nulls, and a skin that interpolates `base` straight
 * into JSX would render an empty label instead of dropping the row. So this
 * asserts the state on all eight rather than trusting the resolver test.
 *
 * The state is the commonest one on the site: a freshly submitted praxis, before
 * anyone votes, under `era_1`'s neutral ×1.0 — which is also what the composer's
 * waiting surface shows the moment you submit.
 */
describe('the base row leaves every stamp when it restates the total (#1131)', () => {
  const STAMPS = [
    ['the unaffiliated sheet', DefaultScoreStamp],
    ['Everymen', EverymenScoreStamp],
    ['the Ephemerists', EphemeristsScoreStamp],
    ['S.N.I.D.E.', SnideScoreStamp],
    ['Singularity', SingularityScoreStamp],
    ['WOW', WowScoreStamp],
    ['Coven', CovenScoreStamp],
    ['UA', UaScoreStamp],
  ] as const

  /** No multiplier, no metatask, no votes: base IS the total. */
  const bare = praxis({
    task_point_value: 10,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 0,
    score: 10,
  })

  for (const [name, Stamp] of STAMPS) {
    it(`${name} states the figure once, and still says nobody has voted`, () => {
      const html = text(renderToStaticMarkup(<Stamp praxis={bare} />))
      expect(html).not.toContain('base')
      // The total mark stays — under ADR-0049 it is the faction's signature
      // device, so it is the one number that never drops out. Singularity's
      // two-decimal `10.00` contains this too.
      expect(html).toContain('10.0')
      // And the votes row stays at +0: ADR-0047's declared exception, which the
      // owner re-affirmed against hiding it alongside base.
      expect(html).toMatch(/votes/)
      // The label is gone, not blanked: no orphaned figure left behind.
      expect(html).not.toMatch(/\b10\b(?!\.)/)
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
  it('hides the multiplier row under a neutral era and shows it otherwise', () => {
    // era_1 neutralises own/other_task_modifier to 1.0 for every faction, so
    // the row is dark today and lights up on its own if an era configures one.
    const neutral = text(
      renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ display_multiplier: 1 })} />),
    )
    expect(neutral).not.toContain('mult')
    expect(neutral).not.toContain('×')

    const live = text(
      renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({ display_multiplier: 1.1 })} />),
    )
    expect(live).toContain('mult')
    expect(live).toContain('×1.10')
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

  it('draws the votes tally even at zero — an absent row cannot say "nobody voted"', () => {
    const unvoted = text(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={praxis({ points_from_votes: 0, score: 12 })} />,
      ),
    )
    expect(unvoted).toContain('0 from votes')
  })

  it('states votes as POINTS, never as a count of voters', () => {
    // `points_from_votes` is a points figure. The design printed "4 votes" as a
    // tally of people; the payload carries no such number and none is invented.
    const html = text(
      renderToStaticMarkup(
        <DefaultScoreStamp praxis={praxis({ points_from_votes: 7, score: 19 })} />,
      ),
    )
    expect(html).toContain('7 from votes')
  })

  it('keeps the struck disc and the spectrum bar, both from tokens', () => {
    const markup = renderToStaticMarkup(<DefaultScoreStamp praxis={praxis({})} />)
    // The disc is tilted off-square — a mark pressed in, not a printed field.
    expect(markup).toContain('rotate(-7deg)')
    // The spectrum is the shared token, never a pasted gradient literal.
    expect(markup).toContain('var(--faction-default-rainbow)')
    expect(markup).not.toMatch(HEX)
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
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
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
        pickVariant(surfaceMap('scoreStamp'), covenDetail.task_faction_slug, DefaultScoreStamp),
      ),
    ).toBe(CovenScoreStamp)
  })
})
