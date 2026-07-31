/**
 * The owner's "edit this praxis" link only shows when `/edit` has something to
 * draw (#1397).
 *
 * `/praxis/:id/edit` renders `EditPraxis`, which `<Navigate replace>`s back to
 * `/praxis/:id` whenever `deriveEditPraxisPhase` answers `handoff` (#1164). The
 * link here was gated on `isOwner` alone, and this page only ever renders a
 * PUBLISHED praxis (ADR-0062 redirects both open statuses to the composer) — so
 * on a submitted solo it round-tripped every single time it was visible, with
 * `replace` swallowing even the history trace. "It did not route me anywhere."
 *
 * The seam under test is `PraxisOwnerActions`: given a state, is a
 * `/praxis/:id/edit` href in the markup? The fix is a hide, not a removal, so
 * every non-handoff phase below is asserted to KEEP its link — otherwise this
 * file could not tell "dropped the dead link" from "dropped editing".
 *
 * The way to edit a published praxis is the control in the same flex row:
 * unsubmit → confirm → `PraxisDetail` redirects the now-`in_progress` praxis
 * straight into the composer. So the unsubmit trigger must survive wherever the
 * edit link goes.
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
    has_submitted: true,
    joined_at: '2026-01-01T00:00:00Z',
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
  })
  return {
    id: 5,
    task_id: 7,
    status,
    forfeited_by_character_id: null,
    challenger: side(1, 1, 'Ada'),
    opponent: side(2, 2, 'Rax'),
    viewer_is_participant: true,
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
    bio: null,
    avatar_url: null,
    location: null,
    level: 5,
    score: 0,
    all_time_score: 0,
    faction_slug: 'wow',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  }
  return {
    account_id: 1,
    character,
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

describe('the dead edit link is gone (#1397)', () => {
  it('a submitted solo praxis offers its owner no link to /edit', () => {
    const { html } = render(<PraxisOwnerActions state={state({})} />)
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a one-member collab hands off the same way, so it loses the link too', () => {
    const { html } = render(
      <PraxisOwnerActions state={state({ praxis: praxis({ type: 'collab' }) })} />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a declined challenge is an ordinary published solo — no link', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ duel_id: 5 }), duel: duel('declined') })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('the way to edit — the unsubmit control — survives beside it', () => {
    const { text } = render(<PraxisOwnerActions state={state({})} />)
    expect(text.toLowerCase()).toContain('unsubmit')
  })
})

describe('every phase that /edit still draws keeps its link (#1397)', () => {
  it('a published collab reaches the completed reading', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(html).toContain(EDIT_HREF)
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'a duel side at %s reaches the waiting surface',
    (status) => {
      const { html } = render(
        <PraxisOwnerActions
          state={state({ praxis: praxis({ duel_id: 5 }), duel: duel(status) })}
        />,
      )
      expect(html).toContain(EDIT_HREF)
    },
  )

  it('a moderated praxis reaches its own locked composer', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ moderation_status: 'failed' }) })}
      />,
    )
    expect(html).toContain(EDIT_HREF)
  })
})
