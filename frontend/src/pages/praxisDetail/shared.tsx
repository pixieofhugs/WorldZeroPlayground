/**
 * Shared behavior module for praxis-detail archetypes (ADR-0017 §2).
 *
 * These slots are faction-agnostic and must be rendered identically by
 * every archetype. They are extracted here so no archetype re-implements
 * the guards, handlers, or chrome — only the presentational slots differ.
 *
 * Invariant slots owned here:
 *   - Admin moderation bar
 *   - Withdrawn / failed banners (IN EDITING + failed note)
 *   - Owner actions (edit / withdraw / resubmit)
 *   - Flag block
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { reframeLabel } from '../../components/vote/voteReframes'
import { TaskCrown } from '../../components/cards/TaskCrown'
import { CollabRoster } from '../../components/collab/CollabRoster'
import DuelSealConfirm from '../../components/duel/DuelSealConfirm'
import type { PraxisDetailState } from './usePraxisDetail'
import type { PraxisMemberOut, PraxisOut } from '../../api/praxis'
import { flagReasonOptions } from '../../utils/flagReasons'
import { scoreBreakdown } from '../../components/praxisCard/scoreStamp/scoreBreakdown'

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
  const { t } = useTranslation('praxis')
  const members = orderedMembers(praxis)
  const sepStyle = separatorStyle ?? linkStyle
  // Per-member submit state only reads meaningfully mid-lifecycle on a collab
  // (>1 member, still in editing). A solo/duel praxis or a live one stays clean.
  // `pending` is the mid-consensus state (#590/#591) — exactly when cast status
  // matters most — so it counts as "still open" alongside in_progress.
  const showSubmitState =
    members.length > 1 &&
    (praxis.status === 'in_progress' || praxis.status === 'pending')

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
            {showSubmitState && (
              <span
                className="eyebrow"
                style={{
                  marginLeft: 'var(--space-xs)',
                  color: member.has_submitted
                    ? 'var(--color-success)'
                    : 'var(--color-text-tertiary)',
                }}
              >
                {member.has_submitted
                  ? t('detail.byline.submitted')
                  : t('detail.byline.drafting')}
              </span>
            )}
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

// ── Collab cast-status roster (#591) ─────────────────────────────────────────

/**
 * The read-only twin of the composer's roster: the same shared `CollabRoster`
 * component with no `action` prop, so it reports the ADR-0012 consensus state
 * without offering a cast/pull-back control.
 *
 * Gated to a still-resolving collab (in_progress / pending), mirroring
 * `MemberByline`'s `showSubmitState`: that is exactly when "who still owes their
 * part" is a live question. Once the praxis is live the byline already credits
 * every co-author and a cast roster would only restate it. The component
 * self-hides on a solo/duel praxis (<2 members).
 */
export function CollabRosterBlock({ state }: { state: PraxisDetailState }) {
  const { praxis, user } = state
  if (!praxis) return null
  if (praxis.status !== 'in_progress' && praxis.status !== 'pending') return null
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <CollabRoster
        members={praxis.members}
        currentCharacterId={user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
      />
    </div>
  )
}

// ── Status banners ────────────────────────────────────────────────────────────

export function PraxisStatusBanners({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  return (
    <>
      {/* Read-only cast-status roster (#591). The same shared component the
          composer uses, minus the `action` prop — the detail page is a reading
          surface, so it shows who has cast and who hasn't but offers no
          cast/pull-back control (those live in the composer). It self-hides on
          a solo/duel praxis (<2 members). Rendered here rather than in each
          archetype because every archetype — desktop and mobile — already
          renders PraxisStatusBanners, so both form factors pick it up from one
          place and no faction skin has to re-implement it. */}
      <CollabRosterBlock state={state} />
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
            background: 'var(--color-bg-card)',
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
      {/* A collab that has been proposed for publish (submit_proposed_at set)
          is still in editing, but the neutral "IN EDITING" copy under-reports
          it — swap in the pending-publish wording (ADR-0012). */}
      {praxis.status === 'in_progress' && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 'var(--space-sm) var(--space-lg)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {praxis.submit_proposed_at != null ? (
            <>
              <span className="eyebrow">{t('detail.banners.pendingPublishLabel')}</span>
              <span className="font-body content-text" style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                {t('detail.banners.pendingPublishBody')}
              </span>
            </>
          ) : (
            <>
              <span className="eyebrow">{t('detail.banners.inEditingLabel')}</span>
              <span className="font-body content-text" style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                {t('detail.banners.inEditingBody')}
              </span>
            </>
          )}
        </div>
      )}
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
  const { praxis, isOwner, user, duel, withdrawing, showWithdrawConfirm, setShowWithdrawConfirm, withdrawError, handleWithdraw, handleResubmit } = state
  if (!praxis || !isOwner) return null

  // A SETTLED duel side's quiet unsubmit is a permanent forfeit (ADR-0011
  // §Forfeit; the backend only forfeits at `status == settled`) — escalate the
  // existing two-step confirm rather than adding a control (#718). During
  // `active` it stays exactly as-is: until the opponent casts, pulling back is a
  // free neutral reopen with no penalty, and warning about one would be a lie.
  // Fixed at this choke point deliberately: PraxisOwnerActions is the only path
  // to unsubmit on the detail page, so it catches anyone who never read the rail.
  const forfeitsOnUnsubmit = duel?.status === 'settled' && duel.forfeited_by_character_id == null

  // On a collab that hasn't gone live yet, a member who has already submitted
  // waits on their co-authors — swap their green Submit control for a waiting
  // state (ADR-0012). Editing stays available via the edit link above.
  const viewerCharacterId = user?.character?.id
  const viewerMember =
    viewerCharacterId != null
      ? praxis.members.find((member) => member.character_id === viewerCharacterId)
      : undefined
  const isCollab = praxis.members.length > 1
  const viewerSubmittedWaiting =
    isCollab && praxis.status === 'in_progress' && viewerMember?.has_submitted === true

  // A collab goes `pending` once a co-author casts (collab_consensus.on_submit,
  // ADR-0012). A member who has NOT cast is a holdout: the unsubmit branch below
  // would 422 for them ("already in editing mode", praxis.py) since they have
  // nothing of their own to pull back. Show them the CAST control instead —
  // mirroring the composer footer's gate (deriveCollabGate) — so casting is the
  // one action offered. A member who HAS cast keeps the unsubmit path (#958).
  const isPendingHoldout =
    isCollab && praxis.status === 'pending' && viewerMember?.has_submitted !== true

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Link to={`/praxes/${praxis.id}/edit`} className="font-body eyebrow hover:underline" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('detail.owner.edit')}
        </Link>
        {praxis.status === 'in_progress' && viewerSubmittedWaiting ? (
          <span className="eyebrow" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
            {t('detail.owner.submittedWaiting')}
          </span>
        ) : praxis.status === 'in_progress' || isPendingHoldout ? (
          <button
            onClick={handleResubmit}
            disabled={withdrawing}
            style={{ background: 'var(--color-success)', color: 'var(--color-text-on-accent)', fontFamily: "'Courier Prime', monospace", fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: 'var(--space-xs) var(--space-md)', border: 'none', cursor: 'pointer', borderRadius: 0, opacity: withdrawing ? 0.5 : 1 }}
          >
            {withdrawing ? t('detail.owner.submitting') : t('detail.owner.submit')}
          </button>
        ) : forfeitsOnUnsubmit && duel ? (
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
            {t('detail.owner.unsubmit')}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>{t('detail.owner.confirmPrompt')}</span>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              style={{ background: 'rgba(220,38,38,0.1)', border: '1.5px solid var(--color-danger)', color: 'var(--color-danger)', fontFamily: "'Courier Prime', monospace", fontSize: 'var(--text-sm)', textTransform: 'uppercase', padding: 'var(--space-xs) var(--space-md)', cursor: 'pointer', borderRadius: 0 }}
            >
              {withdrawing ? t('detail.owner.submitting') : t('detail.owner.confirmUnsubmit')}
            </button>
            <button onClick={() => setShowWithdrawConfirm(false)} className="btn-outline" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)' }}>{t('detail.owner.cancel')}</button>
          </div>
        )}
      </div>
      {withdrawError && <p className="font-body content-text mb-3" style={{ color: 'var(--color-danger)' }}>{withdrawError}</p>}
    </div>
  )
}

// ── Flag block ────────────────────────────────────────────────────────────────

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

// ── Single earned-points breakdown (#641, ADR-0053) ──────────────────────────
//
// The one explicit score readout a detail page shows. The arithmetic is NOT
// done here: `scoreBreakdown()` is the single resolver for cards and detail
// alike, so the two surfaces cannot disagree. What lives here is the detail
// page's own PRESENTATION — the inline `{base} × {mult} + {votes}` form and the
// per-faction accent/muted/font theming each of the 14 archetypes passes in.
//
// This used to derive the multiplier as `(score − votePoints) / base`. Against
// Merit (`base + votes`) that reduced to `base / base` — 1.0 unconditionally —
// so the `× {mult}` branch was unreachable and a Snide duel loss at ×0.0 read
// as ×1.0. `score` is now the computed total and the multiplier is a payload
// field, so the branch is live.

/** Format a multiplier for display: 1.1 → "1.1", 1.10 → "1.1", 1.25 → "1.25". */
function formatMultiplier(multiplier: number): string {
  return Number(multiplier.toFixed(2)).toString()
}

export interface PraxisBreakdownParts {
  base: number
  votePoints: number
  multiplier: number
  multiplierLabel: string
  /** True when the multiplier is exactly 1.0 — the `× {mult}` term is omitted. */
  isPlain: boolean
}

/**
 * The numbers behind the earned-points breakdown, delegated to the shared
 * `scoreBreakdown()` selector (ADR-0053). Nothing is derived by subtraction.
 */
export function praxisBreakdownParts(praxis: PraxisOut): PraxisBreakdownParts {
  const { base, mult, votes } = scoreBreakdown(praxis)
  const multiplier = mult ?? 1
  return {
    base,
    votePoints: votes,
    multiplier,
    multiplierLabel: formatMultiplier(multiplier),
    isPlain: mult === null,
  }
}

/**
 * The single earned-points breakdown for a detail page. Faction-themeable via
 * `accent`/`muted`/`font` so each archetype can render it in its own voice while
 * the arithmetic + copy stay in one place. `align` positions it within its slot.
 */
export function PraxisScoreBreakdown({
  state,
  accent,
  muted,
  font,
  align = 'left',
}: {
  state: PraxisDetailState
  accent?: string
  muted?: string
  font?: string
  align?: 'left' | 'center' | 'right'
}) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null
  const { base, votePoints, isPlain, multiplierLabel } = praxisBreakdownParts(praxis)

  return (
    <div style={{ textAlign: align, lineHeight: 1 }}>
      <span
        className="font-display content-title"
        style={{ fontWeight: 800, fontFamily: font, color: accent ?? 'var(--color-text-primary)', whiteSpace: 'nowrap' }}
      >
        {base}
        {!isPlain && (
          <>
            <span style={{ opacity: 0.55, margin: '0 var(--space-xs)' }}>×</span>
            {multiplierLabel}
          </>
        )}
        <span style={{ opacity: 0.55, margin: '0 var(--space-xs)' }}>+</span>
        {votePoints}
      </span>
      <span
        className="eyebrow"
        style={{ display: 'block', marginTop: 'var(--space-xs)', color: muted }}
      >
        {isPlain ? t('card.ptsAndVotes') : t('detail.score.ptsMultVotes')}
      </span>
    </div>
  )
}
