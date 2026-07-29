/**
 * Shared behavior module for praxis-detail archetypes (ADR-0017 §2).
 *
 * These slots are faction-agnostic and must be rendered identically by
 * every archetype. They are extracted here so no archetype re-implements
 * the guards, handlers, or chrome — only the presentational slots differ.
 *
 * Invariant slots owned here:
 *   - Admin moderation bar
 *   - Crown hero + failed note (ADR-0062 removed the open-state banners: detail
 *     is published-only, so there is no IN EDITING / PENDING PUBLISH to draw)
 *   - Owner actions (edit / reopen)
 *   - Comments region (ADR-0061)
 *   - Voter breakdown
 *   - Flag block
 *
 * EVERY SLOT HERE STARTS FROM A PUBLISHED PRAXIS. ADR-0062 redirects both open
 * statuses to the composer, so `in_progress` and `pending` are unreachable on
 * this page; #1089 pruned the branches that only those statuses could reach (the
 * collab cast roster, the byline's per-member cast markers, and the green CAST
 * control with its waiting twin). Do not reintroduce a status branch here —
 * anything about an open praxis belongs to the composer's waiting surface
 * (#1071).
 *
 * The score readout that used to live at the bottom of this module — the LEGACY
 * `PraxisScoreBreakdown` / `praxisBreakdownParts` pair — is gone too. Its
 * fourteen callers were exactly the fourteen archetypes #1089 deleted, and the
 * dispatched `ScoreStamp` over `scoreBreakdown()` (ADR-0053) replaced it on the
 * rebuilt page in #1091. Mount `ScoreStamp`; do not re-derive points here.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { reframeLabel } from '../../components/vote/voteReframes'
import { TaskCrown } from '../../components/cards/TaskCrown'
import CommentThread from '../../components/comments/CommentThread'
import DuelSealConfirm from '../../components/duel/DuelSealConfirm'
import type { PraxisDetailState } from './usePraxisDetail'
import type { PraxisMemberOut, PraxisOut } from '../../api/praxis'
import type { DuelDetailOut } from '../../api/duel'
import { flagReasonOptions } from '../../utils/flagReasons'

// ── Egalitarian byline (#387) ────────────────────────────────────────────────
//
// A published collab praxis credits every co-author, not just the creator.
// `orderedMembers` returns the praxis members with the creator first, then the
// rest by join order; `MemberByline` renders each name as a link to that
// character, joined Oxford-style (Ada / Ada & Beth / Ada, Beth & Cy). Every
// archetype keeps its own byline styling by passing its own `linkStyle` — the
// list logic lives here once. Solo/duel praxes have a single member (the
// creator is always seeded), so they render exactly one name as before.

/**
 * Members ordered for display: the creator (member whose `character_id`
 * matches `created_by_id`) first, then remaining members by `joined_at`
 * ascending. Members without a matching creator still render in join order.
 */
export function orderedMembers(praxis: PraxisOut): PraxisMemberOut[] {
  const rest = praxis.members
    .filter((member) => member.character_id !== praxis.created_by_id)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  const creator = praxis.members.find(
    (member) => member.character_id === praxis.created_by_id,
  )
  return creator ? [creator, ...rest] : rest
}

export function MemberByline({
  praxis,
  linkStyle,
  linkClassName,
  separatorStyle,
  renderName,
}: {
  praxis: PraxisOut
  /** Per-archetype link styling so each faction voice stays distinct. */
  linkStyle?: CSSProperties
  linkClassName?: string
  /** Falls back to `linkStyle` so `, ` / ` & ` inherit the byline's look. */
  separatorStyle?: CSSProperties
  /** Optional wrapper for each display name (e.g. Singularity's `NODE_` prefix). */
  renderName?: (name: string) => ReactNode
}) {
  const members = orderedMembers(praxis)
  const sepStyle = separatorStyle ?? linkStyle
  // NO PER-MEMBER CAST STATE HERE ANY MORE (#1089). Each name used to carry a
  // "submitted" / "drafting" marker, gated to a collab still in_progress or
  // pending. ADR-0062 redirects both statuses to the composer, so a praxis that
  // reaches this byline is always `submitted` and the marker could never paint.
  // The live answer to "who still owes their part" is the composer's roster
  // (#1071); here the byline just credits every co-author (#387).

  return (
    <span
      style={{
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {members.map((member, index) => {
        const name = member.character_display_name || `#${member.character_id}`
        return (
          <span key={member.character_id}>
            {index > 0 && (
              <span style={sepStyle}>
                {index === members.length - 1 ? ' & ' : ', '}
              </span>
            )}
            <Link
              to={`/characters/${member.character_id}`}
              className={linkClassName}
              style={linkStyle}
            >
              {renderName ? renderName(name) : name}
            </Link>
          </span>
        )
      })}
    </span>
  )
}

// ── Admin moderation bar ─────────────────────────────────────────────────────

export function PraxisAdminBar({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, showAdminBar, adminFailNote, setAdminFailNote, showFailInput, setShowFailInput, moderating, moderateError, handleModerate } = state
  if (!showAdminBar || !praxis) return null

  return (
    <div className="sidebar-card mb-4" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('detail.admin.eyebrow')}
        </span>
        <span
          className="eyebrow"
          style={{
            padding: 'var(--space-xs) var(--space-sm)',
            border: '1px solid var(--color-border)',
            color: praxis.moderation_status === 'flagged' ? 'var(--color-danger)'
              : praxis.moderation_status === 'hidden' ? 'var(--color-text-tertiary)'
              : praxis.moderation_status === 'failed' ? 'var(--color-warning)'
              : 'var(--color-success)',
          }}
        >
          {praxis.moderation_status}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {praxis.moderation_status === 'flagged' && (
            <>
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)' }}>{t('detail.admin.approve')}</button>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)', borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}>{t('detail.admin.hide')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)', borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}>{t('detail.admin.fail')}</button>
            </>
          )}
          {praxis.moderation_status === 'visible' && (
            <>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)', borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}>{t('detail.admin.hide')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)', borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}>{t('detail.admin.fail')}</button>
            </>
          )}
          {(praxis.moderation_status === 'hidden' || praxis.moderation_status === 'failed') && (
            <>
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)' }}>{t('detail.admin.restore')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)', borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}>{t('detail.admin.fail')}</button>
            </>
          )}
        </div>
      </div>
      {showFailInput && (
        <div className="mt-2 flex gap-2 items-end">
          <textarea
            className="border-2 border-border bg-card px-3 py-1 font-body content-text focus:outline-none focus:border-ink flex-1 resize-none"
            rows={2}
            placeholder={t('detail.admin.failReasonPlaceholder')}
            value={adminFailNote}
            onChange={(e) => setAdminFailNote(e.target.value)}
          />
          <button
            onClick={() => void handleModerate('failed', adminFailNote)}
            disabled={moderating}
            className="btn-primary"
            style={{ background: 'var(--color-warning)', borderColor: 'var(--color-warning)', fontSize: 'var(--text-sm)' }}
          >
            {t('detail.admin.confirm')}
          </button>
        </div>
      )}
      {moderateError && <p className="font-body content-text mt-1" style={{ color: 'var(--color-danger)' }}>{moderateError}</p>}
    </div>
  )
}

// ── Comments region (ADR-0061, amending ADR-0006) ────────────────────────────

/**
 * The comments slot a rebuilt praxis-detail archetype mounts itself.
 *
 * ADR-0006 put the thread below every archetype as neutral chrome, and the
 * dispatcher mounted it there. ADR-0061 makes comments the page layout's THIRD
 * region — beneath the main column and the aside, inside the archetype's own
 * sheet — so the skin can dress its section head and place the thread. The
 * `moderation_status === 'visible'` gate lives here rather than in each
 * archetype: a thread renders on a visible praxis only, and one skin forgetting
 * that is exactly the drift this prevents (the task-detail lesson, #1030).
 *
 * Pass `heading` to supply a dressed section head; the thread's own
 * `{n} comments` `<h3>` is then suppressed so the page carries ONE heading for
 * one list (the #1029 trap, warned about on `CommentThread`'s own prop).
 *
 * The ROWS stay faction-dispatched on `comment.author.faction_slug` — a Snide
 * player's comment reads Snide on any page. ADR-0061 draws that boundary
 * explicitly: the neutral rule covers the page's own slots and stops at the
 * speaker's voice.
 */
export function PraxisDetailComments({
  state,
  heading,
  style,
}: {
  state: PraxisDetailState
  heading?: ReactNode
  style?: CSSProperties
}) {
  const { praxis } = state
  if (!praxis || praxis.moderation_status !== 'visible') return null
  return (
    <section style={style}>
      {heading}
      <CommentThread target="praxes" targetId={praxis.id} showHeading={heading === undefined} />
    </section>
  )
}

// ── Status banners ────────────────────────────────────────────────────────────

export function PraxisStatusBanners({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  return (
    <>
      {/* The read-only cast-status roster (#591) used to lead this block. It
          was gated to a still-resolving collab (in_progress / pending), which
          ADR-0062 now redirects to the composer, so it could never paint again
          and went with #1089. The composer's own roster (#1071) is where "who
          still owes their part" is answered, and a published praxis has the
          byline crediting every co-author instead. */}
      {/* Task Crown hero (ADR-0028) — this praxis is the task's top submitted
          entry, computed live. Invariant chrome, so every archetype shows it. */}
      {praxis.is_top_for_task && (
        <div
          style={{
            border: '2px solid var(--color-border)',
            borderRadius: 8,
            padding: 'var(--space-sm) var(--space-lg)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <TaskCrown size={34} ringInset={3} />
          <div>
            <span className="eyebrow" style={{ display: 'block' }}>{t('detail.banners.crownLabel')}</span>
            <span className="font-body content-text" style={{ color: 'var(--color-text-secondary)' }}>
              {t('detail.banners.crownBody')}
            </span>
          </div>
        </div>
      )}
      {/* The "IN EDITING" / "PENDING PUBLISH" pair used to sit here. Both are
          gone with ADR-0062: detail redirects `in_progress` AND `pending` to the
          composer, so neither banner could ever paint again. An open praxis now
          has one owner — the composer's waiting surface (#1071) — instead of two
          that described it differently. */}
      {praxis.moderation_status === 'failed' && praxis.admin_note && (
        <div style={{ background: 'rgba(220,38,38,0.05)', border: '2px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: 'var(--space-sm) var(--space-lg)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Ornament: a ✗ dingbat used as an icon, not readable text. Sized
              from the label tier (nearest token to its old 16px), never the
              content floor — see WORLD_ZERO_STYLE.md §4, ornament role. */}
          <span style={{ fontSize: 'var(--text-xl)' }}>&#10007;</span>
          <div>
            <span className="font-body content-title" style={{ color: 'var(--color-danger)', fontWeight: 700, display: 'block' }}>
              {t('detail.banners.failedTitle')}
            </span>
            <span className="font-body content-text" style={{ color: 'var(--color-warning)' }}>
              {praxis.admin_note}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

// ── Owner actions ─────────────────────────────────────────────────────────────

export function PraxisOwnerActions({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, isOwner, withdrawError } = state
  if (!praxis || !isOwner) return null

  // EVERY praxis keeps the cluster here, duel or not (#1090). #752 had moved it
  // into the duel RAIL — "the state and the control that changes it share a
  // surface" — and this component suppressed it for `duel_id != null` so the
  // #646 double-destructive-control bug could not recur. The rail is gone: the
  // duel is now a compact reading card in the aside (`DuelCard`), and epic
  // #1085's layout contract puts OWNER ACTIONS in the main column, so the card
  // stays the same height in every state and carries no button. That leaves
  // exactly one mount site again, which is all #646 ever asked for.
  //
  // The forfeit escalation is untouched: `PraxisSubmitControls` still swaps to
  // the forfeit dialog on a settled duel, wherever it renders.
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Link to={`/praxes/${praxis.id}/edit`} className="font-body eyebrow hover:underline" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('detail.owner.edit')}
        </Link>
        <PraxisSubmitControls state={state} />
      </div>
      {withdrawError && <p className="font-body content-text mb-3" style={{ color: 'var(--color-danger)' }}>{withdrawError}</p>}
    </div>
  )
}

/**
 * Which reopen the quiet unsubmit control is actually about to perform (#1094).
 *
 * The control used to show ONE prompt — "Sure? Points & votes will pause." — for
 * every praxis, which is only true of a solo. Each branch below is `unsubmit_praxis`
 * (`services/praxis.py`) read back as a sentence:
 *
 *  - `duelLive` — a duel still `pending` or `active`. Both are pre-settlement:
 *    a forfeit is marked only at `status == settled` (ADR-0011 §Forfeit), so the
 *    reopen is free and neutral and nothing is marked. `pending` sits alongside
 *    `active` in the backend's own `_LIVE_INCOMPLETE_DUEL_STATUSES`, and #1077
 *    already treats the pair identically in the composer's pull-back — a
 *    challenger who casts before the rival accepts is in the same free state.
 *    A `settled` duel never reaches here: it is caught by `forfeitsOnUnsubmit`
 *    above and gets the forfeit dialog instead.
 *  - `collabOwnPart` — a collab mid-consensus (`pending`) where the viewer has
 *    cast. The backend runs `on_member_unsubmit`: only the caller's part comes
 *    back and co-authors' casts stand. Pending praxes are unscored, so there is
 *    no points-and-votes half to warn about.
 *  - `collabGroup` — a published collab. The whole group reopens and EVERY
 *    member's `has_submitted` clears, not just the viewer's.
 *  - `solo` — the original copy, unchanged.
 */
export type UnsubmitCase = 'solo' | 'collabGroup' | 'collabOwnPart' | 'duelLive'

export function unsubmitCase(
  praxis: PraxisOut,
  duel: DuelDetailOut | null,
): UnsubmitCase {
  if (duel && (duel.status === 'pending' || duel.status === 'active')) return 'duelLive'
  if (praxis.members.length <= 1) return 'solo'
  return praxis.status === 'pending' ? 'collabOwnPart' : 'collabGroup'
}

/**
 * Trigger label / confirm prompt / confirm-button label, one row per case.
 * `as const` keeps the literals narrow so the typed `t()` key union still
 * checks every string here against the shipped catalog.
 */
const UNSUBMIT_COPY = {
  solo: {
    trigger: 'detail.owner.unsubmit',
    prompt: 'detail.owner.confirmPrompt',
    confirm: 'detail.owner.confirmUnsubmit',
  },
  collabGroup: {
    trigger: 'detail.owner.unsubmit',
    prompt: 'detail.owner.confirmPromptCollab',
    confirm: 'detail.owner.confirmUnsubmitCollab',
  },
  collabOwnPart: {
    trigger: 'detail.owner.unsubmit',
    prompt: 'detail.owner.confirmPromptCollabPart',
    confirm: 'detail.owner.confirmUnsubmitCollabPart',
  },
  // The composer's vocabulary for the same free beat (#1077, "Pull my entry
  // back") — one event, one set of words, no consequence language.
  duelLive: {
    trigger: 'detail.owner.unsubmitDuelLive',
    prompt: 'detail.owner.confirmPromptDuelLive',
    confirm: 'detail.owner.confirmUnsubmitDuelLive',
  },
} as const satisfies Record<
  UnsubmitCase,
  { trigger: string; prompt: string; confirm: string }
>

/**
 * The submit / pull-back / forfeit control for a praxis you own — the one
 * mutation seam that changes its cast state (and, for a duel side, the duel's).
 * Extracted from PraxisOwnerActions (#752) so the duel RAIL could render it
 * beside the state it changes; #1090 deleted the rail and every praxis, duel or
 * not, takes it back inline in the owner controls. Still exactly ONE mount site
 * per praxis, which is what stops the #646 double-destructive-control bug.
 * `withdrawError` is rendered by the caller, next to wherever this control lands.
 *
 * IT ONLY EVER REOPENS. The green CAST control that used to lead this component
 * — plus the "you've submitted, waiting on co-authors" state beside it — went
 * with #1089: both were gated to `in_progress` or `pending`, and ADR-0062
 * redirects a praxis in either status to the composer, so neither could paint on
 * a page this renders on. Casting lives in the composer, on both paths (#1071).
 * Every branch that survives starts from a PUBLISHED praxis.
 */
export function PraxisSubmitControls({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, isOwner, user, duel, withdrawing, showWithdrawConfirm, setShowWithdrawConfirm, handleWithdraw } = state
  if (!praxis || !isOwner) return null

  // A SETTLED duel side's quiet unsubmit is a permanent forfeit (ADR-0011
  // §Forfeit; the backend only forfeits at `status == settled`) — escalate the
  // existing two-step confirm rather than adding a control (#718). During
  // `active` it stays exactly as-is: until the opponent casts, pulling back is a
  // free neutral reopen with no penalty, and warning about one would be a lie.
  const forfeitsOnUnsubmit = duel?.status === 'settled' && duel.forfeited_by_character_id == null

  const viewerCharacterId = user?.character?.id

  // What the quiet unsubmit is about to do, in its own words (#1094). The
  // settled-duel forfeit is handled above and never reaches this table.
  //
  // `unsubmitCase` still resolves all four rows and is tested against all four.
  // Only three can be SELECTED from here: `collabOwnPart` needs `status ===
  // 'pending'`, which ADR-0062 redirects away. The resolver is #1094's pure
  // statement of what the backend does, not a view of this page, so it keeps its
  // fourth row rather than being narrowed to whatever renders today.
  const unsubmitCopy = UNSUBMIT_COPY[unsubmitCase(praxis, duel)]

  return forfeitsOnUnsubmit && duel ? (
    /* A forfeit is the one irreversible duel beat, so it gets the same
       dispatched dialog the (reversible) seal confirm got in #718 rather
       than an inline text expand (#751). The trigger stays put and the
       dialog mounts over it as a fixed overlay. Skinned by the TASK's
       faction, matching the composer's own dispatch. */
    <>
      <button onClick={() => setShowWithdrawConfirm(true)} className="font-body eyebrow" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
        {t('duelForfeit.action')}
      </button>
      {showWithdrawConfirm && (
        <DuelSealConfirm
          mode="forfeit"
          taskFactionSlug={praxis.task_faction_slug}
          duel={duel}
          viewerCharacterId={viewerCharacterId}
          taskPointValue={praxis.task_point_value}
          onConfirm={handleWithdraw}
          onCancel={() => setShowWithdrawConfirm(false)}
          busy={withdrawing}
        />
      )}
    </>
  ) : !showWithdrawConfirm ? (
    <button onClick={() => setShowWithdrawConfirm(true)} className="font-body eyebrow" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
      {t(unsubmitCopy.trigger)}
    </button>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
      <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>{t(unsubmitCopy.prompt)}</span>
      <button
        onClick={handleWithdraw}
        disabled={withdrawing}
        style={{ background: 'rgba(220,38,38,0.1)', border: '1.5px solid var(--color-danger)', color: 'var(--color-danger)', fontFamily: "'Courier Prime', monospace", fontSize: 'var(--text-sm)', textTransform: 'uppercase', padding: 'var(--space-xs) var(--space-md)', cursor: 'pointer', borderRadius: 0 }}
      >
        {withdrawing ? t('detail.owner.submitting') : t(unsubmitCopy.confirm)}
      </button>
      <button onClick={() => setShowWithdrawConfirm(false)} className="btn-outline" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)' }}>{t('detail.owner.cancel')}</button>
    </div>
  )
}

// ── Flag block ────────────────────────────────────────────────────────────────

/**
 * The report card — NEUTRAL CHROME, deliberately outside the costume.
 *
 * All eight faction praxis-detail designs draw this card the same way: shared
 * neutral copy on its own neutral token set, wearing none of the skin's dress
 * while every panel around it does. Only the Unaffiliated design skinned it, and
 * it is the outlier (#1117–#1123). ADR-0061 as amended (2026-07-28) states the
 * rule the designs were drawing: content slots carry a skin's voice, moderation
 * and system chrome do not — the report card, the steward bar, the banners and
 * the errors read one shared neutral block in every faction's dress.
 *
 * That is enforced structurally rather than by convention: this component takes
 * `state` and nothing else, so there is no `style` seam to dress it through, and
 * every text node inside carries an explicit `--color-*` token or `.eyebrow`'s
 * own neutral colour — so it cannot inherit a skin's sheet colour by accident.
 * `PraxisAdminBar` above is built the same way for the same reason. If a skin
 * ever needs this card to look different, that is an ADR change, not a prop.
 */
export function PraxisFlagBlock({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, showFlagForm, setShowFlagForm, flagReason, setFlagReason, flagDetail, setFlagDetail, flagging, flagError, setFlagError, flagSubmitted, handleFlag } = state
  if (!praxis) return null

  if (flagSubmitted) {
    return (
      <div className="sidebar-card flex items-center gap-3" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="eyebrow" style={{ color: 'var(--color-success)' }}>{t('detail.flag.flaggedOk')}</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('detail.flag.flaggedTitle')}</p>
          <p className="font-body" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('detail.flag.flaggedBody')}</p>
        </div>
      </div>
    )
  }

  if (!praxis.can_flag || praxis.moderation_status === 'flagged') return null

  return (
    <div className="sidebar-card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div className="flex items-center gap-3">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(220,38,38,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="eyebrow">{t('detail.flag.badge')}</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('detail.flag.title')}</p>
          <p className="font-body" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('detail.flag.body')}</p>
        </div>
        {!showFlagForm && (
          <button onClick={() => { setShowFlagForm(true); setFlagError(null) }} className="btn-outline" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)', borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}>
            {t('detail.flag.flag')}
          </button>
        )}
      </div>
      {showFlagForm && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {/* Reason picker — the shared vocabulary (ADR-0037), not free text. */}
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label={t('detail.flag.reasonGroupLabel')}>
            {flagReasonOptions().map(({ value, label }) => (
              <button
                key={value}
                role="radio"
                aria-checked={flagReason === value}
                onClick={() => { setFlagReason(value); setFlagError(null) }}
                disabled={flagging}
                className="btn-outline"
                style={{
                  fontSize: 'var(--text-sm)',
                  padding: 'var(--space-xs) var(--space-md)',
                  ...(flagReason === value
                    ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-bg-surface)' }
                    : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* A note is available for every reason, not just "Other" (#570).
              handleFlag forwards flagDetail regardless of reason. Note: the
              backend only *persists* the note for the "other" reason (ADR-0037,
              stored_flag_reason); for named reasons it is accepted but not
              stored — persisting it for all reasons would need a reason_detail
              column (follow-up, out of #570's scope). */}
          {flagReason !== null && (
            <textarea
              className="border-2 border-border bg-card px-3 py-2 font-body content-text focus:outline-none focus:border-ink w-full resize-none"
              rows={2}
              placeholder={t('detail.flag.notePlaceholder')}
              value={flagDetail}
              onChange={(e) => setFlagDetail(e.target.value)}
              disabled={flagging}
              style={{ marginTop: 'var(--space-sm)' }}
            />
          )}
          <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-sm)' }}>
            {flagReason !== null && (
              <button onClick={() => void handleFlag()} disabled={flagging} className="btn-primary" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                {flagging ? t('detail.flag.submitting') : t('detail.flag.submit')}
              </button>
            )}
            <button onClick={() => { setShowFlagForm(false); setFlagReason(null); setFlagDetail(''); setFlagError(null) }} disabled={flagging} className="btn-outline" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)' }}>
              {t('detail.flag.cancel')}
            </button>
          </div>
          {flagError && <p className="font-body content-text" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-sm)' }}>{flagError}</p>}
        </div>
      )}
    </div>
  )
}

// ── Voter breakdown (who voted + their value) ─────────────────────────────────
//
// Task-scoped surface: every voter's value is labelled in the *task* faction's
// vocabulary (one reframe), not each voter's own. Read-only; faction-agnostic
// structure, so it lives here and every archetype renders it identically.

export function PraxisVoterBreakdown({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, voters } = state
  if (!praxis || voters.length === 0) return null

  return (
    <div className="sidebar-card mb-4" style={{ padding: 'var(--space-lg) var(--space-lg)' }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">{t('detail.voters.heading')}</span>
        <span className="eyebrow">{t('detail.voters.count', { count: voters.length })}</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {voters.map((voter) => (
          <li
            key={voter.character_id}
            className="flex items-center justify-between"
            style={{ padding: 'var(--space-xs) 0', borderTop: '1px solid var(--color-border)' }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="font-body"
              style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', textDecoration: 'none' }}
            >
              {voter.display_name}
            </Link>
            <span className="font-body content-text" style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {reframeLabel(praxis.task_faction_slug, voter.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
