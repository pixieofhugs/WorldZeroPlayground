/**
 * Small presentational + logic helpers shared across task-detail archetypes.
 * Kept prop-driven and skinnable so wildly-different archetypes can reuse the
 * behaviour (level-jump banner, error banner, comment thread) without inheriting
 * each other's look. Mirrors editPraxis/archetypes/shared.tsx.
 *
 * `relationOf` (friend/foe resolution for roster badges) used to live here and
 * was removed in #1039: the v2 skins draw no in-progress roster — the header's
 * in-progress count is the only place that number appears — so nothing resolved
 * a relation any more. Reinstating a roster means reinstating the helper.
 */
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import CommentThread from "../../../components/comments/CommentThread";
import type { TaskDetailState } from "../useTaskDetail";

interface ErrorBannerProps {
  message: string | null;
  style?: CSSProperties;
}

/**
 * LevelJumpBanner — the shared level-jump affordance (#816). Rendered at the top
 * of every archetype's sign-up region so a WOW member (or any future faction
 * whose config grants a level-jump reach) sees a task they can only claim BECAUSE
 * of the allowance marked distinctly, never identical to a task at or below their
 * level. Purely presentational and config-driven: it renders only when
 * `state.levelJumpSignup` is true (computed in useTaskDetail off
 * `level_jump_reach`/`level_jump_available` — no slug comparison). When the
 * allowance is spent or the task is plainly out of reach the CTA doesn't render
 * at all, so this banner never appears and the task reads as locked.
 */
export function LevelJumpBanner({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  if (!state.levelJumpSignup || !state.task) return null;
  return (
    <div
      className="font-body"
      style={{
        display: "flex",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-sm)",
        padding: "var(--space-xs) var(--space-md)",
        background: "var(--color-bg-surface-alt)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
      }}
    >
      <span
        className="eyebrow"
        style={{ color: "var(--color-text-primary)" }}
      >
        {t("detail.levelJump.tag")}
      </span>
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        {t("detail.levelJump.note", { level: state.task.level_required })}
      </span>
    </div>
  );
}

/**
 * TaskDetailComments — the one comments slot every task-detail archetype mounts.
 *
 * The dispatcher used to render `<CommentThread>` below whichever archetype it
 * picked; #1030 moved the thread inside the archetypes so each skin can dress
 * its own section head and place the thread in its own layout. Putting the
 * `status === "active"` gate here (rather than copy-pasting it into nine files)
 * is the point: comments are open while a task is active (ADR-0006), and one
 * faction forgetting that gate is exactly the drift this prevents.
 *
 * Pass `heading` to supply a dressed section head; the thread's own
 * `{n} comments` `<h3>` is then suppressed so the page carries one heading, not
 * two. Omit it and the thread draws its default heading — which is what the
 * not-yet-redesigned faction archetypes want.
 */
export function TaskDetailComments({
  state,
  heading,
  style,
}: {
  state: TaskDetailState;
  heading?: ReactNode;
  style?: CSSProperties;
}) {
  const { task } = state;
  if (!task || task.status !== "active") return null;
  return (
    <section style={style}>
      {heading}
      <CommentThread
        target="tasks"
        targetId={task.id}
        showHeading={heading === undefined}
      />
    </section>
  );
}

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className="font-body"
      style={{
        fontSize: "var(--text-md)",
        color: "var(--color-danger)",
        marginTop: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        background: "rgba(220,38,38,0.06)",
        border: "1px solid rgba(220,38,38,0.2)",
        ...style,
      }}
    >
      {message}
    </div>
  );
}
