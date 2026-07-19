/**
 * Task detail dispatcher.
 *
 * Loads task + submissions + signups once via `useTaskDetail(id)` and selects
 * the right faction-archetype page based on `task.primary_faction_slug`. Every
 * archetype consumes the same `TaskDetailState`; only the visual treatment
 * differs. Mirrors the EditPraxis dispatcher. Surface #10 in
 * docs/spec/SPEC-faction-ui-profile.md.
 */
import { useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import PageTitle from "../components/ui/PageTitle";
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useFormFactor } from "../hooks/useFormFactor";
import { useTaskDetail } from "./taskDetail/useTaskDetail";
import DefaultTaskDetail from "./taskDetail/archetypes/DefaultTaskDetail";
import DefaultMobileTaskDetail from "./taskDetail/mobileArchetypes/DefaultTaskDetail";
import CommentThread from "../components/comments/CommentThread";


export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("tasks");
  const state = useTaskDetail(id);
  const formFactor = useFormFactor();

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
  const Archetype =
    formFactor === "mobile"
      ? pickVariant(surfaceMap('mobileTaskDetail'), slug, DefaultMobileTaskDetail)
      : pickVariant(surfaceMap('taskDetail'), slug, DefaultTaskDetail);

  return (
    <>
      <PageTitle title={t("detail.pageTitle")} eyebrow={t("detail.pageEyebrow")} />
      <Archetype state={state} />
      {/* Comments below every archetype (ADR-0006); tasks are commentable while active. */}
      {state.task.status === "active" && (
        <div className="max-w-2xl">
          <CommentThread target="tasks" targetId={state.task.id} />
        </div>
      )}
    </>
  );
}
