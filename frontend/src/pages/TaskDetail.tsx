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
  const Archetype = pickVariant(surfaceMap('taskDetail'), slug, DefaultTaskDetail);

  return (
    <>
      <PageTitle title={t("detail.pageTitle")} eyebrow={t("detail.pageEyebrow")} />
      <Archetype state={state} />
    </>
  );
}
