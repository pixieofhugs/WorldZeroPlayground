/**
 * Task detail dispatcher.
 *
 * Loads task + submissions once via `useTaskDetail(id)` and selects
 * the right faction-archetype page based on `task.primary_faction_slug`. Every
 * archetype consumes the same `TaskDetailState`; only the visual treatment
 * differs. Mirrors the EditPraxis dispatcher. Surface #10 in
 * docs/spec/SPEC-faction-ui-profile.md.
 *
 * ONE archetype per faction, responsive (ADR-0058, Accepted). There is no
 * `formFactor === "mobile"` branch here — each archetype calls `useFormFactor()`
 * itself for its own size set and conditional ornament. The mobile twins that
 * branch used to reach, and the manifest surface holding them, were deleted by
 * #1068 once the owner's phone QA accepted the collapse. Re-adding a form-factor
 * branch here would now be drift, not a rollback.
 *
 * Comments are no longer rendered here either — archetypes mount the shared
 * `TaskDetailComments` slot (archetypes/shared.tsx), which carries the
 * active-task gate, so a skin can dress its own section head and place the
 * thread in its own layout.
 */
import { useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import PageTitle from "../components/ui/PageTitle";
import StartHereMark from "../components/StartHereMark";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import { resolveVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useTaskDetail } from "./taskDetail/useTaskDetail";


export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(["tasks", "common"]);
  const state = useTaskDetail(id);

  if (state.loading)
    return <div className="py-8 font-body text-muted">{t("common:loading")}</div>;

  if (state.fetchError)
    return (
      <div className="py-8">
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {state.fetchError}{" "}
          <Trans
            t={t}
            i18nKey="detail.fetchError"
            components={[
              <button
                key="0"
                onClick={() => window.location.reload()}
                className="underline"
              />,
            ]}
          />
        </p>
      </div>
    );

  if (!state.task)
    return (
      <div className="py-8 font-body text-muted">{t("detail.notFound")}</div>
    );

  const slug = state.task.primary_faction_slug ?? null;
  const Archetype = resolveVariant(surfaceMap('taskDetail'), slug);

  return (
    <>
      {/* NO EYEBROW (#2102). It read `Tasks · Detail` — dot-separated, not
          links, above the title — which is the thing the report screenshotted
          and called a breadcrumb: "they are just text, not links. Clicking on
          the word Tasks does nothing." A fake trail sitting over a real one is
          the inconsistency, so the fake one goes. The archetype below draws the
          shared `Breadcrumb`. */}
      <PageTitle title={t("detail.pageTitle")} />
      {/* THE TASK MARKS ITSELF (#1861, SPEC-onboarding § The hand-off) — the
          signal appears WHEREVER the task appears, and this is its second
          surface after the card. On the dispatcher for the same reason it is on
          `TaskCard`'s: one place, every archetype, none of which learns
          anything about new players. `start_here` is derived server-side from
          the viewing character's own praxis history. */}
      {state.task.start_here && (
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <StartHereMark />
        </div>
      )}
      <Archetype state={state} />
      {/* THE DROP CONFIRM, MOUNTED ONCE (#2215). It sits here rather than in
          the nine archetypes for the same reason the fetch does: every skin
          draws its own Drop button and none of them has an opinion about the
          question that follows it. This replaces a `window.confirm` — the last
          one in the app after #1082 — which is OS chrome a browser is free to
          suppress, and did: a suppressed prompt returns `false`, so the
          handler returned in silence and the control looked inert.

          `factionSlug` is the TASK's, not the viewer's, so the dialog wears
          the surface it interrupts — same convention as the composer's. */}
      {state.dropConfirm && (
        <ConfirmDialog
          request={state.dropConfirm.request}
          factionSlug={slug}
          onConfirm={state.dropConfirm.onConfirm}
          onDismiss={state.dropConfirm.onDismiss}
        />
      )}
    </>
  );
}
