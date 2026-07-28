/**
 * Task detail dispatcher.
 *
 * Loads task + submissions + signups once via `useTaskDetail(id)` and selects
 * the right faction-archetype page based on `task.primary_faction_slug`. Every
 * archetype consumes the same `TaskDetailState`; only the visual treatment
 * differs. Mirrors the EditPraxis dispatcher. Surface #10 in
 * docs/spec/SPEC-faction-ui-profile.md.
 *
 * ONE archetype per faction, responsive (ADR-0058, Proposed). There is no
 * `formFactor === "mobile"` branch here any more — each archetype calls
 * `useFormFactor()` itself for its own size set and conditional ornament.
 * `pages/taskDetail/mobileArchetypes/*` and the `mobileTaskDetail` manifest rows
 * stay registered but DORMANT during the evaluation window; restoring the branch
 * below is the whole revert, so do not delete them.
 *
 * Comments are no longer rendered here either — archetypes mount the shared
 * `TaskDetailComments` slot (archetypes/shared.tsx), which carries the
 * active-task gate, so a skin can dress its own section head and place the
 * thread in its own layout.
 */
import { useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import PageTitle from "../components/ui/PageTitle";
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useTaskDetail } from "./taskDetail/useTaskDetail";
import DefaultTaskDetail from "./taskDetail/archetypes/DefaultTaskDetail";


export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("tasks");
  const state = useTaskDetail(id);

  if (state.loading)
    return <div className="py-8 font-body text-muted">{t("detail.loading")}</div>;

  if (state.fetchError)
    return (
      <div className="py-8">
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
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
  const Archetype = pickVariant(surfaceMap('taskDetail'), slug, DefaultTaskDetail);

  return (
    <>
      <PageTitle title={t("detail.pageTitle")} eyebrow={t("detail.pageEyebrow")} />
      <Archetype state={state} />
    </>
  );
}
