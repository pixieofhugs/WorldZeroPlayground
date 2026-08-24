/**
 * A published praxis offers its owner ONE control, and it is not a link to
 * `/edit` (#2136).
 *
 * #1397 hid the link on the `handoff` phase only, so the pair survived wherever
 * `/edit` still drew something: a published collab and a settled duel reach
 * `completed`, a live duel side reaches `waiting`, a moderated praxis reaches
 * the locked composer. Every one of those surfaces is READ-ONLY, so "edit this
 * praxis" named an outcome it could not deliver, beside a control that could.
 * The ruling deleted the link rather than re-gating it: "There is no reason for
 * the player to go back to the edit page unless they are going to edit. One
 * button only."
 *
 * The seam under test is `PraxisOwnerActions`: given an owner's state, is a
 * `/praxis/:id/edit` href anywhere in the markup? The phases named below are
 * the ones #1397 deliberately KEPT — they are exactly what this change removes,
 * so they are the ones worth spelling out.
 *
 * The way to edit a published praxis is the surviving control: unsubmit →
 * confirm → `PraxisDetail` redirects the now-`in_progress` praxis straight into
 * the composer. So the unsubmit trigger must survive everywhere the link went.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { PraxisOwnerActions } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut, PraxisMemberOut, PraxisStatus } from '../../../api/praxis'
import type { CharacterOut, CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../../api/duel'

const EDIT_HREF = 'href="/praxis/1/edit"'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function member(characterId: number, name: string): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    character_avatar_url: '',
    has_submitted: true,
    is_done: false,
    joined_at: '2026-01-01T00:00:00Z',
    nudged_at: null,
    submitted_at: null,
  }
}

function praxis(overrides: Partial<PraxisOut> = {}): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: 'Mangrove',
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: null,
    type: 'solo',
    // EVERY case here is submitted: ADR-0062 means nothing else reaches the page.
    status: 'submitted' as PraxisStatus,
    title: 'Reforestation',
    body_text: 'Seedlings.',
    moderation_status: 'visible',
    admin_note: null,
    flagged_at: null,
    submitted_at: '2026-01-02T00:00:00Z',
    submit_proposed_at: null,
    created_by_id: 1,
    created_by_display_name: 'Ada',
    created_by_faction_slug: 'wow',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    members: [member(1, 'Ada')],
    invites: [],
    media_items: [],
    score: 0,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 0,
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
    ...overrides,
  } as PraxisOut
}

function duel(status: DuelStatus): DuelDetailOut {
  const side = (praxisId: number, characterId: number, name: string): DuelSideOut => ({
    praxis_id: praxisId,
    character_id: characterId,
    display_name: name,
    faction_slug: 'wow',
    avatar_url: '',
    points_from_votes: 0,
    is_submitted: true,
    nudged_at: null,
  })
  return {
    id: 5,
    task_id: 7,
    status,
    forfeited_by_character_id: null,
    challenger: side(1, 1, 'Ada'),
    opponent: side(2, 2, 'Rax'),
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  }
}

function user(): CurrentUser {
  const character: CharacterOut = {
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
    faction_slug: 'wow',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
  }
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character,
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
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
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
    ...overrides,
  } as PraxisDetailState
}

const COLLAB_MEMBERS = [member(1, 'Ada'), member(2, 'Beth')]

describe('no owner state offers a link to /edit (#2136)', () => {
  it('a submitted solo praxis', () => {
    const { html } = render(<PraxisOwnerActions state={state({})} />)
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a one-member collab', () => {
    const { html } = render(
      <PraxisOwnerActions state={state({ praxis: praxis({ type: 'collab' }) })} />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a declined challenge', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ duel_id: 5 }), duel: duel('declined') })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  // The four below are the phases #1397 kept: `/edit` still draws a real
  // surface for each, and every one of those surfaces is read-only.
  it('a published collab, which used to reach the completed reading', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'a duel side at %s, which used to reach the waiting surface',
    (status) => {
      const { html } = render(
        <PraxisOwnerActions
          state={state({ praxis: praxis({ duel_id: 5 }), duel: duel(status) })}
        />,
      )
      expect(html).not.toContain(EDIT_HREF)
    },
  )

  it('a settled duel side, which used to reach the completed reading too', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ duel_id: 5 }), duel: duel('settled') })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a moderated praxis, which used to reach its own locked composer', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ moderation_status: 'failed' }) })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('and the copy goes with the href', () => {
    const { text } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(text).not.toContain('edit this praxis')
  })
})

describe('the one control that remains (#2136)', () => {
  it('is the quiet unsubmit, on a published solo', () => {
    const { text } = render(<PraxisOwnerActions state={state({})} />)
    expect(text.toLowerCase()).toContain('unsubmit')
  })

  it('and on a published collab, where the link used to sit beside it', () => {
    const { text } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(text.toLowerCase()).toContain('unsubmit')
  })
})
