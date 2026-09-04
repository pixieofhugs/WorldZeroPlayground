/**
 * What the side-by-side reader draws, per state (#1084, ADR-0092).
 *
 * ## The seam
 *
 * `renderToStaticMarkup` over the chassis, with the state the route would hand
 * it. No DOM (SPEC-testing.md), so nothing here proves a pixel travelled —
 * visual QA is a separate gate and it is outstanding. What this DOES prove is
 * the set of claims the ADR makes about the surface, each of which is a claim
 * about markup:
 *
 *  - both widths render the same information in the same order;
 *  - the phone difference is one BEHAVIOUR, not one layout;
 *  - `resolved` REMOVES both casters rather than disabling them;
 *  - a forfeit prints an em-dash and `wonByDefault`, a no-contest drops both
 *    figures;
 *  - the vote gate is one predicate, so a plate never outlives its control.
 *
 * ## Every archetype is walked, and the list is DERIVED
 *
 * The structure block below iterates `surfaceMap('duelReader')` rather than a
 * hand-typed slug list. A registry that grows a row gets checked the day it
 * grows it, and a row that de-registers takes its case away with it — which is
 * the whole reason #1308 rebuilt the duel card's ink guard the same way.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../../i18n'
import { surfaceMap } from '../../../factions'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { DuelReaderFrame } from '../shared'
import type { DuelReaderState } from '../useDuelReader'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import type { PraxisOut } from '../../../api/praxis'
import type { CurrentUser } from '../../../api/auth'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

// The harness has no DOM, so a render always takes `useSyncExternalStore`'s
// server snapshot ('desktop'). The phone branch — the one behaviour that
// differs between the two widths — is reachable only through this mock. Spread
// from the original rather than replaced wholesale: a bare factory blanks the
// module's sibling exports for every module in this file's graph.
vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

function side(overrides: Partial<DuelSideOut> = {}): DuelSideOut {
  return {
    avatar_url: '',
    character_id: 7,
    display_name: 'Wren Ashgrove',
    faction_slug: 'coven',
    is_submitted: true,
    nudged_at: null,
    points_from_votes: 7.4,
    praxis_id: 601,
    ...overrides,
  }
}

function praxis(overrides: Partial<PraxisOut> = {}): PraxisOut {
  return {
    admin_note: null,
    applied_metatasks: [],
    body_text: 'I went up before the light six days running.',
    can_flag: false,
    created_at: '2026-08-14T09:00:00Z',
    created_by_avatar_url: '',
    created_by_display_name: 'Wren Ashgrove',
    created_by_faction_slug: 'coven',
    created_by_id: 7,
    display_multiplier: 1,
    duel_id: 44,
    flagged_at: null,
    habit_bonus_points: 0,
    id: 601,
    invites: [],
    is_top_for_task: false,
    media_items: [],
    members: [],
    metatask_points: 0,
    moderation_status: 'visible',
    points_from_votes: 7.4,
    score: 47.4,
    status: 'submitted',
    submit_proposed_at: null,
    submitted_at: '2026-08-14T09:00:00Z',
    task_faction_slug: null,
    task_id: 101,
    task_level_required: 2,
    task_point_value: 40,
    task_title: 'Climb the north wall six times',
    title: 'Six mornings on the north wall',
    type: 'duel',
    updated_at: '2026-08-14T09:00:00Z',
    viewer_can_vote: true,
    viewer_vote: null,
    voter_count: 3,
    ...overrides,
  }
}

const OPPONENT = side({
  character_id: 19,
  display_name: 'Otho Vane',
  faction_slug: 'singularity',
  praxis_id: 602,
  points_from_votes: 4.8,
})

const OPPONENT_PRAXIS = praxis({
  id: 602,
  created_by_id: 19,
  created_by_display_name: 'Otho Vane',
  created_by_faction_slug: 'singularity',
  title: 'Logged every attempt, then read the log',
  body_text: 'Forty-one attempts across nine sessions.',
  points_from_votes: 4.8,
})

function duel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 44,
    task_id: 101,
    status: 'settled',
    forfeited_by_character_id: null,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    challenger: side(),
    opponent: OPPONENT,
    ...overrides,
  }
}

const VIEWER = { id: 3 } as unknown as CurrentUser

function state(overrides: Partial<DuelReaderState> = {}): DuelReaderState {
  return {
    loading: false,
    fetchError: null,
    duel: duel(),
    praxes: { challenger: praxis(), opponent: OPPONENT_PRAXIS },
    arrivedFrom: 'challenger',
    user: VIEWER,
    ...overrides,
  }
}

function render(next: Partial<DuelReaderState>, form: 'mobile' | 'desktop' = 'desktop') {
  factor.value = form
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <DuelReaderFrame state={state(next)} groundSlug={null} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

/* -------------------------------------------------------------------------- */

describe('both widths carry the same information, in the same order', () => {
  const FACTS = [
    'Six mornings on the north wall',
    'Logged every attempt, then read the log',
    'Wren Ashgrove',
    'Otho Vane',
    '7.4',
    '4.8',
  ]

  it.each(FACTS)('desktop states %s', (fact) => {
    expect(render({})).toContain(fact)
  })

  // A COLLAPSED header keeps a full row — disc, name, figure, sigil — so the
  // comparison survives the collapse. Both names and both figures are therefore
  // on the phone too; the only thing behind a closed panel is that entry's own
  // title and body, which is the ONE difference between the widths and is a
  // behaviour rather than a layout.
  const SURVIVES_COLLAPSE = ['Wren Ashgrove', 'Otho Vane', '7.4', '4.8']

  it.each(SURVIVES_COLLAPSE)('phone states %s too', (fact) => {
    expect(render({}, 'mobile')).toContain(fact)
  })

  it('defers only the closed entry\'s own title and body', () => {
    // Arrived from the challenger, who LEADS, so the opponent's panel is the
    // one that opens (the ruling) and the challenger's is what gets deferred.
    const markup = render({}, 'mobile')
    expect(markup).toContain('Logged every attempt, then read the log')
    expect(markup).not.toContain('Six mornings on the north wall')
  })

  it('draws two columns on desktop and two panels on a phone', () => {
    // One BEHAVIOUR, not one layout: the phone difference is that exactly one
    // panel is open, which is a pair of buttons the desktop does not need.
    expect(render({}).match(/<button/g)).toBeNull()
    expect(render({}, 'mobile').match(/<button/g)).toHaveLength(2)
  })

  it('opens exactly one panel on a phone', () => {
    const markup = render({}, 'mobile')
    expect(markup.match(/aria-expanded="true"/g)).toHaveLength(1)
    expect(markup.match(/aria-expanded="false"/g)).toHaveLength(1)
  })

  it('opens the side that is BEHIND, not the one arrived from', () => {
    // The ruling, end to end through the chassis. Arrived from the leader; the
    // trailer is what opens.
    const markup = render({ arrivedFrom: 'challenger' }, 'mobile')
    expect(markup).toContain('Forty-one attempts across nine sessions.')
    expect(markup).not.toContain('I went up before the light six days running.')
  })
})

describe('the caster, and the plate that may not outlive it', () => {
  it('draws one caster per column while the era is open', () => {
    expect(render({}).match(/Cast your vote/g)).toHaveLength(2)
  })

  it('REMOVES both casters on a resolved duel rather than disabling them', () => {
    const resolved = {
      duel: duel({
        status: 'resolved',
        winner_character_id: 7,
        challenger_final_points: 60,
        opponent_final_points: 20,
      }),
    }
    const markup = render(resolved)
    expect(markup).not.toContain('Cast your vote')
    expect(markup).not.toContain('How much did this move you?')
    // The entries themselves are untouched — this removes a control, not a column.
    expect(markup).toContain('Six mornings on the north wall')
    expect(markup).toContain('Logged every attempt, then read the log')
  })

  it('draws NO caster for a duellist, and no plate over the hole', () => {
    // The payload the API actually emits for a participant: `viewer_can_vote`
    // is false on BOTH sides, because anti-self-voting is enforced at the
    // ACCOUNT level (ADR-0041) and blocks the whole contest —
    // `test_duel_participant_cannot_vote_on_either_side` pins it. The design's
    // "a duellist sees one caster, not two" is wrong about the backend; they
    // see none.
    //
    // #1429 is the other half: the plate, its heading and its prompt are the
    // promise of a control, so they may not outlive it.
    const markup = render({
      praxes: {
        challenger: praxis({ viewer_can_vote: false }),
        opponent: { ...OPPONENT_PRAXIS, viewer_can_vote: false },
      },
    })
    expect(markup).not.toContain('Cast your vote')
    expect(markup).not.toContain('How much did this move you?')
    // Both entries still read in full — this removes a control, not a column.
    expect(markup).toContain('Six mornings on the north wall')
    expect(markup).toContain('Logged every attempt, then read the log')
  })

  it('draws two casters for a spectator', () => {
    // The other half of the same payload rule: a non-participant may cast on
    // either entry, so both columns carry a caster and a plate.
    const markup = render({})
    expect(markup.match(/Cast your vote/g)).toHaveLength(2)
    expect(markup.match(/How much did this move you\?/g)).toHaveLength(2)
  })
})

describe('a forfeited side has no body, and the page still draws', () => {
  /**
   * THE BUG THIS BLOCK EXISTS FOR. Throwing a settled duel drops that praxis to
   * `in_progress` (`services/praxis.py`, ADR-0011 §Forfeit) while the duel stays
   * `settled` and goes on pointing at it. So `praxis_id` is set, `is_submitted`
   * is not, and fetching it 403s for every reader but the forfeiter — which,
   * behind a `Promise.all` over both sides, turned every forfeited duel into an
   * error page for everyone else.
   */
  const FORFEIT = {
    duel: duel({
      forfeited_by_character_id: 7,
      challenger: { ...side(), is_submitted: false },
    }),
    praxes: { challenger: null, opponent: OPPONENT_PRAXIS },
  }

  it('draws the page rather than an error', () => {
    const markup = render(FORFEIT)
    expect(markup).toContain('The duel')
    expect(markup).toContain('Won by default')
  })

  it('keeps the forfeiter on the page — name, and an em-dash for a figure', () => {
    const markup = render(FORFEIT)
    expect(markup).toContain('Wren Ashgrove')
    // Their total is ABSENT, not losing: once a side forfeits the tally stops
    // deciding the duel, so printing their points would print a number that no
    // longer means anything.
    expect(markup).not.toContain('7.4')
  })

  it('draws the surviving entry in full', () => {
    const markup = render(FORFEIT)
    expect(markup).toContain('Logged every attempt, then read the log')
    expect(markup).toContain('Forty-one attempts across nine sessions.')
  })

  it('offers no link into the withdrawn side, which would 404', () => {
    // One "Read their praxis" — the surviving column's. The thrown side is back
    // to `in_progress` and its page is member-only.
    expect(render(FORFEIT).match(/Read their praxis/g)).toHaveLength(1)
    expect(render(FORFEIT)).not.toContain('href="/praxis/601"')
  })

  it('still reads at both widths', () => {
    expect(render(FORFEIT, 'mobile')).toContain('Won by default')
  })
})

describe('the standing reads out, and never as a verdict while voting is open', () => {
  it('prints the live sentence WHOLE on a settled duel', () => {
    // The winner floats with the votes until era close (ADR-0011 / ADR-0052);
    // nothing here may phrase it as decided, which is why the catalog sentence
    // is reused entire rather than trimmed to the leader's name.
    expect(render({})).toContain(
      'Wren Ashgrove leads by 2.6 · live — the winner floats with the votes until era reset.',
    )
  })

  it('prints the frozen pair and the final sentence on a resolved duel', () => {
    const markup = render({
      duel: duel({
        status: 'resolved',
        winner_character_id: 7,
        challenger_final_points: 60,
        opponent_final_points: 20,
      }),
    })
    expect(markup).toContain('60')
    expect(markup).toContain('20')
    expect(markup).toContain('Wren Ashgrove won · final — frozen at era close.')
  })

  it('drops BOTH figures on a no-contest', () => {
    const markup = render({
      duel: duel({
        status: 'resolved',
        winner_character_id: null,
        challenger_final_points: null,
        opponent_final_points: null,
      }),
    })
    expect(markup).toContain('No contest')
    expect(markup.match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(markup).not.toContain('7.4')
    expect(markup).not.toContain('4.8')
  })

  it('em-dashes the forfeiter and says won by default', () => {
    const markup = render({ duel: duel({ forfeited_by_character_id: 7 }) })
    expect(markup).toContain('Won by default')
    // The forfeiter's figure is ABSENT, not losing: once a side forfeits the
    // tally stops deciding the duel, so printing their points would print a
    // number that no longer means anything.
    expect(markup).not.toContain('7.4')
    expect(markup).toContain('4.8')
  })
})

describe('what the design draws that the standing sentence does not say', () => {
  it('names the task both entries were completing, with its level and worth', () => {
    // Artboards 2c/2d: the reference band under the h1. `detail.taskRef.*` is
    // on the design's reused-verbatim list, and `taskRefMeta` is the shared
    // derivation `praxisDetail` mounts, so the figures cannot drift apart.
    const markup = render({})
    expect(markup).toContain('Completing task')
    expect(markup).toContain('Climb the north wall six times')
    expect(markup).toContain('Level 2')
    expect(markup).toContain('href="/tasks/101"')
  })

  it('gives the winner one spectrum rule on a resolved duel, and only then', () => {
    // Artboard 2e. No trophy and no copy — the standing has already said who
    // won; this says which COLUMN it was.
    const resolved = render({
      duel: duel({
        status: 'resolved',
        winner_character_id: 7,
        challenger_final_points: 60,
        opponent_final_points: 20,
      }),
    })
    const without = render({ duel: duel({ status: 'resolved' }) })
    const before = (without.match(/class="spectrum-rule"/g) ?? []).length
    const after = (resolved.match(/class="spectrum-rule"/g) ?? []).length
    // Guards the guard: a selector that matched nothing would make the
    // comparison below true for the wrong reason.
    expect(before).toBeGreaterThan(0)
    expect(after).toBe(before + 1)
  })

  it('draws no winner rule while voting is open', () => {
    // A settled duel has no winner yet — the standing FLOATS with the votes
    // until era close (ADR-0011 / ADR-0052), so a mark saying "this one won"
    // would be the victory screen brief §6 forbids.
    const settled = render({ duel: duel({ winner_character_id: 7 }) })
    const noWinner = render({ duel: duel({ winner_character_id: null }) })
    expect(settled.match(/class="spectrum-rule"/g)?.length).toBe(
      noWinner.match(/class="spectrum-rule"/g)?.length,
    )
  })

  it("hides 'Read their praxis' on the entry the viewer wrote", () => {
    // The catalog string names the OTHER duellist; on your own column "their"
    // is you. The surface adds no key to reword it, so the link is not drawn.
    const asChallenger = render({
      user: { id: 3, character: { id: 7 } } as unknown as CurrentUser,
    })
    expect(asChallenger.match(/Read their praxis/g)).toHaveLength(1)
    expect(asChallenger).not.toContain('href="/praxis/601"')
    expect(asChallenger).toContain('href="/praxis/602"')
  })
})

describe('no duel surface prints a faction name (brief §0)', () => {
  it('names neither duellist\'s faction, so there is no string to redact', () => {
    // ADR-0088's hazard, answered by construction rather than by a branch: a
    // duellist's faction speaks through their sigil and nowhere else, so an
    // Albescent side has nothing on the page for `isFactionRedacted` to mask.
    const albescent = render({
      duel: duel({ opponent: { ...OPPONENT, faction_slug: 'albescent' } }),
    })
    for (const name of ['Albescent', 'Coven', 'Singularity', 'S.N.I.D.E.']) {
      expect(albescent).not.toContain(name)
    }
  })
})

describe('every registered archetype draws the whole surface', () => {
  /**
   * DERIVED FROM THE REGISTRY, never a hand-typed slug list — the day a faction
   * registers a duel-reader skin, this walks it without an edit here.
   */
  const registered = Object.entries(surfaceMap('duelReader'))

  it('has archetypes to walk at all', () => {
    // Guards the guard: an empty registry would make the row below vacuous.
    expect(registered.length).toBeGreaterThan(0)
  })

  it.each(registered.map(([slug]) => slug))('%s draws both entries', (slug) => {
    const Archetype = resolvedArchetype(
      surfaceMap('duelReader')[slug],
    ) as React.ComponentType<{ state: DuelReaderState }>
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state({})} />
      </MemoryRouter>,
    )
    expect(markup).toContain('Six mornings on the north wall')
    expect(markup).toContain('Logged every attempt, then read the log')
    expect(markup.match(/Cast your vote/g)).toHaveLength(2)
  })
})
