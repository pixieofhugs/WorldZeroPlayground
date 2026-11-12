import type { TaskOut } from '../../api/tasks'

/**
 * The contract every seal skin receives: one applied metatask as a foreign
 * sticker in the ISSUING faction's dress, never the host card's. Shows issuer,
 * condition (`title`) and bonus (`point_value`).
 */
export interface SealSkinProps {
  /** One entry from `PraxisOut.applied_metatasks`; its faction slug selects the skin. */
  metatask: TaskOut
  /** Render the `×` peel control; only the compose surface (#933) sets it. */
  removable?: boolean
  /** Fired by the `×` control with the metatask's task id. */
  onRemove?: (taskId: number) => void
}
