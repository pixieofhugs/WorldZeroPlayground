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
import PageTitle from "../components/ui/PageTitle";
import { pickVariant } from "../utils/factionDispatch";
import { useTaskDetail, type TaskDetailState } from "./taskDetail/useTaskDetail";
import DefaultTaskDetail from "./taskDetail/archetypes/DefaultTaskDetail";
import TaskDetailSNIDE from "./taskDetail/archetypes/TaskDetailSNIDE";
import TaskDetailEverymen from "./taskDetail/archetypes/TaskDetailEverymen";
import TaskDetailWow from "./taskDetail/archetypes/TaskDetailWow";
import TaskDetailEphemerists from "./taskDetail/archetypes/TaskDetailEphemerists";
import TaskDetailSingularity from "./taskDetail/archetypes/TaskDetailSingularity";
import TaskDetailUA from "./taskDetail/archetypes/TaskDetailUA";
import AlbescentTaskDetail from "./taskDetail/archetypes/AlbescentTaskDetail";
import CommentThread from "../components/comments/CommentThread";

type Archetype = (props: { state: TaskDetailState }) => JSX.Element | null;

// Only factions with a bespoke archetype are listed; everything else (incl.
// aged_out) falls through to DefaultTaskDetail below. albescent is now a
// FIRST-CLASS identity (#232 slice 1) — its explicit entry beats the
// albescent→ua alias in pickVariant.
export const ARCHETYPE_BY_SLUG: Record<string, Archetype> = {
  snide: TaskDetailSNIDE,
  everymen: TaskDetailEverymen,
  wow: TaskDetailWow,
  ephemerists: TaskDetailEphemerists,
  singularity: TaskDetailSingularity,
  ua: TaskDetailUA,
  albescent: AlbescentTaskDetail,
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const state = useTaskDetail(id);

  if (state.loading)
    return <div className="py-8 font-body text-muted">Loading...</div>;

  if (state.fetchError)
    return (
      <div className="py-8">
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {state.fetchError}{" "}
          <button
            onClick={() => window.location.reload()}
            className="underline"
          >
            Try refreshing.
          </button>
        </p>
      </div>
    );

  if (!state.task)
    return <div className="py-8 font-body text-muted">Task not found.</div>;

  const slug = state.task.primary_faction_slug ?? null;
  const Archetype = pickVariant(ARCHETYPE_BY_SLUG, slug, DefaultTaskDetail);

  return (
    <>
      <PageTitle title="Task" eyebrow="Tasks · Detail" />
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
