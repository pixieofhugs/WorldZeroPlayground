import type { TaskOut } from '../../api/tasks'

/**
 * The contract every seal skin receives.
 *
 * A seal renders one applied metatask as a foreign STICKER: it keeps the
 * ISSUING faction's identity (label derived from `metatask.metatask_faction_slug`)
 * and never adopts the host card's dress. Each seal shows three things — the
 * issuing-faction label, the condition (`metatask.title`) and the bonus
 * (`metatask.point_value`, rendered "+N PTS").
 */
export interface SealSkinProps {
  /**
   * The applied metatask (one entry from `PraxisOut.applied_metatasks`).
   * `title` is the condition line, `point_value` the bonus, and
   * `metatask_faction_slug` the issuing faction that selects the skin.
   */
  metatask: TaskOut
  /**
   * When true, render the `×` peel control at the sticker's upper-right — the
   * only foreign control on an otherwise read-only seal. Read-only surfaces
   * (card, detail) omit it; the compose surface (#933) wires it.
   */
  removable?: boolean
  /** Fired by the `×` control with the metatask's task id. */
  onRemove?: (taskId: number) => void
}
