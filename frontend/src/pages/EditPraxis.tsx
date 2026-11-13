/**
 * Edit Praxis dispatcher: loads via `useEditPraxis(id)` and picks the faction
 * archetype by `task.primary_faction_slug`. Shared overlays mount here so one
 * mount covers every archetype and both form factors.
 */
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTitle from "../components/ui/PageTitle";
import ImageEditModal from "../components/imageEdit/ImageEditModal";
import { CollabSuccess } from "../components/collab/CollabSuccess";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import DuelSealConfirm from "../components/duel/DuelSealConfirm";
import { resolveVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { preloadArchetype } from "../factions/lazyArchetype";
import {
  useEditPraxis,
} from "./editPraxis/useEditPraxis";
import { useStrayFileDropGuard } from "./editPraxis/strayFileDrop";
import { PraxisRoomProvider } from "./editPraxis/praxisRoom";
import { isWaitingStage } from "./editPraxis/editPraxisPhase";
import MetataskPicker from "../components/metataskSeal/MetataskPicker";
import MetataskRemoveConfirm from "../components/metataskSeal/MetataskRemoveConfirm";

export default function EditPraxis() {
  const { t } = useTranslation(["forms", "common"]);
  const { id } = useParams<{ id: string }>();
  const state = useEditPraxis(id);
  // Whole route (#3172): a drop while loading/failed must not navigate away.
  useStrayFileDropGuard();

  if (state.loading) {
    // Fetch the composer chunk a round trip early (#1379): the praxis's
    // `task_faction_slug` lands before `getTask`. Render still reads the task.
    preloadArchetype(
      resolveVariant(
        surfaceMap("editPraxis"),
        state.praxis?.task_faction_slug,
      ),
    );
    return (
      <div className="py-8 font-body text-muted">
        <PageTitle title={t("editPraxis.loadingPageTitle")} />
        {t("common:loading")}
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

  // A published solo praxis has nothing to edit: hand off to the read page
  // (#1164), replacing so Back leaves the way it came.
  if (state.phase === "handoff") {
    return <Navigate to={`/praxis/${state.praxis.id}`} replace />;
  }

  const slug = state.task?.primary_faction_slug ?? null;
  // One archetype per slug at both widths (ADR-0065 §2), drawing every stage:
  // the swap to `PraxisWaitingSurface` (ADR-0059) is the archetype's, so it
  // can pass its own `ComposerDress` (#1189). The archetype draws the one
  // breadcrumb; this draws none (#1181).
  const Archetype = resolveVariant(surfaceMap('editPraxis'), slug);

  return (
    <>
      <PageTitle title="Edit Praxis" />
      {/* Every praxis is written in a room (ADR-0073); opened here because
          title and body are one document. No socket on the waiting surface
          (no editor); a moderated praxis still renders its locked text. */}
      <PraxisRoomProvider
        praxisId={isWaitingStage(state.phase) ? null : state.praxis.id}
        onUpdate={state.setAutosaveAt}
      >
        <Archetype state={state} />
      </PraxisRoomProvider>
      {/* The cast that closes a collab's gate gets a beat (#591). */}
      {state.collabSuccess && (
        <CollabSuccess
          members={state.praxis.members}
          currentCharacterId={state.currentCharacterId}
          factionSlug={state.praxis.task_faction_slug}
          taskPointValue={state.praxis.task_point_value}
          onContinue={state.continueFromCollabSuccess}
        />
      )}
      {/* A duel cast can't be fully undone, so it asks first (#718). */}
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
      {/* Seal picker and peel-off confirm (#933). */}
      {state.metataskPickerOpen && (
        <MetataskPicker
          metatasks={state.metatasks}
          appliedMetatasks={state.appliedMetatasks}
          applyingMetatask={state.applyingMetatask}
          addMetatask={state.addMetatask}
          closeMetataskPicker={state.closeMetataskPicker}
          error={state.error}
        />
      )}
      {state.metataskRemovalTarget && (
        <MetataskRemoveConfirm
          metataskRemovalTarget={state.metataskRemovalTarget}
          applyingMetatask={state.applyingMetatask}
          confirmRemoveMetatask={state.confirmRemoveMetatask}
          cancelRemoveMetatask={state.cancelRemoveMetatask}
        />
      )}
      {/* The composer's six confirms, one dialog (#1082). Kick lives in
          CollabRoster, which the read page mounts too. */}
      {state.pendingConfirm && (
        <ConfirmDialog
          request={state.pendingConfirm}
          factionSlug={slug}
          onConfirm={state.acceptConfirm}
          onDismiss={state.dismissConfirm}
        />
      )}
      {/* Crop/rotate before upload (#514). No `aspect` = crop-shape picker
          (#1713). Keyed per file for a fresh modal; failure reports, never
          uploads the raw image (#1545). */}

      {state.pendingImage && (
        <ImageEditModal
          key={`${state.pendingImage.name}-${state.pendingImage.lastModified}`}
          file={state.pendingImage}
          onConfirm={(blob) => void state.confirmImageEdit(blob)}
          onCancel={state.cancelImageEdit}
          onError={state.reportImageError}
        />
      )}
    </>
  );
}
