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
 * duel cases below mount `PraxisSubmitControls` (its new home) directly. The
 * last two cases pin the relocation itself: the owner controls suppress the
 * cluster for a duel, and keep it for an ordinary praxis.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut, PraxisMemberOut } from '../../../api/praxis'
import type { CharacterOut, CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../../api/duel'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    can_always_rejoin: false,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
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

const MEMBER: PraxisMemberOut = {
  id: 10,
  praxis_id: 1,
  character_id: 1,
  character_display_name: 'Ada',
  has_submitted: true,
  joined_at: '2026-01-01T00:00:00Z',
}

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
    is_top_for_task: false,
    duel_id: 5,
    can_flag: true,
    applied_metatasks: [],
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
}
const FOE: DuelSideOut = {
  praxis_id: 2,
  character_id: 2,
  display_name: 'Rax',
  faction_slug: 'wow',
  avatar_url: '',
  points_from_votes: 9,
  is_submitted: true,
}

function duel(status: DuelStatus, foeSubmitted: boolean): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status,
    forfeited_by_character_id: null,
    challenger: ME,
    opponent: { ...FOE, is_submitted: foeSubmitted },
    viewer_is_participant: true,
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
    bio: null,
    avatar_url: null,
    location: null,
    level: 5,
    score: 0,
    all_time_score: 0,
    faction_slug: 'snide',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  }
}

function user(): CurrentUser {
  return {
    account_id: 1,
    character: character(),
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    second_character_level_required: 5,
    era_name: 'Era 1',
    level_jump_reach: 0,
    level_jump_available: false,
  }
}

function state(overrides: Partial<PraxisDetailState>): PraxisDetailState {
  return {
    loading: false,
    praxis: praxis(),
    fetchError: null,
    votes: null,
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

// #752: the control was relocated into the duel rail, so the owner controls must
// no longer render it for a duel praxis — otherwise a settled-duel Forfeit would
// sit in the rail AND an unsubmit in the owner controls, the #646 double control.
describe('owner controls suppress the duel action cluster (#752)', () => {
  it('settled duel: the owner controls render no submit/forfeit — the rail owns it', () => {
    const t = text(
      <PraxisOwnerActions
        state={state({ duel: duel('settled', true), showWithdrawConfirm: true })}
      />,
    )
    expect(t).not.toMatch(/FORFEIT/i)
    expect(t).not.toMatch(/wins by default/i)
    // the edit link is the only owner control left for a duel praxis.
    expect(t).toMatch(/Edit/i)
  })

  it('ordinary praxis: the owner controls still render the cluster inline', () => {
    // No duel_id, so `hasDuel` is false and the cluster stays in the owner
    // controls (there is no rail to move it to).
    const ordinary = { ...praxis(), duel_id: null }
    const t = text(
      <PraxisOwnerActions state={state({ praxis: ordinary, showWithdrawConfirm: true })} />,
    )
    expect(t).toMatch(/Yes, unsubmit/i)
  })
})
