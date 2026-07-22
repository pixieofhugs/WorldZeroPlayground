/**
 * Small presentational + logic helpers shared across task-detail archetypes.
 * Kept prop-driven and skinnable so wildly-different archetypes can reuse the
 * behaviour (friend/foe resolution, breadcrumb, error banner) without inheriting
 * each other's look. Mirrors editPraxis/archetypes/shared.tsx.
 */
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { TaskDetailState } from "../useTaskDetail";

/** Resolve a signup character's relationship to the viewer (for badges). */
export function relationOf(
  characterId: number,
  friends: Set<number>,
  foes: Set<number>,
): "friend" | "foe" | null {
  if (friends.has(characterId)) return "friend";
  if (foes.has(characterId)) return "foe";
  return null;
}

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
