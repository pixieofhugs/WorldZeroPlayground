/**
 * Collab submission roster (#591). One shared, faction-token-themed block that
 * replaces the flat member-pill list in the composer and the plain member byline
 * on the praxis detail page. It renders the ADR-0012 lazy-consensus state live:
 * who has cast, who is still weaving, and the gate progress.
 *
 * State machine (derived from `members[]` — see docs/design/collab-submission):
 *   member_count < 2                    → awaiting  (S0) a crew of one
 *   cast_count === 0                    → writing   (S1) nobody cast yet
 *   0 < cast_count < member_count, I cast → waiting  (S2) my part is in, others aren't
 *   0 < cast_count < member_count, I didn't → holdout (S3) the circle waits on me
 *   cast_count === member_count         → published (S4) every part woven
 *
 * S0 is #1274's. Below two members every consensus reading is degenerate —
 * `cast_count >= member_count` makes a lone author "published", and the bar can
 * only read 0% or 100% — so `awaiting` draws neither: just the author's row and
 * a line naming whoever was invited and has not answered.
 *
 * Pure display everywhere (#646): the cast / pull-back action lives in the
 * composer footer's PublishButton, not the roster, so both the composer and the
 * read-only detail view consume this the same way. Spacing/type via Tailwind
 * utilities + --text-* tokens, not raw inline pixels (#588 lint guard).
 *
 * Every word resolves through `collabCopy(factionSlug, key)`, so each faction
 * speaks the same states in its own voice and anything it hasn't overridden
 * falls back to the shared `editPraxis.collab.*` block (#591).
 */
import { useState } from 'react'
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
import { deriveCollabGate } from './collabGate'

// The consensus state machine moved to `collabGate.ts` (#1397) — it is pure, and
// keeping it here billed every caller for this component's dialog and copy.
// Re-exported so every existing importer still reaches it by this path.
export { deriveCollabGate } from './collabGate'
export type { CollabGate, CollabState } from './collabGate'

export function CollabRoster({
  praxisType,
  members,
  invites,
  currentCharacterId,
  factionSlug,
  taskPointValue,
  onKick,
  onNudge,
}: {
  /**
   * `PraxisOut.type` — the ONLY thing that decides whether this block belongs on
   * the page (#1274). It used to be inferred from `members.length > 1`, which
   * made a collab nobody had joined yet render nothing while its heading still
   * announced "Collaborators · 1".
   *
   * It must be tested POSITIVELY against `'collab'`. A duel side is stored
   * `type='solo'` with a non-null `duel_id` (ADR-0011), so `type === 'duel'`
   * never fires (#992) and a `!== 'solo'` gate would grow a roster on every
   * duel while still missing the collab this fixes.
   */
  praxisType: PraxisType
  members: readonly PraxisMemberOut[]
  /**
   * `PraxisOut.invites`, for the `awaiting` line only: a crew of one is only
   * legible next to who has been asked. Optional because the backend serialises
   * invites to MEMBERS ONLY (`build_praxis_out`), so a stranger reading the
   * detail page legitimately has none and gets the neutral fallback line.
   */
  invites?: readonly PraxisInviteOut[]
  currentCharacterId: number | null | undefined
  factionSlug: string | null | undefined
  taskPointValue?: number | null
  /**
   * Remove another member (#959). Receives the target's CHARACTER id. When
   * provided, a kick × renders on every OTHER member's pill — but only if the
   * viewer is themselves a member and the collab is still open, mirroring the
   * backend `kick_member` guard ("any member may kick any other, not self, and
   * only while in_progress/pending" — #1076). The confirm step lives here so
   * both the composer and the read-only detail block get it for free; the
   * callback only has to run the API call + refresh.
   */
  onKick?: (memberId: number) => void | Promise<void>
  /**
   * Poke a member who has not cast yet (#1083). Receives the target's CHARACTER
   * id. When provided, a Nudge button renders on every OTHER member's pill that
   * is still weaving — but only if the VIEWER has cast, mirroring the backend
   * rule ("any member who has cast may nudge a member who has not"): you do not
   * get to hurry people you have not caught up with. Left undefined on the
   * read-only detail mount, which draws no author controls at all (#646).
   */
  onNudge?: (characterId: number) => void | Promise<void>
}) {
  const { t } = useTranslation('forms')
  // The member a kick is waiting on confirmation for (#1082). Declared before
  // the solo early-return so the hook order never changes.
  const [pendingKick, setPendingKick] = useState<PraxisMemberOut | null>(null)
  const gate = deriveCollabGate(members, currentCharacterId)
  if (praxisType !== 'collab') return null // solo/duel render nothing

  const accent = factionCssVar(factionSlug, 'card-accent')
  // The roster is one block mounted on eight different faction sheets, so every
  // ink it paints has to be legible on all of them (#694). Three of the four it
  // used were global: --color-warning as the "not cast" pill and the holdout
  // banner (4.14:1 on UA's cream, 3.70:1 on UA's page ground), --color-success
  // as the credit (2.07:1 on S.N.I.D.E.'s near-black card), and
  // --color-text-tertiary as the "· you" byline. They now read the faction's own
  // card-ink family, whose members index.css measures against that faction's
  // sheet in both themes.
  const notice = factionCssVar(factionSlug, 'card-notice')
  const credit = factionCssVar(factionSlug, 'card-credit')
  const quiet = factionCssVar(factionSlug, 'card-muted')
  // A crew of one has no consensus to report, so the tally chip and the bar are
  // both withheld rather than printed at their degenerate readings (#1274) —
  // which also keeps `pct` off a zero denominator on an empty roster.
  const awaiting = gate.state === 'awaiting'
  const pct = awaiting ? 0 : Math.round((gate.castCount / gate.memberCount) * 100)

  // Mirror the backend: only a member may kick, never themselves, and only
  // while the praxis is still open (#1076). `published` is that last condition
  // in roster terms — the backend seals a collab to `submitted` exactly when
  // every member has cast, and every route back out clears all of them, so S4
  // and `status === 'submitted'` are the same fact. Keeping it derived means the
  // rule lives in this one component, not re-stated at each call site.
  const viewerIsMember = members.some((m) => m.character_id === currentCharacterId)
  const canKick = onKick != null && viewerIsMember && gate.state !== 'published'

  // Mirror the backend's nudge rule (#1083): a member who has CAST may nudge a
  // member who has not. `gate.iCast` is that condition already derived, so the
  // rule is read from the same place the banner is and cannot drift from it.
  const canNudge = onNudge != null && viewerIsMember && gate.iCast

  // A kick resets everyone's cast (ADR-0013), so it confirms before firing.
  // The dialog is mounted from HERE rather than from the EditPraxis dispatcher
  // like the composer's other six confirms: this component is also mounted by
  // the read-only praxis-detail block, and the confirm has always belonged to
  // the roster so both consumers get it without wiring anything (#1082).
  const confirmKick = () => {
    const member = pendingKick
    setPendingKick(null)
    if (!member || !onKick) return
    void onKick(member.character_id)
  }

  // Who has been asked and has not answered — the whole content of `awaiting`
  // beyond the author's own row. Filtered HERE rather than at eleven call sites,
  // for the same reason the state machine lives here.
  const pendingInvitees = (invites ?? [])
    .filter((invite) => invite.status === 'pending')
    .map((invite) => invite.invitee_display_name)

  const banner =
    gate.state === 'awaiting'
      ? {
          text:
            pendingInvitees.length > 0
              ? collabCopy(factionSlug, 'rosterAwaitingInvited', {
                  names: pendingInvitees.join(', '),
                })
              : collabCopy(factionSlug, 'rosterAwaitingAlone'),
          tone: quiet,
          warn: false,
        }
      : gate.state === 'waiting'
      ? { text: collabCopy(factionSlug, 'bannerWaiting'), tone: accent, warn: false }
      : gate.state === 'holdout'
        ? { text: collabCopy(factionSlug, 'bannerHoldout'), tone: notice, warn: true }
        : gate.state === 'published'
          ? { text: collabCopy(factionSlug, 'bannerPublished'), tone: credit, warn: false }
          : null

  return (
    <div className="flex flex-col gap-2">
      {/* Header: label + cast progress chip. Both this and the bar below are the
          consensus reading, which `awaiting` has nothing true to say — a tally
          of one over one is not a gate anybody is waiting on. */}
      {!awaiting && (
        <div className="flex items-center gap-2" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            {collabCopy(factionSlug, 'castStatus', { cast: gate.castCount, total: gate.memberCount })}
          </span>
        </div>
      )}

      {/* Progress bar */}
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

      {/* Roster rows */}
      <div className="flex flex-col gap-1">
        {members.map((member) => {
          const isMe = member.character_id === currentCharacterId
          const cast = member.has_submitted
          return (
            <div
              key={member.id}
              className="flex items-center gap-2 px-3 py-1"
              style={{
                borderRadius: 4,
                border: cast ? `1.5px solid ${accent}` : '1.5px dashed var(--color-border)',
                // A cast row is a filled row, and the fill has to be a SURFACE.
                // It used to be `card-muted`, which is the faction's muted TEXT
                // ink — every other caller in the app reads it as `color:` — so
                // the row came out as a slab of ink with the accent pill printed
                // on it at 1.05:1 light / 1.17:1 dark (#694). `card-bg` is the
                // faction's own sheet, and it is the surface the whole
                // `card-{text,muted,accent}` family is already measured against,
                // so filling with it makes the rendered pairing identical to one
                // the token test has gated since #651.
                background: cast ? factionCssVar(factionSlug, 'card-bg') : 'transparent',
                // ...and once the row paints its own ground, it must paint its
                // own ink: an inherited colour is whatever the MOUNT set, and
                // this component has three mounts on eight sheets.
                color: cast ? factionCssVar(factionSlug, 'card-text') : undefined,
              }}
            >
              <span className="font-body text-[12px]" style={{ fontWeight: cast ? 700 : 400, flex: 1 }}>
                {member.character_display_name}
                {isMe && (
                  <span style={{ color: cast ? quiet : 'var(--color-text-tertiary)' }}> · {collabCopy(factionSlug, 'you')}</span>
                )}
                {gate.state === 'published' && taskPointValue != null && (
                  <span style={{ color: credit, fontWeight: 700 }}> +{taskPointValue}</span>
                )}
              </span>
              <span className="eyebrow text-[9px]" style={{ color: cast ? accent : notice }}>
                {cast ? `✓ ${collabCopy(factionSlug, 'pillCast')}` : collabCopy(factionSlug, 'pillWeaving')}
              </span>
              {/* Nudge — only on a member who is still weaving, never my own row
                  (#1083). Disabled state comes from `member.nudged_at`, which the
                  server sends and clears when the 24h window lapses; nothing
                  about it is remembered here, so a reload cannot un-nudge it. */}
              {canNudge && !isMe && !cast && (
                <button
                  type="button"
                  disabled={member.nudged_at != null}
                  onClick={() => onNudge?.(member.character_id)}
                  title={collabCopy(factionSlug, 'nudgeDescription')}
                  aria-label={collabCopy(
                    factionSlug,
                    member.nudged_at != null ? 'nudgeSentAria' : 'nudgeAria',
                    { name: member.character_display_name },
                  )}
                  className="eyebrow text-[9px] px-2 py-1"
                  style={{
                    borderRadius: 4,
                    border: `1px solid ${
                      member.nudged_at != null ? 'var(--color-border)' : accent
                    }`,
                    background: 'transparent',
                    color:
                      member.nudged_at != null
                        ? 'var(--color-text-tertiary)'
                        : accent,
                    cursor: member.nudged_at != null ? 'default' : 'pointer',
                  }}
                >
                  {collabCopy(
                    factionSlug,
                    member.nudged_at != null ? 'nudgeSentAction' : 'nudgeAction',
                  )}
                </button>
              )}
              {/* Kick × — on every OTHER member's pill (never my own), gated to
                  members (#959). The glyph is an ornament; the button's name is
                  the aria-label so screen readers and the e2e locator resolve it. */}
              {canKick && !isMe && (
                <button
                  type="button"
                  onClick={() => setPendingKick(member)}
                  aria-label={t('editPraxis.invite.kickMemberAria', {
                    name: member.character_display_name,
                  })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    // Follows the row: on a filled row the ground is the faction
                    // sheet, so the glyph takes that sheet's muted ink.
                    color: cast ? quiet : 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-md)',
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Per-state banner */}
      {banner && (
        <p
          className="font-body text-[11px] px-3 py-2"
          style={{
            borderRadius: 4,
            color: banner.tone,
            border: `1px solid ${banner.tone}`,
            background: banner.warn ? 'rgba(234,179,8,0.08)' : 'transparent',
          }}
        >
          {banner.text}
        </p>
      )}

      {/* Nested inside the roster, but drawn at the document root — the dialog
          portals itself out, so a faction panel's transform can't capture its
          fixed overlay. */}
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
