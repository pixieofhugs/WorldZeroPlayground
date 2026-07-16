/**
 * Post-publish success screen for a collab (#591).
 *
 * Shown once, to the member whose own cast closed the consensus gate: the
 * moment the last part lands, the composer stops being a composer and says so.
 * Everyone else's cast leaves them in the composer's `waiting` state, so they
 * never see this.
 *
 * Purely transient client state — derived from `praxis.members[]`, which the
 * composer already refetches after a cast. No new API, no persistence: dismiss
 * it and it's gone (this is a "your thing went live" beat, not a notification).
 *
 * Form factor (#494): mobile takes the whole screen, desktop is a centred panel
 * over the composer. Continue is a manual action, never an auto-redirect timer —
 * the player leaves when they've read it.
 *
 * Chrome mirrors LevelUpPopup / ImageEditModal: fixed dim overlay, role="dialog",
 * the primary action autofocuses, no focus trap. Spacing/type via Tailwind
 * utilities + --text-* tokens, not raw inline pixels (#588 lint guard).
 */
import type { PraxisMemberOut } from '../../api/praxis'
import { useFormFactor } from '../../hooks/useFormFactor'
import { factionCssVar } from '../../utils/factions'
import { collabCopy } from './collabCopy'
import { deriveCollabGate } from './CollabRoster'

export function CollabSuccess({
  members,
  currentCharacterId,
  factionSlug,
  taskPointValue,
  onContinue,
}: {
  members: readonly PraxisMemberOut[]
  currentCharacterId: number | null | undefined
  factionSlug: string | null | undefined
  taskPointValue?: number | null
  /** Manual continue → the praxis detail page. Never fired on a timer. */
  onContinue: () => void
}) {
  const formFactor = useFormFactor()
  const gate = deriveCollabGate(members, currentCharacterId)
  const accent = factionCssVar(factionSlug, 'card-accent')
  const isMobile = formFactor === 'mobile'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={collabCopy(factionSlug, 'successHeading')}
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
      style={{
        // Mobile fills the screen outright; desktop dims the composer behind.
        background: isMobile
          ? 'var(--color-bg-page)'
          : 'radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))',
      }}
    >
      <div
        className={`flex flex-col items-center gap-[14px] p-[24px] ${
          isMobile ? 'w-full h-full justify-center' : 'w-full max-w-[420px]'
        }`}
        style={{
          background: 'var(--color-bg-page)',
          border: isMobile ? 'none' : `2px solid ${accent}`,
          borderRadius: isMobile ? 0 : 8,
        }}
      >
        <span className="eyebrow" style={{ color: accent }}>
          {collabCopy(factionSlug, 'castStatus', {
            cast: gate.castCount,
            total: gate.memberCount,
          })}
        </span>

        <h2
          className="font-display text-center"
          style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}
        >
          {collabCopy(factionSlug, 'successHeading')}
        </h2>

        <p
          className="font-body text-center"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}
        >
          {collabCopy(factionSlug, 'successBody')}
        </p>

        {/* Everyone who was woven in, each credited with the full task value —
            a collab pays every member in full (SPEC-game-rules). */}
        <ul className="flex flex-col gap-[4px] w-full">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 px-[10px] py-[5px]"
              style={{
                borderRadius: 4,
                border: `1.5px solid ${accent}`,
                background: factionCssVar(factionSlug, 'card-muted'),
              }}
            >
              <span
                className="font-body"
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: member.character_id === currentCharacterId ? 700 : 400,
                }}
              >
                {member.character_display_name}
              </span>
              {taskPointValue != null && (
                <span
                  className="font-body"
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--color-success)',
                  }}
                >
                  +{taskPointValue}
                </span>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          autoFocus
          onClick={onContinue}
          className="btn-primary px-[18px] py-[8px]"
          style={{ fontSize: 'var(--text-sm)' }}
        >
          {collabCopy(factionSlug, 'successContinue')}
        </button>
      </div>
    </div>
  )
}
