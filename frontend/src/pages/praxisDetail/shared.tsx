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
import { Link } from 'react-router-dom'
import { reframeLabel } from '../../components/vote/voteReframes'
import type { PraxisDetailState } from './usePraxisDetail'

// ── Admin moderation bar ─────────────────────────────────────────────────────

export function PraxisAdminBar({ state }: { state: PraxisDetailState }) {
  const { praxis, showAdminBar, adminFailNote, setAdminFailNote, showFailInput, setShowFailInput, moderating, moderateError, handleModerate } = state
  if (!showAdminBar || !praxis) return null

  return (
    <div className="sidebar-card mb-4" style={{ padding: '10px 14px' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', fontSize: 8 }}>
          ADMIN &middot; Status:
        </span>
        <span
          className="eyebrow"
          style={{
            fontSize: 8, padding: '1px 6px',
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
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary text-xs" style={{ padding: '2px 10px', fontSize: 9 }}>approve</button>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline text-xs" style={{ padding: '2px 10px', fontSize: 9, borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}>hide</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline text-xs" style={{ padding: '2px 10px', fontSize: 9, borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}>fail</button>
            </>
          )}
          {praxis.moderation_status === 'visible' && (
            <>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline text-xs" style={{ padding: '2px 10px', fontSize: 9, borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}>hide</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline text-xs" style={{ padding: '2px 10px', fontSize: 9, borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}>fail</button>
            </>
          )}
          {(praxis.moderation_status === 'hidden' || praxis.moderation_status === 'failed') && (
            <>
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary text-xs" style={{ padding: '2px 10px', fontSize: 9 }}>restore</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline text-xs" style={{ padding: '2px 10px', fontSize: 9, borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}>fail</button>
            </>
          )}
        </div>
      </div>
      {showFailInput && (
        <div className="mt-2 flex gap-2 items-end">
          <textarea
            className="border-2 border-border bg-card px-3 py-1 font-body text-sm focus:outline-none focus:border-ink flex-1 resize-none"
            rows={2}
            placeholder="Reason for failure (visible to player)..."
            value={adminFailNote}
            onChange={(e) => setAdminFailNote(e.target.value)}
          />
          <button
            onClick={() => void handleModerate('failed', adminFailNote)}
            disabled={moderating}
            className="btn-primary text-xs"
            style={{ background: 'var(--color-warning)', borderColor: 'var(--color-warning)', fontSize: 9 }}
          >
            confirm
          </button>
        </div>
      )}
      {moderateError && <p className="font-body text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{moderateError}</p>}
    </div>
  )
}

// ── Status banners ────────────────────────────────────────────────────────────

export function PraxisStatusBanners({ state }: { state: PraxisDetailState }) {
  const { praxis } = state
  if (!praxis) return null

  return (
    <>
      {praxis.status === 'in_progress' && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="eyebrow">IN EDITING</span>
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 700 }}>
            This praxis is in editing mode. Points and votes are paused until submitted.
          </span>
        </div>
      )}
      {praxis.moderation_status === 'failed' && praxis.admin_note && (
        <div style={{ background: 'rgba(220,38,38,0.05)', border: '2px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>&#10007;</span>
          <div>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 700, display: 'block' }}>
              This praxis was marked as failed.
            </span>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-warning)' }}>
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
  const { praxis, isOwner, withdrawing, showWithdrawConfirm, setShowWithdrawConfirm, withdrawError, handleWithdraw, handleResubmit } = state
  if (!praxis || !isOwner) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to={`/praxes/${praxis.id}/edit`} className="font-body eyebrow hover:underline" style={{ color: 'var(--color-text-tertiary)' }}>
          edit this praxis
        </Link>
        {praxis.status === 'in_progress' ? (
          <button
            onClick={handleResubmit}
            disabled={withdrawing}
            style={{ background: 'var(--color-success)', color: 'var(--color-text-on-accent)', fontFamily: "'Courier Prime', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 12px', border: 'none', cursor: 'pointer', borderRadius: 0, opacity: withdrawing ? 0.5 : 1 }}
          >
            {withdrawing ? '...' : 'Submit'}
          </button>
        ) : !showWithdrawConfirm ? (
          <button onClick={() => setShowWithdrawConfirm(true)} className="font-body eyebrow" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
            unsubmit
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Sure? Points & votes will pause.</span>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              style={{ background: 'rgba(220,38,38,0.1)', border: '1.5px solid var(--color-danger)', color: 'var(--color-danger)', fontFamily: "'Courier Prime', monospace", fontSize: 9, textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', borderRadius: 0 }}
            >
              {withdrawing ? '...' : 'Yes, unsubmit'}
            </button>
            <button onClick={() => setShowWithdrawConfirm(false)} className="btn-outline" style={{ fontSize: 9, padding: '3px 10px' }}>Cancel</button>
          </div>
        )}
      </div>
      {withdrawError && <p className="font-body text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{withdrawError}</p>}
    </div>
  )
}

// ── Flag block ────────────────────────────────────────────────────────────────

export function PraxisFlagBlock({ state }: { state: PraxisDetailState }) {
  const { praxis, showFlagForm, setShowFlagForm, flagReason, setFlagReason, flagging, flagError, setFlagError, flagSubmitted, handleFlag } = state
  if (!praxis) return null

  if (flagSubmitted) {
    return (
      <div className="sidebar-card flex items-center gap-3" style={{ padding: '10px 14px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="eyebrow" style={{ color: 'var(--color-success)' }}>OK</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Flagged for admin review</p>
          <p className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>Thanks — an admin will take a look shortly.</p>
        </div>
      </div>
    )
  }

  if (!praxis.can_flag || praxis.moderation_status === 'flagged') return null

  return (
    <div className="sidebar-card" style={{ padding: '10px 14px' }}>
      <div className="flex items-center gap-3">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(220,38,38,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="eyebrow">FLAG</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Flag this praxis</p>
          <p className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>If this content is inappropriate or violates the rules, flag it for admin review.</p>
        </div>
        {!showFlagForm && (
          <button onClick={() => { setShowFlagForm(true); setFlagError(null) }} className="btn-outline" style={{ fontSize: 9, padding: '4px 12px', borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}>
            Flag
          </button>
        )}
      </div>
      {showFlagForm && (
        <div style={{ marginTop: 10 }}>
          <textarea
            className="border-2 border-border bg-card px-3 py-2 font-body text-sm focus:outline-none focus:border-ink w-full resize-none"
            rows={3}
            placeholder="Describe the issue (at least 10 characters)..."
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            disabled={flagging}
          />
          <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
            <button onClick={() => void handleFlag()} disabled={flagging} className="btn-primary" style={{ fontSize: 9, padding: '4px 12px', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
              {flagging ? '...' : 'Submit flag'}
            </button>
            <button onClick={() => { setShowFlagForm(false); setFlagReason(''); setFlagError(null) }} disabled={flagging} className="btn-outline" style={{ fontSize: 9, padding: '4px 12px' }}>
              Cancel
            </button>
          </div>
          {flagError && <p className="font-body text-xs" style={{ color: 'var(--color-danger)', marginTop: 6 }}>{flagError}</p>}
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
  const { praxis, voters } = state
  if (!praxis || voters.length === 0) return null

  return (
    <div className="sidebar-card mb-4" style={{ padding: '14px 16px' }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">Who voted</span>
        <span className="eyebrow">{voters.length} {voters.length === 1 ? 'vote' : 'votes'}</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {voters.map((voter) => (
          <li
            key={voter.character_id}
            className="flex items-center justify-between"
            style={{ padding: '5px 0', borderTop: '1px solid var(--color-border)' }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="font-body"
              style={{ fontSize: 12, color: 'var(--color-text-primary)', textDecoration: 'none' }}
            >
              {voter.display_name}
            </Link>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {reframeLabel(praxis.task_faction_slug, voter.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
