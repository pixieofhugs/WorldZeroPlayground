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
 * The Default skin below is the only one this issue ships; the registries exist
 * so per-faction skins (#720 for Wow, one issue per faction after) are a map row
 * and nothing else. Skins own the FRAME only — every figure and every branch
 * lives in `duel/shared.tsx`.
 */
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import type { DuelDetailOut } from '../../api/duel'
import { useFormFactor } from '../../hooks/useFormFactor'
import { factionCssVar } from '../../utils/factions'
import { pickVariant } from '../../utils/factionDispatch'
import { duelSides, RaceRoster, SealActions, StakesTiles, type DuelSlotTheme } from './shared'
import WowDuelSealConfirm from './WowDuelSealConfirm'
import WowMobileDuelSealConfirm from './WowMobileDuelSealConfirm'

export interface DuelSealConfirmProps {
  duel: DuelDetailOut
  viewerCharacterId: number | null | undefined
  /** The task's base point value — every stakes figure is derived from it. */
  taskPointValue: number | null | undefined
  /** Fires the composer's existing `publish()`, untouched. */
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

export function DefaultDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
}: DuelSealConfirmProps) {
  const { t } = useTranslation('praxis')
  const formFactor = useFormFactor()
  const isMobile = formFactor === 'mobile'
  const { me, foe } = duelSides(duel, viewerCharacterId)

  // Tokens come from the OPPONENT's faction, matching the read-page rail: the
  // opponent is the foreign element and should look foreign (grilled #310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('duelSeal.heading')}
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
      style={{
        background: isMobile
          ? 'var(--color-bg-page)'
          : 'radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))',
      }}
    >
      <div
        className={`flex flex-col gap-[12px] p-[24px] ${
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
          {t('duelSeal.heading')}
        </h2>

        <p
          className="font-body"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}
        >
          {duel.status === 'pending'
            ? t('duelSeal.bodyPending', { name: foe.display_name })
            : t('duelSeal.bodyActive', { name: foe.display_name })}
        </p>

        {/* The free-reopen half of the truth: until they cast, nothing is stuck.
            Only meaningful once the duel is live — a pending duel can't settle. */}
        {duel.status === 'active' && !foe.is_submitted && (
          <p
            className="font-body"
            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}
          >
            {t('duelSeal.reopenNote', { name: foe.display_name })}
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

        <SealActions onConfirm={onConfirm} onCancel={onCancel} busy={busy} theme={theme} />
      </div>
    </div>
  )
}

/**
 * Per-faction seal dialogs. Every unregistered faction gets the Default skin;
 * each bespoke skin is a purely visual follow-up that can never be urgent.
 * Wow is first (#720) — it is the only faction with a design in hand.
 */
export const DUEL_SEAL_BY_SLUG: Record<string, ComponentType<DuelSealConfirmProps>> = {
  wow: WowDuelSealConfirm,
}

/** Parallel MOBILE registry (#494 form-factor dispatch). */
export const MOBILE_DUEL_SEAL_BY_SLUG: Record<string, ComponentType<DuelSealConfirmProps>> = {
  wow: WowMobileDuelSealConfirm,
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
      ? pickVariant(MOBILE_DUEL_SEAL_BY_SLUG, taskFactionSlug, DefaultDuelSealConfirm)
      : pickVariant(DUEL_SEAL_BY_SLUG, taskFactionSlug, DefaultDuelSealConfirm)
  return <Skin {...props} />
}
