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

  // Drawn at the root (#2244): mounted from `EditPraxis`, this beat composited
  // inside `ShellContent`'s `z-index: 5` band, so the mobile header and tab bar
  // sat on top of a screen that is supposed to BE the screen. See `drawAtRoot`.
  return drawAtRoot(
    <div
      // The closing beat, by slot (#2453). The nightly collab spec anchored on
      // "out there", which has not been anywhere in this app since #1812 rewrote
      // the collab register — and passed nothing, because the step before it
      // never completed either.
      data-testid="collab-success"
      role="dialog"
      aria-modal="true"
      aria-label={collabCopy(factionSlug, 'successHeading')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        // Mobile fills the screen outright; desktop dims the composer behind.
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

        {/* Everyone who was woven in, each credited with the full task value —
            a collab pays every member in full (SPEC-game-rules). */}
        <ul className="flex flex-col gap-1 w-full">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 px-3 py-1"
              style={{
                borderRadius: 4,
                border: `1.5px solid ${accent}`,
                // The same ink-painted-as-a-fill the roster carried (#694):
                // `card-muted` is the faction's muted TEXT ink, so this row came
                // out as a slab of ink with the credit printed on it. `card-bg`
                // is the sheet that whole ink family is measured against.
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
                    // Not --color-success: the global green is 2.07:1 on
                    // S.N.I.D.E.'s sheet and 2.14:1 on Singularity's (#694).
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
