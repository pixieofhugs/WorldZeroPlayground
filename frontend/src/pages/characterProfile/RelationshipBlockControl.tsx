/**
 * Block, from the character profile (#1668, ADR-0077). Keyed by character, not
 * an edge (#1907), so a player declared a foe with no edge of their own can block.
 *
 * Visibility is the contract (safety affordance): the gate below hides it when
 * logged out, on your own profile, or already blocked — wrong placement would be
 * a wrong action, and the gate is testable without a DOM. Block confirms via
 * `ConfirmDialog` (#1082); `unblock` doesn't.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import ConfirmDialog, {
  type ConfirmRequest,
} from '../../components/confirm/ConfirmDialog'

/** Interpolated keys can't be the typed literals `t()` wants (composerConfirms). */
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, string | number>,
) => string

/**
 * The confirm, as a pure builder. States ADR-0077's reach (taunts and the
 * friends-and-foes feed only), silence and reversibility; the reach must not
 * promise more than the ADR lists.
 */
export function blockConfirm(displayName: string): ConfirmRequest {
  return {
    kind: 'blockRelationship',
    title: tString('common:relationships.blockConfirm.title', {
      name: displayName,
    }),
    body: tString('common:relationships.blockConfirm.body'),
    confirmLabel: tString('common:relationships.blockConfirm.action'),
    danger: true,
  }
}

export default function RelationshipBlockControl({
  viewerCharacterId,
  targetCharacterId,
  targetDisplayName,
  factionSlug,
  alreadyBlocked,
  busy,
  onBlock,
}: {
  /** Undefined when logged out / character-less. */
  viewerCharacterId: number | undefined
  targetCharacterId: number
  targetDisplayName: string
  /** The dialog wears the surface it interrupts. */
  factionSlug: string | null | undefined
  /** From the viewer's OWN block list, so false for the blocked party by construction. */
  alreadyBlocked: boolean
  busy: boolean
  /** The page owns the API call and the error. */
  onBlock: () => void
}) {
  const { t } = useTranslation('common')
  const [confirming, setConfirming] = useState(false)

  const blockable =
    viewerCharacterId !== undefined &&
    viewerCharacterId !== targetCharacterId &&
    // Blocked: the slot is `unblock`'s. No edge consulted (friend + block is legal).
    !alreadyBlocked
  if (!blockable) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy}
        // "block" alone has no object out of context.
        aria-label={t('relationships.blockAria', { name: targetDisplayName })}
        className="label-caption"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        {t('relationships.block')}
      </button>
      {confirming && (
        <ConfirmDialog
          request={blockConfirm(targetDisplayName)}
          factionSlug={factionSlug}
          onConfirm={() => {
            setConfirming(false)
            onBlock()
          }}
          onDismiss={() => setConfirming(false)}
        />
      )}
    </>
  )
}
