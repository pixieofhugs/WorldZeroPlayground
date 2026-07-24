/**
 * MetataskSealStack — the editable seal stack (#933).
 *
 * Renders a solo praxis's applied metatasks as foreign seals (each dispatched on
 * its issuing faction by `<MetaTaskSeal>`) plus the dashed "+ Add a metatask"
 * slot when the viewer can seal. The `×` on each seal routes through the confirm
 * (Section E) rather than removing directly; the add slot opens the neutral
 * Section-D picker. Both the picker and the confirm are mounted once from the
 * EditPraxis dispatcher, so archetypes just drop this stack where the old
 * MetatasksList sat (below the score, above media).
 *
 * An ineligible viewer (`canSealMetatask === false`) still sees already-sealed
 * metatasks READ-ONLY: no `×`, no add slot — MetaTaskSeal renders nothing when
 * there is neither a seal nor an `onAdd`.
 *
 * NOTE ON PLACEMENT: this lives OUTSIDE `controls.tsx` on purpose. `MetaTaskSeal`
 * pulls in the faction registry (`factions/*`), which statically imports every
 * composer archetype — so importing it into `controls.tsx` would make the
 * archetype↔controls module graph eagerly load the whole registry (and broke the
 * submit-wiring test's `controls` mock by binding composers to the un-mocked
 * PublishButton). Keeping the MetaTaskSeal dependency in its own leaf module
 * keeps `controls.tsx` free of that cycle.
 */
import MetaTaskSeal from "../../components/metaTaskSeal/MetaTaskSeal";
import type { EditPraxisState } from "./useEditPraxis";

export function MetataskSealStack({ state }: { state: EditPraxisState }) {
  return (
    <MetaTaskSeal
      metatasks={state.appliedMetataskList}
      removable={state.canSealMetatask}
      onRemove={state.canSealMetatask ? state.requestRemoveMetatask : undefined}
      onAdd={state.canSealMetatask ? state.openMetataskPicker : undefined}
    />
  );
}

export default MetataskSealStack;
