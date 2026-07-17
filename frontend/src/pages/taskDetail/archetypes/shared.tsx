/**
 * Small presentational + logic helpers shared across task-detail archetypes.
 * Kept prop-driven and skinnable so wildly-different archetypes can reuse the
 * behaviour (friend/foe resolution, breadcrumb, error banner) without inheriting
 * each other's look. Mirrors editPraxis/archetypes/shared.tsx.
 */
import type { CSSProperties } from "react";

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

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className="font-body"
      style={{
        fontSize: "var(--text-md)",
        color: "var(--color-danger)",
        marginTop: 8,
        padding: "8px 12px",
        background: "rgba(220,38,38,0.06)",
        border: "1px solid rgba(220,38,38,0.2)",
        ...style,
      }}
    >
      {message}
    </div>
  );
}
