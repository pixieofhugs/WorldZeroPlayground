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
import { CollabSuccess } from "../components/collab/CollabSuccess";
import DuelSealConfirm from "../components/duel/DuelSealConfirm";
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useFormFactor } from "../hooks/useFormFactor";
import {
  useEditPraxis,
} from "./editPraxis/useEditPraxis";
import DefaultEditPraxis from "./editPraxis/archetypes/DefaultEditPraxis";
import { Breadcrumb } from "./editPraxis/archetypes/shared";
import DefaultMobileEditPraxis from "./editPraxis/mobileArchetypes/DefaultEditPraxis";

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
        className="py-8 font-body content-text"
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
      ? pickVariant(surfaceMap('mobileEditPraxis'), slug, DefaultMobileEditPraxis)
      : pickVariant(surfaceMap('editPraxis'), slug, DefaultEditPraxis);

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
      {/* The cast that closes a collab's consensus gate earns a standalone beat
          rather than a silent redirect (#591). Rendered here, over whichever
          archetype is mounted, so it's one shared screen for every faction and
          both form factors. Only the member who cast last ever sees it. */}
      {state.collabSuccess && (
        <CollabSuccess
          members={state.praxis.members}
          currentCharacterId={state.currentCharacterId}
          factionSlug={state.praxis.task_faction_slug}
          taskPointValue={state.praxis.task_point_value}
          onContinue={state.continueFromCollabSuccess}
        />
      )}
      {/* A duel cast is the one cast that can't be fully undone later, so it
          asks first (#718). Mounted here beside CollabSuccess — over whichever
          archetype rendered — so one mount covers all 16 composer surfaces and
          both form factors. Confirming calls the same publish() the button
          used to call directly. */}
      {state.duelSealOpen && state.duel && (
        <DuelSealConfirm
          taskFactionSlug={state.task?.primary_faction_slug}
          duel={state.duel}
          viewerCharacterId={state.currentCharacterId}
          taskPointValue={state.praxis.task_point_value}
          busy={state.submitting}
          onConfirm={() => void state.publish()}
          onCancel={state.cancelDuelSeal}
        />
      )}
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
