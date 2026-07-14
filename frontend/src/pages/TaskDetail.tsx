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
import { useTaskDetail, type TaskDetailState } from "./taskDetail/useTaskDetail";
import DefaultTaskDetail from "./taskDetail/archetypes/DefaultTaskDetail";
import SNIDETaskDetail from "./taskDetail/archetypes/SNIDETaskDetail";
import EverymenTaskDetail from "./taskDetail/archetypes/EverymenTaskDetail";
import WowTaskDetail from "./taskDetail/archetypes/WowTaskDetail";
import EphemeristsTaskDetail from "./taskDetail/archetypes/EphemeristsTaskDetail";
import SingularityTaskDetail from "./taskDetail/archetypes/SingularityTaskDetail";
import UATaskDetail from "./taskDetail/archetypes/UATaskDetail";
import AlbescentTaskDetail from "./taskDetail/archetypes/AlbescentTaskDetail";
import CommentThread from "../components/comments/CommentThread";

type Archetype = (props: { state: TaskDetailState }) => JSX.Element | null;

// Only factions with a bespoke archetype are listed; everything else (incl.
// na) falls through to DefaultTaskDetail below. albescent is a FIRST-CLASS
// identity (#232 slice 1) with its own entry.
export const ARCHETYPE_BY_SLUG: Record<string, Archetype> = {
  snide: SNIDETaskDetail,
  everymen: EverymenTaskDetail,
  wow: WowTaskDetail,
  ephemerists: EphemeristsTaskDetail,
  singularity: SingularityTaskDetail,
  ua: UATaskDetail,
  albescent: AlbescentTaskDetail,
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("tasks");
  const state = useTaskDetail(id);

  if (state.loading)
    return <div className="py-8 font-body text-muted">{t("detail.loading")}</div>;

  if (state.fetchError)
    return (
      <div className="py-8">
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
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
  const Archetype = pickVariant(ARCHETYPE_BY_SLUG, slug, DefaultTaskDetail);

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
