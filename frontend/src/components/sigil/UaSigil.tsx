// By path, not the barrel (#2779): `Sidebar` loads this eagerly, and the
// barrel would drag 2.0 KB gzipped of lazy-only marks onto the blocking path.
import Enso from "../factionMarks/Enso";

/** Shared UA identity atoms (#788, #848). */

/**
 * Ensō — UA's sigil (#849, #908). One ensō everywhere (owner ruling: "No two
 * ensō's on purpose"), delivered by {@link Enso} as a CSS mask over a `public/`
 * asset. The praxis handoff swaps in `--faction-ua-card-enso` (a token swap).
 * Reserved for the SCORE and the FACTION MARK; never a container border.
 * Non-square boxes letterbox via `mask-size: contain`.
 */
export function UaSigil({
  width,
  height,
  color = "var(--faction-ua-glow)",
}: {
  width: number;
  height: number;
  /** A token, always. */
  color?: string;
}) {
  return <Enso size={width} height={height} color={color} style={{ flexShrink: 0 }} />;
}
