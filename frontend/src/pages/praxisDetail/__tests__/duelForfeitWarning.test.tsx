/**
 * Settled-duel forfeit escalation on the submit/pull-back/forfeit control (#718).
 *
 * The asymmetry this guards is the whole point of the issue, and it is exactly
 * the kind of thing a "warn on any duel" implementation gets wrong:
 *
 *  - `settled` (both sides cast): unsubmitting is a PERMANENT forfeit — the
 *    opponent wins by default (ADR-0011 §Forfeit; the backend forfeits only at
 *    `status == settled`). The confirm must say so, in the forfeit's own verb.
 *  - `active` (opponent hasn't cast): unsubmitting is a FREE neutral reopen. The
 *    warning must NOT appear — telling a player they're about to forfeit when
 *    they aren't would cost them an edit they were entitled to make.
 *
 * The cost figures come from the mocked game config, so a Snide side is told it
 * keeps 0 rather than an invented "half".
 *
 * #752 relocated this control from the owner controls into the duel RAIL, so the
 * duel cases below mount `PraxisSubmitControls` directly. #1090 deleted the rail
 * — the duel is a reading card now and owner actions live in the main column
 * (epic #1085) — so the control came BACK inline, and the last two cases pin the
 * un-relocation: the owner controls render it for a duel praxis and an ordinary
 * one alike, which is still exactly one mount site (the #646 rule).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import type { CharacterOut, CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../../api/duel'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import { aMember } from '../../../test/fixtures'

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    // #1869: Singularity's perk flag. Irrelevant to the duel axis these
    // fixtures exercise, but part of the contract.
    reads_the_array: false,
  }
}

const CONFIG = {
  factions: [faction('snide', 2.0, 0.0), faction('wow', 1.5, 0.5)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => CONFIG }))

const { PraxisOwnerActions, PraxisSubmitControls } = await import('../shared')

function text(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>).replace(/<[^>]*>/g, '')
}

const MEMBER = aMember({
  id: 10,
  character_id: 1,
  character_display_name: 'Ada',
})

function praxis(): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: 'Mangrove',
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: null,
    type: 'solo',
    status: 'submitted',
    title: 'Reforestation',
    body_text: 'Seedlings.',
    moderation_status: 'visible',
    admin_note: null,
    flagged_at: null,
    submitted_at: '2026-01-02T00:00:00Z',
    submit_proposed_at: null,
    created_by_id: 1,
    created_by_display_name: 'Ada',
    created_by_avatar_url: '',
    created_by_faction_slug: 'snide',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    members: [MEMBER],
    invites: [],
    media_items: [],
    score: 0,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    is_top_for_task: false,
    duel_id: 5,
    can_flag: true,
    applied_metatasks: [],
    viewer_can_vote: true,
    viewer_vote: null,
    voter_count: 0,
  }
}

const ME: DuelSideOut = {
  praxis_id: 1,
  character_id: 1,
  display_name: 'Ada',
  faction_slug: 'snide',
  avatar_url: '',
  points_from_votes: 4,
  is_submitted: true,
  nudged_at: null,
}
const FOE: DuelSideOut = {
  praxis_id: 2,
  character_id: 2,
  display_name: 'Rax',
  faction_slug: 'wow',
  avatar_url: '',
  points_from_votes: 9,
  is_submitted: true,
  nudged_at: null,
}

function duel(status: DuelStatus, foeSubmitted: boolean): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status,
    forfeited_by_character_id: null,
    challenger: ME,
    opponent: { ...FOE, is_submitted: foeSubmitted },
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  }
}

function character(): CharacterOut {
  return {
    id: 1,
    username: 'ada',
    display_name: 'Ada',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 5,
    score: 0,
    all_time_score: 0,
    faction_slug: 'snide',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
  }
}

function user(): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character: character(),
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: 'Era 1',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  }
}

function state(overrides: Partial<PraxisDetailState>): PraxisDetailState {
  return {
    loading: false,
    praxis: praxis(),
    fetchError: null,
    comments: null,
    voters: [],
    duel: null,
    isOwner: true,
    showAdminBar: false,
    user: user(),
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: '',
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: '',
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    ...overrides,
  } as PraxisDetailState
}

describe('forfeit escalation (#718)', () => {
  it('settled duel: the confirm warns, names the winner, and quotes the cost', () => {
    const t = text(
      <PraxisSubmitControls
        state={state({ duel: duel('settled', true), showWithdrawConfirm: true })}
      />,
    )
    expect(t).toMatch(/FORFEITS the duel/i)
    expect(t).toMatch(/Rax wins by default/i)
    // Snide's loss modifier is 0.0 — the cost line must not invent a half.
    expect(t).toMatch(/you keep 0 instead of 60/i)
  })

  it('settled duel: the quiet unsubmit control takes the forfeit verb', () => {
    const t = text(<PraxisSubmitControls state={state({ duel: duel('settled', true) })} />)
    expect(t).toMatch(/Forfeit/i)
  })

  it('active duel: no warning — the reopen is still free', () => {
    const t = text(
      <PraxisSubmitControls
        state={state({ duel: duel('active', false), showWithdrawConfirm: true })}
      />,
    )
    expect(t).not.toMatch(/FORFEIT/i)
    expect(t).not.toMatch(/wins by default/i)
  })

  it('no duel at all: the ordinary confirm is untouched', () => {
    const t = text(<PraxisSubmitControls state={state({ showWithdrawConfirm: true })} />)
    expect(t).not.toMatch(/FORFEIT/i)
  })
})

// #1090: the rail that #752 moved this control into is gone, so the owner
// controls own it again for EVERY praxis. The invariant that matters is
// unchanged and is what these two cases pin — one mount site, never two rows of
// the same destructive control (#646). The duel card in the aside is a reading
// card: it draws no button in any state, which is why there is nowhere else for
// a second one to appear.
describe('owner controls carry the action cluster for every praxis (#1090)', () => {
  it('settled duel: the escalated forfeit confirm renders inline, not in a rail', () => {
    const t = text(
      <PraxisOwnerActions
        state={state({ duel: duel('settled', true), showWithdrawConfirm: true })}
      />,
    )
    // #2136 deleted the edit link that used to sit beside it, so the cluster is
    // the forfeit escalation and nothing else.
    expect(t).not.toMatch(/edit this praxis/i)
    // The forfeit escalation reaches the player through the owner controls now.
    expect(t).toMatch(/FORFEITS the duel/i)
    expect(t).toMatch(/Rax wins by default/i)
  })

  it('ordinary praxis: the cluster is unchanged', () => {
    const ordinary = { ...praxis(), duel_id: null }
    const t = text(
      <PraxisOwnerActions state={state({ praxis: ordinary, showWithdrawConfirm: true })} />,
    )
    expect(t).toMatch(/Yes, unsubmit/i)
  })
})
