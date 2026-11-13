/**
 * Collab submission roster (#591, rebuilt #1416): who is on the praxis, who has
 * submitted, and the ADR-0012 lazy-consensus gate, on the composer and the
 * praxis detail page.
 *
 * State machine: `collabGate.ts`; row model: `rosterRows.ts`. Both are separate
 * pure leaves so importers don't pay for `ConfirmDialog` + confirm copy (#1397).
 *
 * Pure display (#646): the cast / pull-back action lives in PublishButton.
 * Every word resolves through `collabCopy(factionSlug, key)`.
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  PraxisInviteOut,
  PraxisMemberOut,
  PraxisType,
} from '../../api/praxis'
import { factionCssVar } from '../../utils/factions'
import ConfirmDialog from '../confirm/ConfirmDialog'
import { kickMemberConfirm } from '../confirm/composerConfirms'
import { collabCopy } from './collabCopy'
import type { CollabCopyKey } from './collabCopy'
import { deriveCollabGate } from './collabGate'
import { RosterAvatar } from './RosterAvatar'
import { buildRosterRows, isRowDone } from './rosterRows'
import type { RosterRow, RosterRowState } from './rosterRows'

// Re-exported so existing importers keep this path.
export { deriveCollabGate } from './collabGate'
export type { CollabGate, CollabState } from './collabGate'

/** The duel side draws the same circle at 28. */
const AVATAR_SIZE = 34
const DOT_SIZE = 6
/** The "here now" badge on the avatar corner (#1744) and its lifting ring. */
const PRESENCE_DOT_SIZE = 10
const PRESENCE_DOT_RING = 2

/**
 * Ink for text ON the card-accent. Ephemerists has no `-on-accent` token
 * (#1232 deleted it), so the pill falls back to `card-bg`. Restoring
 * `--faction-ephemerists-on-accent` (plus its ACCENT_PAIRS row) is the real fix.
 */
const ON_ACCENT_PROPERTY = '--roster-on-accent'

/**
 * The dress, handed in by the mount (#2269). Every field falls back to the
 * faction's `card-*` family, which is correct on the detail and waiting mounts
 * (drawn on the card sheet). The composer passes a skin because its sheet may
 * differ: S.N.I.D.E.'s wall takes `-note-*` inks, never `-card-*` (#2066, #2267).
 * Carries geometry and type too (owner ruling: Ephemerists/S.N.I.D.E. are square).
 */
export interface CollabSkin {
  /** Site-generic when absent — the #2269 bug. */
  fontFamily?: string
  /** Pills, Done chip, nudge, notice, `+ invite`. Not the avatar disc or the bar cap. */
  radius?: number | string
  /** DONE as a FILL: finished pill, progress fill, its ring. */
  accent?: string
  /** The ink ON `accent`. */
  onAccent?: string
  /**
   * DONE as an INK (waiting notice, nudge). Split because a faction hue may fill
   * but fail as type: S.N.I.D.E.'s acid is 1.35:1 on its own wall.
   */
  accentInk?: string
  /** Unanswered pills, "· you", the ×s, the `+ invite` chip. */
  quiet?: string
  /** Holdout warning ink, and its veil. */
  notice?: string
  /** The "+N" gain, the published notice, the here-now dot. */
  credit?: string
  /** The here-now dot's ring. */
  ground?: string
}

const PILL_KEY_BY_STATE: Record<RosterRowState, CollabCopyKey> = {
  filed: 'pillCast',
  accepted: 'pillWeaving',
  invited: 'pillInvited',
  declined: 'pillDeclined',
}

export function CollabRoster({
  praxisType,
  members,
  invites,
  currentCharacterId,
  factionSlug,
  taskPointValue,
  presentCharacterIds,
  skin,
  onKick,
  onNudge,
  onRescindInvite,
  onNudgeCrew,
  crewNudge,
}: {
  /**
   * The ONLY thing deciding whether this block renders (#1274). Test positively
   * against `'collab'`: a duel side is stored `type='solo'` with a `duel_id`
   * (ADR-0011), so a `!== 'solo'` gate would grow a roster on every duel.
   */
  praxisType: PraxisType
  members: readonly PraxisMemberOut[]
  /**
   * Pending invites read Invited, declined ones Declined, as rows (#1416).
   * Serialised to members only (`build_praxis_out`), so a stranger gets none.
   */
  invites?: readonly PraxisInviteOut[]
  currentCharacterId: number | null | undefined
  factionSlug: string | null | undefined
  taskPointValue?: number | null
  /**
   * Who has the room open now (#1744, ADR-0073). A prop: only the composer sits
   * inside `PraxisRoomProvider`, and absent must mean "nothing known", not
   * "everyone away". Self-reported awareness: decoration, never authorization
   * (membership is checked server-side, #1740).
   */
  presentCharacterIds?: readonly number[]
  /** See {@link CollabSkin}. Only the composer passes one. */
  skin?: CollabSkin
  /**
   * Remove another member (#959); receives the CHARACTER id. Mirrors backend
   * `kick_member`: members only, not self, only while open (#1076). The confirm
   * lives here so every mount gets it.
   */
  onKick?: (memberId: number) => void | Promise<void>
  /**
   * Poke an outstanding member (#1083); receives the CHARACTER id. Only a viewer
   * who has cast may nudge. Undefined on the read-only detail mount (#646).
   */
  onNudge?: (characterId: number) => void | Promise<void>
  /** Withdraw a pending invite (#421); receives the INVITE id. */
  onRescindInvite?: (inviteId: number) => void | Promise<void>
  /**
   * Poke everyone still outstanding in one request (#1418, #1952). Drawn in the
   * header only when it would reach 2+ people. The server derives the crew and
   * applies the per-person 24h window.
   */
  onNudgeCrew?: () => void | Promise<void>
  /**
   * The last crew press's result (`CrewNudgeResult`, structural to avoid a hook
   * dependency). Outlives the button: a press is often part refused, and nudging
   * the last reachable member removes the control.
   */
  crewNudge?: { sent: number; skipped: number } | null
}) {
  const { t } = useTranslation('forms')
  // Declared before the solo early-return so hook order never changes (#1082).
  const [pendingKick, setPendingKick] = useState<PraxisMemberOut | null>(null)
  const gate = deriveCollabGate(members, currentCharacterId)
  if (praxisType !== 'collab') return null // solo/duel render nothing

  const accent = skin?.accent ?? factionCssVar(factionSlug, 'card-accent')
  // Accent-as-TEXT; `${key} card accent` in CARD_PAIRS gates it at 4.5:1 (#651).
  const accentInk = skin?.accentInk ?? accent
  const face = skin?.fontFamily
  const radius = skin?.radius ?? 4
  // Faction card-ink family, not globals: the roster mounts on eight sheets and
  // globals failed contrast on several (#694).
  const notice = skin?.notice ?? factionCssVar(factionSlug, 'card-notice')
  const credit = skin?.credit ?? factionCssVar(factionSlug, 'card-credit')
  const quiet = skin?.quiet ?? factionCssVar(factionSlug, 'card-muted')
  const ground = skin?.ground ?? factionCssVar(factionSlug, 'card-bg')
  const onAccent =
    skin?.onAccent ?? `var(${ON_ACCENT_PROPERTY}, ${factionCssVar(factionSlug, 'card-bg')})`
  // A crew of one has no consensus: no tally or bar (#1274), and no zero
  // denominator.
  const awaiting = gate.state === 'awaiting'
  const pct = awaiting ? 0 : Math.round((gate.castCount / gate.memberCount) * 100)

  const rows = buildRosterRows(members, invites)

  // Backend kick rule (#1076). `published` == `status === 'submitted'`: the
  // backend seals exactly when every member has cast.
  const viewerIsMember = members.some((m) => m.character_id === currentCharacterId)
  const canKick = onKick != null && viewerIsMember && gate.state !== 'published'

  // Backend nudge rule (#1083): a member who has CAST may nudge one who has not.
  const canNudge = onNudge != null && viewerIsMember && gate.iCast

  /**
   * How many one press would REACH: authorised, outstanding, and outside the
   * server-owned 24h window (`nudged_at`). Two is the floor (owner ruling).
   */
  const reachableCrew =
    canNudge && onNudgeCrew != null
      ? members.filter(
          (m) =>
            !m.has_submitted &&
            m.character_id !== currentCharacterId &&
            m.nudged_at == null,
        ).length
      : 0
  const showCrewNudge = reachableCrew >= 2
  /**
   * Which nudge explanation to show. Rows count everyone outstanding, spent
   * window or not, since a row draws its (disabled) button either way.
   */
  const nudgeNote: CollabCopyKey | null = showCrewNudge
    ? 'nudgeCrewDescription'
    : canNudge &&
        members.some(
          (m) => !m.has_submitted && m.character_id !== currentCharacterId,
        )
      ? 'nudgeDescription'
      : null

  /**
   * Whether the viewer is among those outstanding (#1952). Members only (the
   * detail mount shows strangers), and only with a live proposal: since
   * ADR-0079 `has_submitted` approves a proposal, so `writing` has none.
   */
  const proposalLive = gate.state === 'waiting' || gate.state === 'holdout'
  const yours =
    viewerIsMember && proposalLive
      ? collabCopy(factionSlug, gate.iCast ? 'yoursApproved' : 'yoursOutstanding')
      : null

  const nudgeStyle = (spent: boolean): CSSProperties => ({
    padding: 'var(--space-xs) var(--space-sm)',
    borderRadius: radius,
    fontFamily: face,
    border: `1px solid ${spent ? 'var(--color-border)' : accentInk}`,
    background: 'transparent',
    color: spent ? quiet : accentInk,
    cursor: spent ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  })

  // A kick resets everyone's cast (ADR-0013), so it confirms first. Mounted
  // here, not in EditPraxis, so the read-only detail block gets it too (#1082).
  const confirmKick = () => {
    const member = pendingKick
    setPendingKick(null)
    if (!member || !onKick) return
    void onKick(member.character_id)
  }

  // `waiting` has no banner (#1952): the surface heading already names the
  // others, and "yours is in" lives on the header line.
  const banner =
    gate.state === 'awaiting'
      ? {
          text: collabCopy(factionSlug, 'rosterAwaitingAlone'),
          tone: quiet,
          warn: false,
        }
      : gate.state === 'holdout'
        ? { text: collabCopy(factionSlug, 'bannerHoldout'), tone: notice, warn: true }
        : gate.state === 'published'
          ? { text: collabCopy(factionSlug, 'bannerPublished'), tone: credit, warn: false }
          : null

  return (
    <div
      className="flex flex-col gap-2"
      style={
        {
          [ON_ACCENT_PROPERTY]: factionCssVar(factionSlug, 'on-accent'),
          // Not enough alone: `.label-heading`, `.label-caption`, `.font-body`
          // each `@apply font-body`, so those nodes restate `face` inline.
          fontFamily: face,
        } as CSSProperties
      }
    >
      {/* Header (#1416). N counts MEMBERS, not rows — invited/declined are
          asked, not on it, and the tally shares the denominator. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="label-heading" style={{ fontFamily: face }}>
            {t('editPraxis.composer.collaboratorsLabel', { count: gate.memberCount })}
          </span>
          {/* See `reachableCrew` for the floor of two. */}
          {showCrewNudge && (
            <button
              type="button"
              onClick={() => void onNudgeCrew?.()}
              className="label-caption"
              style={nudgeStyle(false)}
            >
              {collabCopy(factionSlug, 'nudgeCrewAction')}
            </button>
          )}
        </span>
        {/* Tally + whether yours is in (#1952). Nothing true to say in `awaiting`. */}
        {!awaiting && (
          <span className="label-caption" style={{ fontFamily: face }}>
            {collabCopy(factionSlug, 'castStatus', { cast: gate.castCount, total: gate.memberCount })}
            {yours != null && <> · {yours}</>}
          </span>
        )}
      </div>

      {/* Visible text, not a per-row `title` touch users never see (#1952). Only
          one of the two sentences is ever drawn; both state the same cooldown. */}
      {nudgeNote && (
        <p className="label-caption" style={{ color: quiet, fontFamily: face }}>
          {collabCopy(factionSlug, nudgeNote)}
        </p>
      )}

      {/* Kept on purpose (#1416): the design draws none, but it carries
          `aria-valuenow` for screen readers. */}
      {!awaiting && (
        <div
          role="progressbar"
          aria-valuenow={gate.castCount}
          aria-valuemin={0}
          aria-valuemax={gate.memberCount}
          aria-label={collabCopy(factionSlug, 'progressAria', { cast: gate.castCount, total: gate.memberCount })}
          style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: accent, transition: 'width 200ms' }} />
        </div>
      )}

      <div className="flex flex-col">
        {rows.map((row, index) => {
          const done = isRowDone(row.state)
          const isMe =
            row.member != null && row.member.character_id === currentCharacterId
          return (
            <div
              key={row.key}
              className="flex items-center"
              style={{
                gap: 'var(--space-sm)',
                padding: 'var(--space-md) 0',
                borderTop: index === 0 ? undefined : '1px solid var(--color-border)',
              }}
            >
              {/* Presence dot on the avatar corner, layered here because
                  `RosterAvatar` stays aria-hidden. Only members can light up. */}
              <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <RosterAvatar
                  name={row.name}
                  avatarUrl={row.avatarUrl}
                  size={AVATAR_SIZE}
                  borderColor={done ? accent : quiet}
                  dashed={row.state === 'invited'}
                  color={done ? accent : undefined}
                />
                {row.member != null &&
                  presentCharacterIds?.includes(row.member.character_id) && (
                    <span
                      role="img"
                      aria-label={t('editPraxis.composer.presentAria', { name: row.name })}
                      title={t('editPraxis.composer.presentAria', { name: row.name })}
                      style={{
                        position: 'absolute',
                        right: -1,
                        bottom: -1,
                        width: PRESENCE_DOT_SIZE,
                        height: PRESENCE_DOT_SIZE,
                        borderRadius: '50%',
                        // Not `card-accent`: the row already spends it on DONE.
                        background: credit,
                        border: `${PRESENCE_DOT_RING}px solid ${ground}`,
                        boxSizing: 'content-box',
                      }}
                    />
                  )}
              </span>

              {/* The name WRAPS (#2129, #2132). `overflow-wrap: anywhere` drops
                  min-content to one character so a long name can't inflate a
                  `min-width: auto` flex ancestor and push the pill past the
                  clip. Not `break-word`: it does not reduce min-content. */}
              <span
                className="font-body text-[13px]"
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  fontWeight: done ? 700 : 400,
                  fontFamily: face,
                }}
              >
                {row.name}
                {isMe && (
                  <span style={{ color: quiet }}> · {collabCopy(factionSlug, 'you')}</span>
                )}
                {done && gate.state === 'published' && taskPointValue != null && (
                  <span style={{ color: credit, fontWeight: 700 }}> +{taskPointValue}</span>
                )}
              </span>

              {/* Disabled state is server-owned `nudged_at` (#1083), so a reload
                  can't un-nudge. */}
              {canNudge && row.member != null && !isMe && !done && (
                <button
                  type="button"
                  disabled={row.member.nudged_at != null}
                  onClick={() => onNudge?.(row.member!.character_id)}
                  aria-label={collabCopy(
                    factionSlug,
                    row.member.nudged_at != null ? 'nudgeSentAria' : 'nudgeAria',
                    { name: row.name },
                  )}
                  className="label-caption"
                  style={nudgeStyle(row.member.nudged_at != null)}
                >
                  {collabCopy(
                    factionSlug,
                    row.member.nudged_at != null ? 'nudgeSentAction' : 'nudgeAction',
                  )}
                </button>
              )}

              {/* Kick × (#959). The aria-label is the name screen readers and
                  the e2e locator resolve. */}
              {canKick && row.member != null && !isMe && (
                <RowGlyphButton
                  label={t('editPraxis.invite.kickMemberAria', { name: row.name })}
                  color={quiet}
                  onClick={() => setPendingKick(row.member!)}
                />
              )}

              {/* Rescind × (#421): pending invites only. */}
              {onRescindInvite != null && row.invite != null && row.state === 'invited' && (
                <RowGlyphButton
                  label={t('editPraxis.invite.rescindInviteAria', { name: row.name })}
                  color={quiet}
                  onClick={() => void onRescindInvite(row.invite!.id)}
                />
              )}

              {/* Done (ADR-0079) sits beside the pill, not in it: done and
                  approved are orthogonal signals. */}
              {row.member?.is_done && (
                <span
                  className="label-caption"
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: radius,
                    fontFamily: face,
                    border: `1px solid ${quiet}`,
                    background: 'transparent',
                    color: quiet,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {collabCopy(factionSlug, 'pillDone')}
                </span>
              )}

              <StatusPill
                row={row}
                label={collabCopy(factionSlug, PILL_KEY_BY_STATE[row.state])}
                accent={accent}
                quiet={quiet}
                onAccent={onAccent}
                face={face}
                radius={radius}
              />
            </div>
          )
        })}
      </div>

      {/* Gated apart from the button: the press can remove its own button. */}
      {crewNudge != null && (
        <span
          role="status"
          className="label-caption"
          style={{ color: quiet, fontFamily: face }}
        >
          {collabCopy(
            factionSlug,
            crewNudge.skipped > 0 ? 'nudgeCrewResultPartial' : 'nudgeCrewResult',
            {
              sent: crewNudge.sent,
              total: crewNudge.sent + crewNudge.skipped,
              skipped: crewNudge.skipped,
            },
          )}
        </span>
      )}

      {banner && (
        <p
          className="font-body text-[11px]"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: radius,
            fontFamily: face,
            color: banner.tone,
            border: `1px solid ${banner.tone}`,
            // The banner's own ink at 8%, never a global amber (#1609).
            background: banner.warn
              ? `color-mix(in srgb, ${banner.tone} 8%, transparent)`
              : 'transparent',
          }}
        >
          {banner.text}
        </p>
      )}

      {/* The dialog portals out, so a panel's transform can't capture it. */}
      {pendingKick && (
        <ConfirmDialog
          request={kickMemberConfirm(
            factionSlug,
            pendingKick.character_display_name,
          )}
          factionSlug={factionSlug}
          onConfirm={confirmKick}
          onDismiss={() => setPendingKick(null)}
        />
      )}
    </div>
  )
}

/**
 * The four-state pill (#1416). Never colour alone: each state has its own word,
 * the unanswered two are DASHED, and the dot is aria-hidden ornament.
 */
function StatusPill({
  row,
  label,
  accent,
  quiet,
  onAccent,
  face,
  radius,
}: {
  row: RosterRow
  label: string
  accent: string
  quiet: string
  onAccent: string
  face: string | undefined
  radius: number | string
}) {
  const done = isRowDone(row.state)
  const unanswered = row.state === 'invited' || row.state === 'declined'
  return (
    <span
      className="label-caption"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        padding: 'var(--space-xs) var(--space-sm)',
        borderRadius: radius,
        fontFamily: face,
        border: `1px ${unanswered ? 'dashed' : 'solid'} ${done ? accent : quiet}`,
        background: done ? accent : 'transparent',
        color: done ? onAccent : quiet,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          flexShrink: 0,
          background: done ? 'currentColor' : unanswered ? 'transparent' : accent,
          border: unanswered ? `1px solid ${quiet}` : undefined,
        }}
      />
      {label}
    </span>
  )
}

/** The row's kick/rescind × (one component: `sonarjs/no-identical-functions`). */
function RowGlyphButton({
  label,
  color,
  onClick,
}: {
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'transparent',
        border: 'none',
        color,
        cursor: 'pointer',
        fontSize: 'var(--text-xl)',
        lineHeight: 1,
        padding: 0,
        flexShrink: 0,
      }}
    >
      ×
    </button>
  )
}
