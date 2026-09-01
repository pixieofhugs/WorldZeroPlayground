/**
 * MetataskSealStack — the editable seal stack (#933).
 *
 * Renders a solo praxis's applied metatasks as foreign seals (each dispatched on
 * its issuing faction by `<MetataskSeal>`) plus the dashed "+ Add a metatask"
 * slot when the viewer can seal. The `×` on each seal routes through the confirm
 * (Section E) rather than removing directly; the add slot opens the neutral
 * Section-D picker. Both the picker and the confirm are mounted once from the
 * EditPraxis dispatcher, so archetypes just drop this stack where the old
 * MetatasksList sat (below the score, above media).
 *
 * An ineligible viewer (`canSealMetatask === false`) still sees already-sealed
 * metatasks READ-ONLY: no `×`, no add slot — MetataskSeal renders nothing when
 * there is neither a seal nor an `onAdd`.
 *
 * NOTE ON PLACEMENT: this lives OUTSIDE `controls.tsx` on purpose. `MetataskSeal`
 * pulls in the faction registry (`factions/*`), which statically imports every
 * composer archetype — so importing it into `controls.tsx` would make the
 * archetype↔controls module graph eagerly load the whole registry (and broke the
 * submit-wiring test's `controls` mock by binding composers to the un-mocked
 * PublishButton). Keeping the MetataskSeal dependency in its own leaf module
 * keeps `controls.tsx` free of that cycle.
 */
import MetataskSeal from "./MetataskSeal";
import type { EditPraxisState } from "../../pages/editPraxis/useEditPraxis";

export function MetataskSealStack({
  appliedMetataskList,
  canSealMetatask,
  requestRemoveMetatask,
  openMetataskPicker,
}: Pick<
  EditPraxisState,
  | "appliedMetataskList"
  | "canSealMetatask"
  | "requestRemoveMetatask"
  | "openMetataskPicker"
>) {
  return (
    <MetataskSeal
      metatasks={appliedMetataskList}
      removable={canSealMetatask}
      onRemove={canSealMetatask ? requestRemoveMetatask : undefined}
      onAdd={canSealMetatask ? openMetataskPicker : undefined}
    />
  );
}

export default MetataskSealStack;
