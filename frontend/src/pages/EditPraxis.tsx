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
import EditPraxisStickyNote from "./editPraxis/archetypes/EditPraxisStickyNote";
import EditPraxisEverymen from "./editPraxis/archetypes/EditPraxisEverymen";
import EditPraxisUA from "./editPraxis/archetypes/EditPraxisUA";
import AlbescentEditPraxis from "./editPraxis/archetypes/AlbescentEditPraxis";

type Archetype = (props: { state: EditPraxisState }) => JSX.Element;

// ua owns the gilt-salon Atelier archetype; aged_out inherits it via pickVariant's
// alias rule (no explicit row). albescent is now a FIRST-CLASS identity (#232
// slice 1) — its explicit entry beats the albescent→ua alias. StickyNote remains
// the fallback for `na` / unknown factions.
const ARCHETYPE_BY_SLUG: Record<string, Archetype> = {
  everymen: EditPraxisEverymen,
  snide: EditPraxisPunkZine,
  singularity: EditPraxisTerminal,
  wow: EditPraxisPaperCollage,
  ephemerists: EditPraxisEphemeris,
  ua: EditPraxisUA,
  albescent: AlbescentEditPraxis,
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
