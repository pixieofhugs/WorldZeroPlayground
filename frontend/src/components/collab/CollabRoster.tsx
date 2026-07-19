/**
 * Collab submission roster (#591). One shared, faction-token-themed block that
 * replaces the flat member-pill list in the composer and the plain member byline
 * on the praxis detail page. It renders the ADR-0012 lazy-consensus state live:
 * who has cast, who is still weaving, and the gate progress.
 *
 * State machine (derived from `members[]` — see docs/design/collab-submission):
 *   cast_count === 0                    → writing   (S1) nobody cast yet
 *   0 < cast_count < member_count, I cast → waiting  (S2) my part is in, others aren't
 *   0 < cast_count < member_count, I didn't → holdout (S3) the circle waits on me
 *   cast_count === member_count         → published (S4) every part woven
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
import type { PraxisMemberOut } from '../../api/praxis'
import { factionCssVar } from '../../utils/factions'
import { collabCopy } from './collabCopy'

export type CollabState = 'writing' | 'waiting' | 'holdout' | 'published'

export interface CollabGate {
  memberCount: number
  castCount: number
  iCast: boolean
  state: CollabState
}

/** Pure derivation of the consensus gate from the member list. */
export function deriveCollabGate(
  members: readonly PraxisMemberOut[],
  currentCharacterId: number | null | undefined,
): CollabGate {
  const memberCount = members.length
  const castCount = members.filter((m) => m.has_submitted).length
  const iCast = members.some(
    (m) => m.character_id === currentCharacterId && m.has_submitted,
  )
  let state: CollabState
  if (castCount === 0) state = 'writing'
  else if (castCount >= memberCount) state = 'published'
  else state = iCast ? 'waiting' : 'holdout'
  return { memberCount, castCount, iCast, state }
}

export function CollabRoster({
  members,
  currentCharacterId,
  factionSlug,
  taskPointValue,
}: {
  members: readonly PraxisMemberOut[]
  currentCharacterId: number | null | undefined
  factionSlug: string | null | undefined
  taskPointValue?: number | null
}) {
  const gate = deriveCollabGate(members, currentCharacterId)
  if (gate.memberCount < 2) return null // solo/duel render nothing

  const accent = factionCssVar(factionSlug, 'card-accent')
  const pct = Math.round((gate.castCount / gate.memberCount) * 100)

  const banner =
    gate.state === 'waiting'
      ? { text: collabCopy(factionSlug, 'bannerWaiting'), tone: accent, warn: false }
      : gate.state === 'holdout'
        ? { text: collabCopy(factionSlug, 'bannerHoldout'), tone: 'var(--color-warning)', warn: true }
        : gate.state === 'published'
          ? { text: collabCopy(factionSlug, 'bannerPublished'), tone: 'var(--color-success)', warn: false }
          : null

  return (
    <div className="flex flex-col gap-2">
      {/* Header: label + cast progress chip */}
      <div className="flex items-center gap-2" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
          {collabCopy(factionSlug, 'castStatus', { cast: gate.castCount, total: gate.memberCount })}
        </span>
      </div>

      {/* Progress bar */}
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
                background: cast ? factionCssVar(factionSlug, 'card-muted') : 'transparent',
              }}
            >
              <span className="font-body text-[12px]" style={{ fontWeight: cast ? 700 : 400, flex: 1 }}>
                {member.character_display_name}
                {isMe && (
                  <span style={{ color: 'var(--color-text-tertiary)' }}> · {collabCopy(factionSlug, 'you')}</span>
                )}
                {gate.state === 'published' && taskPointValue != null && (
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}> +{taskPointValue}</span>
                )}
              </span>
              <span className="eyebrow text-[9px]" style={{ color: cast ? accent : 'var(--color-warning)' }}>
                {cast ? `✓ ${collabCopy(factionSlug, 'pillCast')}` : collabCopy(factionSlug, 'pillWeaving')}
              </span>
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
    </div>
  )
}
