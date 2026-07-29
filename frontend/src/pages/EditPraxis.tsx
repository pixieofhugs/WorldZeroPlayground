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
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import {
  useEditPraxis,
} from "./editPraxis/useEditPraxis";
import DefaultEditPraxis from "./editPraxis/archetypes/DefaultEditPraxis";
import { Breadcrumb } from "./editPraxis/archetypes/shared";
import MetataskPicker from "./editPraxis/MetataskPicker";
import MetataskRemoveConfirm from "./editPraxis/MetataskRemoveConfirm";
import PraxisWaitingSurface from "./editPraxis/waiting/PraxisWaitingSurface";

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
    return <Navigate to={`/praxes/${state.praxis.id}`} replace />;
  }

  const slug = state.task?.primary_faction_slug ?? null;
  // One archetype at both widths (ADR-0065 §2). The `mobileEditPraxis` surface
  // and its eight files were retired in #1181: each archetype calls
  // `useFormFactor()` internally for its own size set, so the dispatcher has no
  // form factor to branch on.
  const Archetype = pickVariant(surfaceMap('editPraxis'), slug, DefaultEditPraxis);
  // Once your part of a multi-party praxis is submitted, the composer stops
  // being a composer (ADR-0059) and this one shared surface takes the
  // archetype's place — first while the praxis waits on somebody else, and then
  // (#1164) in its completed reading once everybody is in. The second case is
  // what used to be a locked composer.
  const waiting = state.phase === "waiting" || state.phase === "completed";

  return (
    <>
      <PageTitle title="Edit Praxis" />
      {/* The waiting surface paints no breadcrumb of its own, so it takes the
          shared one — otherwise the post-cast screen is a dead end (#567).
          Every ARCHETYPE paints its own, at both widths since #1181 collapsed
          the form-factor split, so this is gated to the waiting surface alone.
          The gate used to read `formFactor === "mobile" || waiting`, which was
          the phone half of the same #567 argument: mobile skins painted none.
          Those skins are gone and the desktop archetype now serves the phone,
          so the phone half is already covered and keeping it would draw a
          SECOND breadcrumb above every mobile composer. Exactly one of the two
          paths draws one, in every state and at every width. */}
      {waiting && (
        <Breadcrumb
          praxisId={state.praxis.id}
          taskId={state.praxis.task_id}
          taskTitle={state.praxis.task_title}
        />
      )}
      {waiting ? (
        <PraxisWaitingSurface state={state} />
      ) : (
        <Archetype state={state} />
      )}
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
