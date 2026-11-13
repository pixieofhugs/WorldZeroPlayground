/**
 * Shared slots for praxis-detail archetypes (ADR-0061: arrange freely, drop
 * nothing; ADR-0064: the page owns its chrome). Every archetype renders each
 * slot; the invariant is the slot (it exists, what it says, when it is gated),
 * not the pixels — a few slots take the skin's dress through props.
 *
 * Every slot starts from a PUBLISHED praxis: ADR-0062 redirects `in_progress`
 * and `pending` to the composer. Do not reintroduce a status branch here; open
 * praxes belong to the composer's waiting surface (#1071). Score: mount
 * `ScoreStamp` (ADR-0053); do not re-derive points here.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import CommentThread from '../../components/comments/CommentThread'
import DuelSealConfirm from '../../components/duel/DuelSealConfirm'
import type { PraxisDetailState } from './usePraxisDetail'
import { UNSCORED_MODERATION_STATUSES } from '../../api/praxis'
import type { PraxisMemberOut, PraxisOut } from '../../api/praxis'
import type { DuelDetailOut } from '../../api/duel'
import { flagReasonOptions } from '../../utils/flagReasons'
import { factionCssVar } from '../../utils/factions'
import { stampRestatesTaskPoints } from '../../utils/praxis'
import { formatPoints } from '../../utils/points'
import type { TFunction } from 'i18next'

/**
 * Whether this praxis's score was banked (#1444). `ScoreStamp` renders nothing
 * on `failed`/`hidden` (#1373), so the archetype's headed Score panel goes with
 * it; one predicate keeps page and stamp agreeing. The failed banner still
 * speaks (#1538).
 */
export function scoreWasBanked(praxis: PraxisOut): boolean {
  return !UNSCORED_MODERATION_STATUSES.has(praxis.moderation_status)
}

/**
 * The trailing half of the task-reference band — "Level 3 · 30 pts" (#1833).
 * Only the TEXT is shared; ink and placement stay the archetype's. The points
 * half drops when {@link stampRestatesTaskPoints} says the rail already prints
 * that figure (#1131), and never on a praxis whose rail is gone (#1444).
 */
export function taskRefMeta(praxis: PraxisOut, t: TFunction<'praxis'>): string {
  const level = t('detail.taskRef.level', { level: praxis.task_level_required })
  if (stampRestatesTaskPoints(praxis)) return level
  return `${level} · ${t('detail.taskRef.points', { points: praxis.task_point_value, count: praxis.task_point_value })}`
}

// ── Detail wall alarm inks (#1451) ──
// The shared page paints onto nine faction walls; the global danger/warning
// inks miss AA on them, so wall-mounted alarm text takes the faction's card ink
// family off `task_faction_slug`. Not a dress seam: the ink is derived from the
// slug, so no prop (contrast: the flagged notice's inks are CHOSEN per skin, so
// they are props). S.N.I.D.E. mints its own (card is pinned black, wall flips):
// see `--faction-snide-wall-alarm` in index.css.
//
// NOT routed: `PraxisAdminBar` and `PraxisFlagBlock` sit on `.sidebar-card
// .card-on-page`, whose declared ground (#1413) is the app page, so the global
// inks are correct there. Do not dress them or reach for `wallInk` in them.
const WALL_INK: Record<string, { alarm: string; notice: string }> = {
  snide: {
    alarm: 'var(--faction-snide-wall-alarm)',
    notice: 'var(--faction-snide-wall-notice)',
  },
}

/** The destructive / cautionary ink measured on this praxis's detail wall. */
function wallInk(praxis: PraxisOut, role: 'alarm' | 'notice'): string {
  const slug = praxis.task_faction_slug ?? ''
  return WALL_INK[slug]?.[role] ?? factionCssVar(slug, `card-${role}`)
}

// ── Egalitarian byline (#387): every co-author credited, creator first ──

/** Creator first, then the rest by `joined_at`; no creator → join order only. */
export function orderedMembers(praxis: PraxisOut): PraxisMemberOut[] {
  const rest = praxis.members
    .filter((member) => member.character_id !== praxis.created_by_id)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  const creator = praxis.members.find(
    (member) => member.character_id === praxis.created_by_id,
  )
  return creator ? [creator, ...rest] : rest
}

/** One face in the byline's stack of discs/plates/octagons. */
interface BylineFace {
  id: number
  name: string
  /** Raw wire path (archetype calls `mediaUrl()`); `''` means draw the monogram. */
  avatarUrl: string
}

/**
 * Who the byline draws, and which of them has a face (#2106, #2318): portrait
 * when the path is non-empty, monogram otherwise. Each archetype draws the
 * `img` inside its own frame (`FactionAvatar` would flatten eight kit monograms).
 * (The creator-only `ponytail:` this carried was paid off by #2318.)
 */
export function bylineFaces(praxis: PraxisOut): BylineFace[] {
  const members = orderedMembers(praxis)
  // `|| ''`: a payload cached before #2172 lacks the key.
  const portrait = praxis.created_by_avatar_url || ''
  if (members.length === 0) {
    return [
      {
        id: praxis.created_by_id,
        name: praxis.created_by_display_name,
        avatarUrl: portrait,
      },
    ]
  }
  return members.map((member) => ({
    id: member.character_id,
    name: member.character_display_name || `#${member.character_id}`,
    // `|| ''`: a row cached before #2318 lacks the key; heals on next fetch.
    avatarUrl: member.character_avatar_url || '',
  }))
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

// ── Compact `.btn-*` overrides (#1783) ──
/**
 * Pad and outline variants only. Never restate the class's size, face, casing
 * or tracking here: an inline style wins and would pin the button off the
 * label tier.
 */
const BTN_COMPACT: CSSProperties = { padding: 'var(--space-xs) var(--space-md)' }
const BTN_COMPACT_DANGER: CSSProperties = {
  ...BTN_COMPACT,
  borderColor: 'var(--color-danger-ring)',
  color: 'var(--color-danger)',
}
const BTN_COMPACT_WARNING: CSSProperties = {
  ...BTN_COMPACT,
  borderColor: 'var(--color-warning-ring)',
  color: 'var(--color-warning)',
}

// ── Admin moderation bar ──

export function PraxisAdminBar({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, showAdminBar, adminFailNote, setAdminFailNote, showFailInput, setShowFailInput, moderating, moderateError, handleModerate } = state
  if (!showAdminBar || !praxis) return null

  return (
    <div className="sidebar-card card-on-page mb-4" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="label-heading">
          {t('detail.admin.eyebrow')}
        </span>
        <span
          className="label-caption"
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
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary" style={BTN_COMPACT}>{t('detail.admin.approve')}</button>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline" style={BTN_COMPACT_DANGER}>{t('detail.admin.hide')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={BTN_COMPACT_WARNING}>{t('detail.admin.fail')}</button>
            </>
          )}
          {praxis.moderation_status === 'visible' && (
            <>
              <button onClick={() => void handleModerate('hidden')} disabled={moderating} className="btn-outline" style={BTN_COMPACT_DANGER}>{t('detail.admin.hide')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={BTN_COMPACT_WARNING}>{t('detail.admin.fail')}</button>
            </>
          )}
          {(praxis.moderation_status === 'hidden' || praxis.moderation_status === 'failed') && (
            <>
              <button onClick={() => void handleModerate('visible')} disabled={moderating} className="btn-primary" style={BTN_COMPACT}>{t('detail.admin.restore')}</button>
              <button onClick={() => setShowFailInput(!showFailInput)} disabled={moderating} className="btn-outline" style={BTN_COMPACT_WARNING}>{t('detail.admin.fail')}</button>
            </>
          )}
        </div>
      </div>
      {showFailInput && (
        <div className="mt-2 flex gap-2 items-end">
          <textarea
            className="border-2 border-border bg-card px-3 py-1 font-body content-text focus:outline-hidden focus:border-ink flex-1 resize-none"
            rows={2}
            placeholder={t('detail.admin.failReasonPlaceholder')}
            value={adminFailNote}
            onChange={(e) => setAdminFailNote(e.target.value)}
          />
          <button
            onClick={() => void handleModerate('failed', adminFailNote)}
            disabled={moderating}
            className="btn-primary"
            style={{ background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
          >
            {t('detail.admin.confirm')}
          </button>
        </div>
      )}
      {moderateError && <p className="font-body content-text mt-1" style={{ color: 'var(--color-danger)' }}>{moderateError}</p>}
    </div>
  )
}

// ── Comments region (ADR-0061, amending ADR-0006) ──

/**
 * The comments slot an archetype mounts itself. The `visible` gate lives here so
 * no skin can forget it (#1030). Pass `heading` to dress the section head; the
 * thread's own `<h3>` is then suppressed (one heading per list, #1029). Rows
 * stay dispatched on the comment author's faction.
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
  const { praxis, comments } = state
  if (!praxis || praxis.moderation_status !== 'visible') return null
  return (
    <section style={style}>
      {heading}
      {/* Seeded from the page's batch (#1281); the gate would delay the thread's own fetch. */}
      <CommentThread
        target="praxes"
        targetId={praxis.id}
        showHeading={heading === undefined}
        seed={comments}
      />
    </section>
  )
}

// ── Status banners ──

/**
 * The failed and flagged moderation banners (#2718). The node is shared; the
 * flagged notice's two inks are the archetype's to name via props (ADR-0090:
 * the difference is paint), matching how `MemberByline`/`PraxisDetailComments`
 * take dress. Byte-identical markup is guarded by `markupStability.test.tsx`.
 *
 * Deliberately NOT wired to `wallInk()`: that would repaint six factions now on
 * `--color-warning`. Ephemerists keeps its literal `-card-notice` even though
 * it equals `wallInk` in production: the registry tests mount every archetype
 * on a `ua` fixture, so the derived form would render the wrong ink there.
 */
export function PraxisStatusBanners({
  state,
  flaggedInk = 'var(--color-warning)',
  flaggedBodyInk = 'var(--color-text-secondary)',
}: {
  state: PraxisDetailState
  /** Edge and label of the flagged notice. The shared warning hue by default. */
  flaggedInk?: string
  /** The notice's sentence. The shared secondary ink by default. */
  flaggedBodyInk?: string
}) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  return (
    <>
      {/* No crown hero (#1710): the fleur lives on the score stamp. A FAILED
          praxis still holding its crown shows none here; the failed banner is
          its signal. */}
      {/* Keyed on the STATUS, not the note (#1538): an admin may fail with an
          empty note, and `failed` is a public mark (#1373). The note span is
          omitted when empty. */}
      {praxis.moderation_status === 'failed' && (
        <div style={{ background: 'var(--color-danger-veil)', border: '2px solid var(--color-danger-edge)', borderRadius: 8, padding: 'var(--space-sm) var(--space-lg)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Ornament dingbat, sized from the label tier (WORLD_ZERO_STYLE.md §4). */}
          <span style={{ fontSize: 'var(--text-xl)' }}>&#10007;</span>
          {/* Both inks measured on this skin's wall under the veil (#1451, #1449). */}
          <div>
            <span className="font-body content-title" style={{ color: wallInk(praxis, 'alarm'), fontWeight: 700, display: 'block' }}>
              {t('detail.banners.failedTitle')}
            </span>
            {praxis.admin_note && (
              <span className="font-body content-text" style={{ color: wallInk(praxis, 'notice') }}>
                {praxis.admin_note}
              </span>
            )}
          </div>
        </div>
      )}
      {/* Flagged (#2718): mutually exclusive with failed. Neutral tokens by
          default; moderation chrome stays outside the costume (ADR-0061). */}
      {praxis.moderation_status === 'flagged' && (
        <div
          style={{
            border: `2px solid ${flaggedInk}`,
            borderRadius: 8,
            padding: 'var(--space-sm) var(--space-lg)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
          }}
        >
          <span className="label-caption" style={{ color: flaggedInk }}>
            {t('detail.banners.flaggedLabel')}
          </span>
          <span className="font-body content-text" style={{ color: flaggedBodyInk }}>
            {t('detail.banners.flaggedBody')}
          </span>
        </div>
      )}
    </>
  )
}

// ── Owner actions ──

export function PraxisOwnerActions({ state }: { state: PraxisDetailState }) {
  const { praxis, isOwner, withdrawError } = state
  if (!praxis || !isOwner) return null

  // One control: the unsubmit (#2136). Editing a published praxis = unsubmit →
  // confirm → `PraxisDetail` redirects into the composer. Do NOT auto-unsubmit
  // from another control: it would skip #1094's confirm, and on a settled duel
  // it is a permanent forfeit. Every praxis, duel or not, mounts it here — one
  // mount site, which is what prevents #646's double destructive control.
  return (
    <div>
      {/* One-child flex row: its shrink-to-fit box keeps the confirm row from
          spanning the column. */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <PraxisSubmitControls state={state} />
      </div>
      {withdrawError && <p className="font-body content-text mb-3" style={{ color: wallInk(praxis, 'alarm') }}>{withdrawError}</p>}
    </div>
  )
}

/**
 * Which reopen the unsubmit control will perform (#1094), mirroring
 * `unsubmit_praxis` (`services/praxis.py`):
 *  - `duelLive` — duel `pending`/`active`: a free, neutral reopen (forfeit only
 *    at `settled`, ADR-0011, which gets the forfeit dialog instead).
 *  - `collabOwnPart` — pending collab: only the caller's cast comes back.
 *  - `collabGroup` — published collab: every member's `has_submitted` clears.
 *  - `solo` — the default.
 */
type UnsubmitCase = 'solo' | 'collabGroup' | 'collabOwnPart' | 'duelLive'

export function unsubmitCase(
  praxis: PraxisOut,
  duel: DuelDetailOut | null,
): UnsubmitCase {
  if (duel && (duel.status === 'pending' || duel.status === 'active')) return 'duelLive'
  if (praxis.members.length <= 1) return 'solo'
  return praxis.status === 'pending' ? 'collabOwnPart' : 'collabGroup'
}

/** Trigger / prompt / confirm keys per case; `as const` keeps `t()` key-checked. */
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
  // The composer's words for the same free beat (#1077).
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
 * The pull-back / forfeit control for a praxis you own — the one mutation seam
 * for its cast state, with exactly one mount site (#646). It only ever reopens;
 * casting lives in the composer (#1071). `withdrawError` is rendered by the
 * caller.
 */
export function PraxisSubmitControls({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, isOwner, user, duel, withdrawing, showWithdrawConfirm, setShowWithdrawConfirm, handleWithdraw } = state
  if (!praxis || !isOwner) return null

  // A SETTLED duel side's unsubmit is a permanent forfeit (ADR-0011): escalate
  // to the dialog (#718). While `active` it is a free reopen; don't warn.
  const forfeitsOnUnsubmit = duel?.status === 'settled' && duel.forfeited_by_character_id == null

  const viewerCharacterId = user?.character?.id

  // (#1094.) `collabOwnPart` is unreachable here (ADR-0062) but the resolver
  // keeps all four rows: it states the backend, not this page.
  const unsubmitCopy = UNSUBMIT_COPY[unsubmitCase(praxis, duel)]

  return forfeitsOnUnsubmit && duel ? (
    /* The one irreversible duel beat gets the dispatched dialog (#751), skinned
       by the TASK's faction. */
    <>
      <button onClick={() => setShowWithdrawConfirm(true)} className="font-body label-caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: wallInk(praxis, 'alarm') }}>
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
    <button onClick={() => setShowWithdrawConfirm(true)} className="font-body label-caption" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
      {t(unsubmitCopy.trigger)}
    </button>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
      {/* `points` only in the solo prompt (#2094). Do NOT add it to the collab
          prompt: the score is the AUTHOR's (ADR-0053), not the co-author's, and
          the owner ruled that prompt numberless. Guarded by
          `unsubmitConfirmCopy.test.tsx`. */}
      <span className="label-caption">
        {t(unsubmitCopy.prompt, { points: formatPoints(praxis.score), count: praxis.score })}
      </span>
      <button
        onClick={handleWithdraw}
        disabled={withdrawing}
        // Label takes the wall alarm ink (#1451); fill and rule stay neutral
        // (the 1.5px rule clears 3:1, WCAG 1.4.11). Wears `.btn-outline` so it
        // moves with the cancel beside it (#1783); the rest is dress.
        className="btn-outline"
        style={{ background: 'var(--color-danger-veil)', border: '1.5px solid var(--color-danger)', color: wallInk(praxis, 'alarm'), ...BTN_COMPACT, borderRadius: 0 }}
      >
        {withdrawing ? t('detail.owner.submitting') : t(unsubmitCopy.confirm)}
      </button>
      <button onClick={() => setShowWithdrawConfirm(false)} className="btn-outline" style={BTN_COMPACT}>{t('detail.owner.cancel')}</button>
    </div>
  )
}

// ── Flag block ──

/**
 * The report card — neutral chrome outside the costume (ADR-0061). Takes only
 * `state`, so there is no dress seam; changing that is an ADR change, not a
 * prop. Hazard: `.label-caption` reads `--label-ink`, a seam a faction root may
 * set; `.card-on-page` pins it back to neutral (#1606). Don't patch labels
 * with inline colours (#1252).
 */
export function PraxisFlagBlock({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, showFlagForm, setShowFlagForm, flagReason, setFlagReason, flagDetail, setFlagDetail, flagging, flagError, setFlagError, flagSubmitted, handleFlag } = state
  if (!praxis) return null

  if (flagSubmitted) {
    return (
      <div className="sidebar-card card-on-page flex items-center gap-3" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="label-caption" style={{ color: 'var(--color-success)' }}>{t('detail.flag.flaggedOk')}</span>
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
    <div className="sidebar-card card-on-page" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div className="flex items-center gap-3">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-danger-edge)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span className="label-caption">{t('detail.flag.badge')}</span>
        </div>
        <div className="flex-1">
          <p className="font-body" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('detail.flag.title')}</p>
          <p className="font-body" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{t('detail.flag.body')}</p>
        </div>
        {!showFlagForm && (
          <button onClick={() => { setShowFlagForm(true); setFlagError(null) }} className="btn-outline" style={BTN_COMPACT_DANGER}>
            {t('detail.flag.flag')}
          </button>
        )}
      </div>
      {showFlagForm && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {/* Shared reason vocabulary (ADR-0037), not free text. */}
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
                  ...BTN_COMPACT,
                  ...(flagReason === value
                    ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-on-danger)' }
                    : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* A note for every reason (#570). The backend only persists it for
              "other" (ADR-0037); storing it for all needs a reason_detail column. */}
          {flagReason !== null && (
            <textarea
              className="border-2 border-border bg-card px-3 py-2 font-body content-text focus:outline-hidden focus:border-ink w-full resize-none"
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
              <button onClick={() => void handleFlag()} disabled={flagging} className="btn-primary" style={{ ...BTN_COMPACT, background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-on-danger)' }}>
                {flagging ? t('detail.flag.submitting') : t('detail.flag.submit')}
              </button>
            )}
            <button onClick={() => { setShowFlagForm(false); setFlagReason(null); setFlagDetail(''); setFlagError(null) }} disabled={flagging} className="btn-outline" style={BTN_COMPACT}>
              {t('detail.flag.cancel')}
            </button>
          </div>
          {flagError && <p className="font-body content-text" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-sm)' }}>{flagError}</p>}
        </div>
      )}
    </div>
  )
}
