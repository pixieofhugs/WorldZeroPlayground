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
import ImageEditModal from "../components/imageEdit/ImageEditModal";
import { pickVariant } from "../utils/factionDispatch";
import { useFormFactor } from "../hooks/useFormFactor";
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
import { Breadcrumb } from "./editPraxis/archetypes/shared";
import DefaultMobileEditPraxis from "./editPraxis/mobileArchetypes/DefaultEditPraxis";
import WowMobileEditPraxis from "./editPraxis/mobileArchetypes/WowEditPraxis";
import UAMobileEditPraxis from "./editPraxis/mobileArchetypes/UaComposer";
import SingularityMobileEditPraxis from "./editPraxis/mobileArchetypes/SingularityComposer";
import EverymenMobileEditPraxis from "./editPraxis/mobileArchetypes/EverymenComposer";
import EphemeristsMobileEditPraxis from "./editPraxis/mobileArchetypes/EphemeristsComposer";
import AlbescentMobileEditPraxis from "./editPraxis/mobileArchetypes/AlbescentComposer";
import SnideMobileEditPraxis from "./editPraxis/mobileArchetypes/SnideComposer";

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

// Parallel MOBILE registry (#498). WOW is the pilot bespoke phone composer; every
// other faction falls through to the Default mobile skin. Bespoke faction mobile
// composers land incrementally, exactly like the desktop archetypes above.
export const MOBILE_ARCHETYPE_BY_SLUG: Record<string, Archetype> = {
  wow: WowMobileEditPraxis,
  ua: UAMobileEditPraxis,
  singularity: SingularityMobileEditPraxis,
  everymen: EverymenMobileEditPraxis,
  ephemerists: EphemeristsMobileEditPraxis,
  albescent: AlbescentMobileEditPraxis,
  snide: SnideMobileEditPraxis,
};

export default function EditPraxis() {
  const { t } = useTranslation("forms");
  const { id } = useParams<{ id: string }>();
  const state = useEditPraxis(id);
  const formFactor = useFormFactor();

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
  const Archetype =
    formFactor === "mobile"
      ? pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileEditPraxis)
      : pickVariant(ARCHETYPE_BY_SLUG, slug, DefaultEditPraxis);

  return (
    <>
      <PageTitle title="Edit Praxis" />
      {/* Mobile skins paint no breadcrumb of their own, so after publish the
          phone composer is a dead end (#567). Render the shared desktop
          breadcrumb once here for the mobile path — present for every skin and
          every state, including the published state. Desktop archetypes render
          their own breadcrumb, so gate this to mobile to avoid doubling up. */}
      {formFactor === "mobile" && (
        <Breadcrumb
          praxisId={state.praxis.id}
          taskId={state.praxis.task_id}
          taskTitle={state.praxis.task_title}
        />
      )}
      <Archetype state={state} />
      {/* Praxis images crop/rotate in place before upload (#514), free-form so
          nothing is force-cropped. Sequential: keyed on identity so each queued
          image gets a fresh modal. */}
      {state.pendingImage && (
        <ImageEditModal
          key={`${state.pendingImage.name}-${state.pendingImage.lastModified}`}
          file={state.pendingImage}
          onConfirm={(blob) => void state.confirmImageEdit(blob)}
          onCancel={state.cancelImageEdit}
        />
      )}
    </>
  );
}
