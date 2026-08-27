/**
 * The unsubmit confirm says what the unsubmit actually does (#1094).
 *
 * One prompt used to cover every praxis — "Sure? Points & votes will pause." —
 * which is true of a solo and of nothing else. Each case below is asserted
 * against `unsubmit_praxis` (`backend/services/praxis.py`), not against the
 * words alone:
 *
 *  - published collab: the whole group reopens and EVERY member's
 *    `has_submitted` clears, so the prompt must not read as "your part".
 *  - collab mid-consensus (`pending`, caller has cast): `on_member_unsubmit`
 *    pulls back only the caller's part; co-authors' casts stand. Pending
 *    praxes are unscored, so there is no points-and-votes half to promise.
 *  - duel `active` AND duel `pending`: both are pre-settlement, a forfeit is
 *    marked only at `settled` (ADR-0011 §Forfeit), so the copy is neutral and
 *    carries no consequence language. `pending` is here deliberately — the
 *    issue's four-case list named only `active`, but the backend pairs the two
 *    in `_LIVE_INCOMPLETE_DUEL_STATUSES` and #1077 already treats them
 *    identically in the composer's pull-back.
 *  - solo: byte-for-byte the shipped string.
 *
 * The `settled` duel forfeit dialog is covered by `duelForfeitWarning.test.tsx`
 * and is unchanged here — it is caught before this copy table is reached.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { PraxisSubmitControls, unsubmitCase } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut, PraxisMemberOut, PraxisStatus } from '../../../api/praxis'
import type { CharacterOut, CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelSideOut, DuelStatus } from '../../../api/duel'

/**
 * Rendered text with tags stripped and the entities React escapes (`&`, `'`)
 * put back, so an assertion can quote the catalog string as an editor wrote it.
 */
function text(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function member(characterId: number, name: string, hasSubmitted: boolean): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    character_avatar_url: '',
    has_submitted: hasSubmitted,
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
    members: [member(1, 'Ada', true)],
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

const ME: DuelSideOut = {
  praxis_id: 1,
  character_id: 1,
  display_name: 'Ada',
  faction_slug: 'wow',
  avatar_url: '',
  points_from_votes: 0,
  is_submitted: true,
  nudged_at: null,
}
const FOE: DuelSideOut = {
  praxis_id: 2,
  character_id: 2,
  display_name: 'Rax',
  faction_slug: 'snide',
  avatar_url: '',
  points_from_votes: 0,
  is_submitted: false,
  nudged_at: null,
}

function duel(status: DuelStatus): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status,
    forfeited_by_character_id: null,
    challenger: ME,
    opponent: FOE,
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
    showWithdrawConfirm: true,
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
    handleKickMember: async () => {},
    ...overrides,
  } as PraxisDetailState
}

const COLLAB_MEMBERS = [member(1, 'Ada', true), member(2, 'Beth', true)]

describe('unsubmitCase — the branch, straight off the backend', () => {
  it('a solo praxis is solo', () => {
    expect(unsubmitCase(praxis(), null)).toBe('solo')
  })

  it('a published collab reopens the whole group', () => {
    expect(unsubmitCase(praxis({ members: COLLAB_MEMBERS }), null)).toBe('collabGroup')
  })

  it('a collab mid-consensus pulls back only the caller part', () => {
    const pending = praxis({ members: COLLAB_MEMBERS, status: 'pending' as PraxisStatus })
    expect(unsubmitCase(pending, null)).toBe('collabOwnPart')
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'a duel at %s is a free live reopen, not a forfeit',
    (status) => {
      expect(unsubmitCase(praxis({ duel_id: 5 }), duel(status))).toBe('duelLive')
    },
  )

  it('a settled duel is NOT duelLive — the forfeit branch owns it', () => {
    expect(unsubmitCase(praxis({ duel_id: 5 }), duel('settled'))).not.toBe('duelLive')
  })
})

describe('unsubmit confirm copy (#1094)', () => {
  it('solo: the prompt names every real cost of reopening (#1397, #2094)', () => {
    // Unsubmit is the way to edit a published praxis now that the dead `/edit`
    // link is gone, so the prompt owes the player the things it costs that are
    // NOT free — all read straight off the backend:
    //  - the points: `unsubmit_praxis` recalculates member stats immediately,
    //    so the praxis' score leaves the total there and then. It does not
    //    "pause" (#2094), and on a solo the ONE author-resolved score set
    //    (ADR-0053) IS the reader's own figure, so the dialog can name it.
    //  - the votes: the docstring is explicit — "votes are preserved but stop
    //    scoring". The rows survive; they just bank nothing.
    //  - visibility: `praxis_visibility_condition` (ADR-0024) shows an
    //    `in_progress` praxis to its members only, and a solo has one member.
    //  - the date: `_apply_seal` is the only writer of `submitted_at` and sets
    //    it to `now` on EVERY seal, and the feed sorts on it — so a resubmitted
    //    praxis reappears at the top with a new date.
    // Everything else really is cheap (comments, media and `all_time_score`
    // survive; no cooldown, no cap), so the copy must not invent a warning.
    const rendered = text(
      <PraxisSubmitControls state={state({ praxis: praxis({ score: 42.5 }) })} />,
    )
    expect(rendered, 'the figure that leaves the total').toMatch(
      /42\.5 points come off your total/,
    )
    expect(rendered, 'votes are kept, they just stop banking').toMatch(
      /votes are kept but stop counting/i,
    )
    expect(rendered, 'members-only while editing').toMatch(/Only you can see it/)
    expect(rendered, 'the publish date is overwritten').toMatch(/new date/)
    expect(rendered, 'the retired half-truth is gone').not.toMatch(/points & votes pause/i)
    expect(rendered).toMatch(/Yes, unsubmit/)
  })

  it('solo: the figure is the score, formatted like every other total', () => {
    // `formatPoints` — one decimal, trailing zero trimmed — so the dialog and
    // the stamp on the same page cannot print one score two different ways.
    const rendered = text(
      <PraxisSubmitControls state={state({ praxis: praxis({ score: 55.0 }) })} />,
    )
    expect(rendered).toMatch(/55 points come off your total/)
    expect(rendered).not.toMatch(/55\.0/)
  })

  it('solo: the trigger reads as the way to edit (#1397)', () => {
    const rendered = text(
      <PraxisSubmitControls state={state({ showWithdrawConfirm: false })} />,
    )
    expect(rendered).toMatch(/unsubmit to edit/)
  })

  it('collab: the reader loses their own points AND uncasts the group', () => {
    const rendered = text(
      <PraxisSubmitControls state={state({ praxis: praxis({ members: COLLAB_MEMBERS }) })} />,
    )
    expect(rendered, "the reader's own consequence comes first").toMatch(
      /your points from this praxis come off your total/i,
    )
    expect(rendered, 'then what they are doing to everyone else').toMatch(
      /every other member's/i,
    )
    expect(rendered).toMatch(/whole group/i)
    expect(rendered).toMatch(/votes are kept but stop counting/i)
    expect(rendered).toMatch(/Yes, reopen for everyone/i)
    expect(rendered).not.toMatch(/points & votes pause/i)
    // The solo promise must not be the thing a co-author reads. Anchored on the
    // SHIPPED solo string (#1397) — quoting the retired one would pass vacuously.
    expect(rendered).not.toMatch(/Only you can see it/)
  })

  it('collab: NO figure — `score` is the AUTHOR\'s, not the reader\'s (#2094)', () => {
    // ADR-0053: the score fields are ONE set, resolved for the praxis AUTHOR on
    // every type including collab. A co-author reading this dialog would be
    // shown a number that is NOT what leaves their total — a worse error than
    // the vague one #2094 set out to fix. The owner ruled the collab prompt
    // numberless AND ruled out adding a per-member share to the wire, so this
    // guard is that ruling, not a stylistic preference.
    const rendered = text(
      <PraxisSubmitControls
        state={state({ praxis: praxis({ members: COLLAB_MEMBERS, score: 42.5 }) })}
      />,
    )
    expect(rendered).not.toMatch(/42\.5/)
  })

  it('collab mid-consensus: only your part comes back, and no scoring promise', () => {
    const rendered = text(
      <PraxisSubmitControls
        state={state({
          praxis: praxis({ members: COLLAB_MEMBERS, status: 'pending' as PraxisStatus }),
        })}
      />,
    )
    expect(rendered).toMatch(/only your part/i)
    expect(rendered).toMatch(/co-authors' casts stand/i)
    expect(rendered).toMatch(/Yes, pull my part back/i)
    // #2094 deliberately did NOT sweep this one up for consistency:
    // `unsubmit_praxis` returns early for `status == pending` and pending
    // praxes are unscored, so a points warning here would be a fresh lie.
    expect(rendered).not.toMatch(/points/i)
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'duel at %s: neutral pull-back wording, no forfeit language',
    (status) => {
      const rendered = text(
        <PraxisSubmitControls
          state={state({ praxis: praxis({ duel_id: 5 }), duel: duel(status) })}
        />,
      )
      // Points FIRST, then the reassurance (#2094). The false "points pause"
      // claim rode along unexamined precisely because it trailed the good news.
      expect(rendered).toMatch(/your points from this entry come off your total/i)
      expect(rendered).toMatch(/nothing is marked against you/i)
      expect(rendered).toMatch(/pulling back now is free/i)
      expect(rendered).toMatch(/Yes, pull my entry back/i)
      expect(rendered).not.toMatch(/forfeit/i)
      expect(rendered).not.toMatch(/wins by default/i)
      expect(rendered).not.toMatch(/points & votes pause/i)
      // Nor the solo prompt it used to fall through to (shipped string, #1397).
      expect(rendered).not.toMatch(/Only you can see it/)
    },
  )

  it.each<DuelStatus>(['pending', 'active'])(
    'duel at %s: the trigger itself is the neutral pull-back verb',
    (status) => {
      const rendered = text(
        <PraxisSubmitControls
          state={state({
            praxis: praxis({ duel_id: 5 }),
            duel: duel(status),
            showWithdrawConfirm: false,
          })}
        />,
      )
      expect(rendered).toMatch(/pull my entry back/i)
      expect(rendered).not.toMatch(/forfeit/i)
    },
  )
})
