/**
 * Edit Praxis dispatcher.
 *
 * Loads praxis + task once via `useEditPraxis(id)` and selects the right
 * faction-archetype editor based on `task.primary_faction_slug`. The seven
 * archetypes share identical behaviour but each owns its own visual metaphor.
 */
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTitle from "../components/ui/PageTitle";
import { pickVariant } from "../utils/factionDispatch";
import {
  useEditPraxis,
  type EditPraxisState,
} from "./editPraxis/useEditPraxis";
import SNIDEEditPraxis from "./editPraxis/archetypes/SNIDEEditPraxis";
import SingularityEditPraxis from "./editPraxis/archetypes/SingularityEditPraxis";
import WowEditPraxis from "./editPraxis/archetypes/WowEditPraxis";
import EphemeristsEditPraxis from "./editPraxis/archetypes/EphemeristsEditPraxis";
import DefaultEditPraxis from "./editPraxis/archetypes/DefaultEditPraxis";
import EverymenEditPraxis from "./editPraxis/archetypes/EverymenEditPraxis";
import UAEditPraxis from "./editPraxis/archetypes/UAEditPraxis";
import AlbescentEditPraxis from "./editPraxis/archetypes/AlbescentEditPraxis";

type Archetype = (props: { state: EditPraxisState }) => JSX.Element;

// ua owns the gilt-salon Atelier archetype. albescent is a FIRST-CLASS
// identity (#232 slice 1) with its own entry. StickyNote remains the fallback
// for `na` / unknown factions.
const ARCHETYPE_BY_SLUG: Record<string, Archetype> = {
  everymen: EverymenEditPraxis,
  snide: SNIDEEditPraxis,
  singularity: SingularityEditPraxis,
  wow: WowEditPraxis,
  ephemerists: EphemeristsEditPraxis,
  ua: UAEditPraxis,
  albescent: AlbescentEditPraxis,
};

export default function EditPraxis() {
  const { t } = useTranslation("forms");
  const { id } = useParams<{ id: string }>();
  const state = useEditPraxis(id);

  if (state.loading) {
    return (
      <div className="py-8 font-body text-muted">
        <PageTitle title={t("editPraxis.loadingPageTitle")} />
        {t("editPraxis.loading")}
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
  const Archetype = pickVariant(ARCHETYPE_BY_SLUG, slug, DefaultEditPraxis);

  return (
    <>
      <PageTitle title="Edit Praxis" />
      <Archetype state={state} />
    </>
  );
}
