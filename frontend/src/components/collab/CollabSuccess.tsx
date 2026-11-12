/**
 * Post-publish success screen for a collab (#591), shown once to the member
 * whose cast closed the gate. Transient client state derived from
 * `praxis.members[]`; no API, no persistence. Mobile full-screen, desktop a
 * centred panel (#494); continue is manual, never a timer. Chrome mirrors
 * LevelUpPopup: dim overlay, role="dialog", autofocused primary, no trap.
 */
import type { PraxisMemberOut } from '../../api/praxis'
import { drawAtRoot } from '../ui/drawAtRoot'
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

  // Drawn at the root (#2244) so the shell's `z-index: 5` band can't cover it.
  return drawAtRoot(
    <div
      // The closing beat's e2e anchor (#2453).
      data-testid="collab-success"
      role="dialog"
      aria-modal="true"
      aria-label={collabCopy(factionSlug, 'successHeading')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: isMobile
          ? 'var(--color-bg-page)'
          : 'var(--color-overlay-strong)',
      }}
    >
      <div
        className={`flex flex-col items-center gap-4 p-6 ${
          isMobile ? 'w-full h-full justify-center' : 'w-full max-w-[420px]'
        }`}
        style={{
          background: 'var(--color-bg-page)',
          border: isMobile ? 'none' : `2px solid ${accent}`,
          borderRadius: isMobile ? 0 : 8,
        }}
      >
        <span className="label-caption" style={{ color: accent }}>
          {collabCopy(factionSlug, 'castStatus', {
            cast: gate.castCount,
            total: gate.memberCount,
          })}
        </span>

        <h2
          className="font-display text-center"
          style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}
        >
          {collabCopy(factionSlug, 'successHeading')}
        </h2>

        <p
          className="font-body text-center"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}
        >
          {collabCopy(factionSlug, 'successBody')}
        </p>

        {/* A collab pays every member in full (SPEC-game-rules). */}
        <ul className="flex flex-col gap-1 w-full">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 px-3 py-1"
              style={{
                borderRadius: 4,
                border: `1.5px solid ${accent}`,
                // `card-bg`, the sheet the card ink family is measured on (#694).
                background: factionCssVar(factionSlug, 'card-bg'),
                color: factionCssVar(factionSlug, 'card-text'),
              }}
            >
              <span
                className="font-body"
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: member.character_id === currentCharacterId ? 700 : 400,
                }}
              >
                {member.character_display_name}
              </span>
              {taskPointValue != null && (
                <span
                  className="font-body"
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    // Not --color-success: fails contrast on S.N.I.D.E./Singularity (#694).
                    color: factionCssVar(factionSlug, 'card-credit'),
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
          className="btn-primary px-4 py-2"
        >
          {collabCopy(factionSlug, 'successContinue')}
        </button>
      </div>
    </div>,
  )
}
