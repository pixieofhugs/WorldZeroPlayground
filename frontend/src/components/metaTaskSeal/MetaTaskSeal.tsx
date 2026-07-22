import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import type { TaskOut } from '../../api/tasks'
import { pickVariant } from '../../utils/factionDispatch'
import DefaultSeal from './DefaultSeal'
import type { SealSkinProps } from './types'

/**
 * Central seal-skin registry — the ONE fall-through table the per-faction seal
 * issues extend (#929/#930/#931). A metatask's `metatask_faction_slug` selects
 * its skin; anything unregistered renders {@link DefaultSeal}. Adding a faction
 * skin is one row here — no dispatcher elsewhere changes. Empty for now: every
 * seal renders the neutral Default until the skins land.
 */
const SEAL_SKINS: Record<string, ComponentType<SealSkinProps>> = {}

export interface MetaTaskSealProps {
  /**
   * The praxis's applied metatasks (`PraxisOut.applied_metatasks`). One seal is
   * rendered per entry, stacked in order.
   */
  metatasks: TaskOut[]
  /**
   * When true, every seal shows its `×` peel control. Read-only surfaces (card,
   * detail) omit it; the compose surface (#933) passes it.
   */
  removable?: boolean
  /** Fired by a seal's `×` with the metatask's task id (compose surface wires it, #933). */
  onRemove?: (taskId: number) => void
  /**
   * When provided, render the dashed "+ Add a metatask" slot below the stack.
   * The caller passes this only when the viewer is eligible to seal, so the slot
   * is absent on read-only surfaces by construction.
   */
  onAdd?: () => void
}

/**
 * Renders a praxis's applied metatasks as a stack of foreign seals, each
 * dispatched on its issuing faction, with an optional "+ Add a metatask" empty
 * slot below. Read-only surfaces pass just `metatasks`; the compose surface
 * wires `removable`/`onRemove`/`onAdd`.
 */
export default function MetaTaskSeal({
  metatasks,
  removable,
  onRemove,
  onAdd,
}: MetaTaskSealProps) {
  const { t } = useTranslation('praxis')

  // Nothing sealed and no way to add one — render nothing.
  if (metatasks.length === 0 && !onAdd) return null

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
      {metatasks.map((metatask) => {
        const Skin = pickVariant(SEAL_SKINS, metatask.metatask_faction_slug, DefaultSeal)
        return (
          <Skin
            key={metatask.id}
            metatask={metatask}
            removable={removable}
            onRemove={onRemove}
          />
        )
      })}

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="font-body"
          style={{
            border: '2px dashed var(--faction-default-border)',
            borderRadius: 12,
            background: 'transparent',
            color: 'var(--faction-default-card-muted)',
            fontSize: 'var(--text-md)',
            padding: 'var(--space-md) var(--space-lg)',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          {t('detail.seal.add')}
        </button>
      )}
    </div>
  )
}
