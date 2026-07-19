/**
 * Duel seal confirmation (#718) — the beat between "cast" and casting, for a
 * duel side only.
 *
 * A solo praxis goes live quietly and a collab reopens neutrally; a duel is the
 * one mode where the button in front of you has consequences you can't undo, so
 * it is the one mode that asks. What it says depends on where the duel is:
 *
 *  - `active` (they accepted): casting seals your side. Pulling back is STILL
 *    free until they cast too — a forfeit only exists once the duel is `settled`
 *    (ADR-0011 §Forfeit; `praxis.py` only forfeits on `status == settled`). The
 *    dialog says both halves: what sealing costs later, and what's still free now.
 *  - `pending` (unanswered): casting is ungated and nothing is at stake. If they
 *    decline, this scores as an ordinary solo praxis at 1.0×.
 *
 * Chrome mirrors `collab/CollabSuccess.tsx` exactly — fixed dim overlay,
 * role="dialog" + aria-modal, mobile full-screen / desktop centred panel via
 * useFormFactor(), primary action autofocuses, no focus trap. Mounted once from
 * the EditPraxis dispatcher, so all 16 composer surfaces inherit it.
 *
 * The Default skin below is the only one this issue ships; the manifest seam
 * exists so per-faction skins (#720 for Wow, one issue per faction after) are a
 * `duelSeal` / `mobileDuelSeal` row and nothing else. Skins own the FRAME only —
 * every figure and every branch lives in `duel/shared.tsx`.
 *
 * TWO MODES, ONE SURFACE (#751)
 * -----------------------------
 * The same dialog also confirms a FORFEIT — pulling back a settled duel side,
 * which was an inline text expand on the praxis-detail page until now. It is the
 * one duel moment with a genuinely irreversible consequence and was the only one
 * with no skinnable surface, while the *reversible* moment (this one) got a full
 * dialog in #718.
 *
 * It rides the `mode` prop rather than a `duelForfeit` / `mobileDuelForfeit`
 * pair of manifest keys, because the two dialogs are ~90% the same component:
 * same frame, same roster, same stakes tiles, same footer. Only the title, the
 * body, and the confirm label differ, and `useDuelSealCopy` owns all three. Each
 * faction therefore stays TWO files that each handle two modes, instead of four
 * files — which is the whole reason this landed before the six skin issues
 * (#721–#726).
 */
import type { } from 'react'
import type { DuelDetailOut } from '../../api/duel'
import { useFormFactor } from '../../hooks/useFormFactor'
import { factionCssVar } from '../../utils/factions'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSealMode,
  type DuelSlotTheme,
} from './shared'

export interface DuelSealConfirmProps {
  duel: DuelDetailOut
  viewerCharacterId: number | null | undefined
  /** The task's base point value — every stakes figure is derived from it. */
  taskPointValue: number | null | undefined
  /** Fires the composer's existing `publish()`, untouched. */
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  /**
   * Which beat this dialog is confirming (#751). Optional and defaulting to
   * `'submit'`, so every existing mount site is unchanged. See `DuelSealMode`.
   */
  mode?: DuelSealMode
}

export function DefaultDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const formFactor = useFormFactor()
  const isMobile = formFactor === 'mobile'
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)

  // Tokens come from the OPPONENT's faction, matching the read-page rail: the
  // opponent is the foreign element and should look foreign (grilled #310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: isMobile
          ? 'var(--color-bg-page)'
          : 'radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))',
      }}
    >
      <div
        className={`flex flex-col gap-3 p-6 ${
          isMobile ? 'w-full h-full justify-center' : 'w-full max-w-[420px]'
        }`}
        style={{
          background: 'var(--color-bg-page)',
          border: isMobile ? 'none' : `2px solid ${accent}`,
          borderRadius: isMobile ? 0 : 8,
        }}
      >
        <h2
          className="font-display"
          style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}
        >
          {copy.heading}
        </h2>

        <p
          className="font-body"
          style={{
            fontSize: 'var(--text-sm)',
            color: copy.danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            className="font-body"
            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}
          >
            {copy.note}
          </p>
        )}

        <StakesTiles
          viewerFactionSlug={me.faction_slug}
          opponentFactionSlug={foe.faction_slug}
          opponentName={foe.display_name}
          taskPointValue={taskPointValue}
          status={duel.status}
          theme={theme}
        />

        <RaceRoster me={me} foe={foe} theme={theme} />

        <SealActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          busy={busy}
          confirmLabel={copy.confirmLabel}
          danger={copy.danger}
          theme={theme}
        />
      </div>
    </div>
  )
}

/**
 * The dispatcher the composer mounts. Skinned by the TASK's faction (the
 * composer's own archetype is chosen the same way), not the opponent's — the
 * dialog is a piece of the composer, and only its tokens are foreign.
 */
export default function DuelSealConfirm({
  taskFactionSlug,
  ...props
}: DuelSealConfirmProps & { taskFactionSlug: string | null | undefined }) {
  const formFactor = useFormFactor()
  const Skin =
    formFactor === 'mobile'
      ? pickVariant(surfaceMap('mobileDuelSeal'), taskFactionSlug, DefaultDuelSealConfirm)
      : pickVariant(surfaceMap('duelSeal'), taskFactionSlug, DefaultDuelSealConfirm)
  return <Skin {...props} />
}
