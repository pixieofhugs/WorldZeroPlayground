/**
 * What the side-by-side reader draws, per state (#1084, ADR-0092): markup
 * claims only, no DOM. Archetypes are walked from `surfaceMap('duelReader')`,
 * never a hand-typed slug list.
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

// No DOM means the server snapshot ('desktop'); the phone branch needs this
// mock. Spread the original: a bare factory blanks sibling exports.
vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

function side(overrides: Partial<DuelSideOut> = {}): DuelSideOut {
  return {
    avatar_url: '',
    character_id: 7,
    display_name: 'Wren Ashgrove',
    faction_slug: 'coven',
    is_submitted: true,
    nudged_at: null,
    win_multiplier: 1,
    loss_multiplier: 1,
    tie_multiplier: 1,
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

  // A collapsed header keeps the full byline row.
  const SURVIVES_COLLAPSE = ['Wren Ashgrove', 'Otho Vane', '7.4', '4.8']

  it.each(SURVIVES_COLLAPSE)('phone states %s too', (fact) => {
    expect(render({}, 'mobile')).toContain(fact)
  })

  it('defers only the closed entry\'s own title and body', () => {
    // Arrived from the leading challenger, so the opponent's panel opens.
    const markup = render({}, 'mobile')
    expect(markup).toContain('Logged every attempt, then read the log')
    expect(markup).not.toContain('Six mornings on the north wall')
  })

  it('draws two columns on desktop and two panels on a phone', () => {
    expect(render({}).match(/<button/g)).toBeNull()
    expect(render({}, 'mobile').match(/<button/g)).toHaveLength(2)
  })

  it('opens exactly one panel on a phone', () => {
    const markup = render({}, 'mobile')
    expect(markup.match(/aria-expanded="true"/g)).toHaveLength(1)
    expect(markup.match(/aria-expanded="false"/g)).toHaveLength(1)
  })

  it('opens the side that is BEHIND, not the one arrived from', () => {
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
    expect(markup).toContain('Six mornings on the north wall')
    expect(markup).toContain('Logged every attempt, then read the log')
  })

  it('draws NO caster for a duellist, and no plate over the hole', () => {
    // A participant gets `viewer_can_vote: false` on BOTH sides (ADR-0041), so
    // sees no caster (the design says one). The plate goes with it (#1429).
    const markup = render({
      praxes: {
        challenger: praxis({ viewer_can_vote: false }),
        opponent: { ...OPPONENT_PRAXIS, viewer_can_vote: false },
      },
    })
    expect(markup).not.toContain('Cast your vote')
    expect(markup).not.toContain('How much did this move you?')
    expect(markup).toContain('Six mornings on the north wall')
    expect(markup).toContain('Logged every attempt, then read the log')
  })

  it('draws two casters for a spectator', () => {
    const markup = render({})
    expect(markup.match(/Cast your vote/g)).toHaveLength(2)
    expect(markup.match(/How much did this move you\?/g)).toHaveLength(2)
  })
})

describe('a forfeited side has no body, and the page still draws', () => {
  /** A forfeited praxis drops to `in_progress` (ADR-0011 §Forfeit) and 403s
   *  for other readers; the page must still draw. */
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
    // Absent, not losing: a forfeit stops the tally deciding.
    expect(markup).not.toContain('7.4')
  })

  it('draws the surviving entry in full', () => {
    const markup = render(FORFEIT)
    expect(markup).toContain('Logged every attempt, then read the log')
    expect(markup).toContain('Forty-one attempts across nine sessions.')
  })

  it('offers no link into the withdrawn side, which would 404', () => {
    expect(render(FORFEIT).match(/Read their praxis/g)).toHaveLength(1)
    expect(render(FORFEIT)).not.toContain('href="/praxis/601"')
  })

  it('still reads at both widths', () => {
    expect(render(FORFEIT, 'mobile')).toContain('Won by default')
  })
})

describe('the standing reads out, and never as a verdict while voting is open', () => {
  it('prints the live sentence WHOLE on a settled duel', () => {
    // The winner floats until era close (ADR-0052); never phrase it as decided.
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
    expect(markup).not.toContain('7.4')
    expect(markup).toContain('4.8')
  })
})

describe('what the design draws that the standing sentence does not say', () => {
  it('names the task both entries were completing, with its level and worth', () => {
    const markup = render({})
    expect(markup).toContain('Completing task')
    expect(markup).toContain('Climb the north wall six times')
    expect(markup).toContain('Level 2')
    expect(markup).toContain('href="/tasks/101"')
  })

  it('gives the winner one spectrum rule on a resolved duel, and only then', () => {
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
    expect(before).toBeGreaterThan(0)
    expect(after).toBe(before + 1)
  })

  it('draws no winner rule while voting is open', () => {
    // Settled = no winner yet; a winner mark would be brief §6's victory screen.
    const settled = render({ duel: duel({ winner_character_id: 7 }) })
    const noWinner = render({ duel: duel({ winner_character_id: null }) })
    expect(settled.match(/class="spectrum-rule"/g)?.length).toBe(
      noWinner.match(/class="spectrum-rule"/g)?.length,
    )
  })

  it("hides 'Read their praxis' on the entry the viewer wrote", () => {
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
    // ADR-0088: faction speaks only through the sigil, so nothing to redact.
    const albescent = render({
      duel: duel({ opponent: { ...OPPONENT, faction_slug: 'albescent' } }),
    })
    for (const name of ['Albescent', 'Coven', 'Singularity', 'S.N.I.D.E.']) {
      expect(albescent).not.toContain(name)
    }
  })
})

describe('every registered archetype draws the whole surface', () => {
  const registered = Object.entries(surfaceMap('duelReader'))

  it('has archetypes to walk at all', () => {
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
