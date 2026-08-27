/**
 * Edit Praxis dispatcher.
 *
 * Loads praxis + task once via `useEditPraxis(id)` and selects the right
 * faction-archetype editor based on `task.primary_faction_slug`. The seven
 * archetypes share identical behaviour but each owns its own visual metaphor.
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
import { PraxisRoomProvider } from "./editPraxis/praxisRoom";
import { isWaitingStage } from "./editPraxis/editPraxisPhase";
import MetataskPicker from "../components/metataskSeal/MetataskPicker";
import MetataskRemoveConfirm from "../components/metataskSeal/MetataskRemoveConfirm";

export default function EditPraxis() {
  const { t } = useTranslation(["forms", "common"]);
  const { id } = useParams<{ id: string }>();
  const state = useEditPraxis(id);

  if (state.loading) {
    // Start the faction composer's chunk while the rest of the load finishes
    // (#1379) — the move `RootLanding` makes for its landing chunk, for the
    // same reason. The praxis names the task's faction (`task_faction_slug` is
    // `Task.primary_faction_slug`, off one builder server-side), and it lands a
    // round trip before `getTask` — which is what `loading` is still waiting
    // on. Without this the chunk is not even REQUESTED until that answer
    // arrives, so the composer's last wave is a download that could have
    // travelled with the one before it. It cannot change what renders: the
    // dispatch below still reads the task.
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

  // A published solo praxis has no roster and nobody to wait for, so `/edit` has
  // nothing left to draw and hands off to the read page (#1164). Before this it
  // rendered a LOCKED COMPOSER — a form with every control hidden. Replace
  // rather than push: the composer is not a step in the history of reading a
  // praxis, and Back should leave the way it came.
  if (state.phase === "handoff") {
    return <Navigate to={`/praxis/${state.praxis.id}`} replace />;
  }

  const slug = state.task?.primary_faction_slug ?? null;
  // One archetype at both widths (ADR-0065 §2): each archetype calls
  // `useFormFactor()` internally for its own size set, so the dispatcher has no
  // form factor to branch on.
  // ONE component per slug, drawing whichever stage the praxis is in.
  //
  // Once your part of a multi-party praxis is submitted the composer stops being
  // a composer (ADR-0059) and becomes `PraxisWaitingSurface` — but that swap is
  // the ARCHETYPE's to make, not the dispatcher's (#1189). The archetype hands
  // that shared surface its own `ComposerDress`, so the page keeps its faction's
  // masthead, ground, rule and status mark at the moment you press Submit; a
  // dispatcher-level swap could only ever hand over an undressed one, which is
  // what #1071 shipped and deferred. It is also how the design is authored: one
  // component taking a `stage` prop, not two components taking turns.
  //
  // The breadcrumb went with it. It used to be drawn here, gated on the waiting
  // phase, because that surface painted none of its own; now every path draws
  // exactly one — the archetype's, at both widths — and this dispatcher draws
  // none. Nothing may draw two and nothing may draw zero (#567, #1181).
  const Archetype = resolveVariant(surfaceMap('editPraxis'), slug);

  return (
    <>
      <PageTitle title="Edit Praxis" />
      {/* Every praxis is written in a room (ADR-0073) — solo, collab and duel
          part alike, so the composer has one authoring path and not two. Opened
          here rather than inside an archetype because the title and the body
          are two controls in one document, and both are the archetype's
          children.

          Wherever the composer's own regions are drawn, and only there: once
          your part is filed the archetype draws the waiting surface instead
          (ADR-0059), which has no title box and no write-up box, and a socket
          opened for a surface with no editor on it is a socket for nothing.
          A moderated praxis is NOT that case — it renders the composer locked,
          write-up and all, and that box still has to have the text in it. */}
      <PraxisRoomProvider
        praxisId={isWaitingStage(state.phase) ? null : state.praxis.id}
        onUpdate={state.setAutosaveAt}
      >
        <Archetype state={state} />
      </PraxisRoomProvider>
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
      {/* The Section-D seal picker and Section-E peel-off confirm (#933) mount
          here, beside the duel seal — one mount covers all 16 composer surfaces
          and both form factors. The picker is faction-neutral; each row wears
          its own issuing faction's dress. */}
      {state.metataskPickerOpen && <MetataskPicker state={state} />}
      {state.metataskRemovalTarget && <MetataskRemoveConfirm state={state} />}
      {/* Drop / delete / leave / re-open / mode-switch / dissolve-duel (#1082).
          Six confirms, one dialog, mounted here beside the other three so it
          covers every archetype, the waiting surface and both form factors —
          and so a composer confirm can never again be OS chrome. The kick
          confirm is the one exception: it lives inside CollabRoster, which the
          read page mounts too. */}
      {state.pendingConfirm && (
        <ConfirmDialog
          request={state.pendingConfirm}
          factionSlug={slug}
          onConfirm={state.acceptConfirm}
          onDismiss={state.dismissConfirm}
        />
      )}
      {/* Praxis images crop/rotate in place before upload (#514). No `aspect`,
          which is what earns the crop-shape picker (#1713): the frame starts on
          the photo's own ratio so nothing is force-cropped, and the player can
          re-lock it to 1:1 / 4:3 / 16:9. Sequential: keyed on identity so each
          queued image gets a fresh modal. A failure reports on the tray's
          file-error line rather than uploading the unprocessed image (#1545). */}
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
