/**
 * Edit Praxis dispatcher.
 *
 * Loads praxis + task once via `useEditPraxis(id)` and selects the right
 * faction-archetype editor based on `task.primary_faction_slug`. The seven
 * archetypes share identical behaviour but each owns its own visual metaphor.
 */
import { useParams } from "react-router-dom";
import PageTitle from "../components/ui/PageTitle";
import { pickVariant } from "../utils/factionDispatch";
import {
  useEditPraxis,
  type EditPraxisState,
} from "./editPraxis/useEditPraxis";
import EditPraxisPunkZine from "./editPraxis/archetypes/EditPraxisPunkZine";
import EditPraxisTerminal from "./editPraxis/archetypes/EditPraxisTerminal";
import EditPraxisPaperCollage from "./editPraxis/archetypes/EditPraxisPaperCollage";
import EditPraxisEphemeris from "./editPraxis/archetypes/EditPraxisEphemeris";
import EditPraxisGazette from "./editPraxis/archetypes/EditPraxisGazette";
import EditPraxisStickyNote from "./editPraxis/archetypes/EditPraxisStickyNote";
import EditPraxisEverymen from "./editPraxis/archetypes/EditPraxisEverymen";

type Archetype = (props: { state: EditPraxisState }) => JSX.Element;

// albescent / aged_out inherit ua's archetype via pickVariant's alias rule, so
// they need no explicit rows here. ua is listed for documentation even though it
// matches the fallback.
const ARCHETYPE_BY_SLUG: Record<string, Archetype> = {
  everymen: EditPraxisEverymen,
  snide: EditPraxisPunkZine,
  singularity: EditPraxisTerminal,
  wow: EditPraxisPaperCollage,
  ephemerists: EditPraxisEphemeris,
  ua_masters: EditPraxisGazette,
  ua: EditPraxisStickyNote,
};

export default function EditPraxis() {
  const { id } = useParams<{ id: string }>();
  const state = useEditPraxis(id);

  if (state.loading) {
    return (
      <div className="py-8 font-body text-muted">
        <PageTitle title="Edit Praxis" />
        Loading...
      </div>
    );
  }

  if (!state.praxis) {
    return (
      <div
        className="py-8 font-body text-sm"
        style={{ color: "var(--color-danger)" }}
      >
        <PageTitle title="Edit Praxis" />
        {state.error || "Couldn't load this praxis."}
      </div>
    );
  }

  const slug = state.task?.primary_faction_slug ?? null;
  const Archetype = pickVariant(ARCHETYPE_BY_SLUG, slug, EditPraxisStickyNote);

  return (
    <>
      <PageTitle title="Edit Praxis" />
      <Archetype state={state} />
    </>
  );
}
