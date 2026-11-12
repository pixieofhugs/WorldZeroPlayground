import type { CSSProperties } from "react";
import { factionRoleVar } from "../../utils/factionRoles";

/**
 * The spectrum ring — the unaffiliated (`na` ≡ Default) points mark (#2042).
 *
 * A figure and unit inside a conic rainbow annulus. Shared by owner ruling:
 * the `na` task card and score stamp both mount it.
 *
 * Rootless, so it reads roles via `factionRoleVar`, not a prefix (#2672): its
 * two hosts sit under different prefixes.
 *
 * `ground` is a prop because the disc is the host's sheet showing through.
 * Contrast on each ground:
 *
 *              figure (`-card-text`)          unit (`-card-muted`)
 *   card sheet  18.22:1 light · 13.75:1 dark   6.05:1 light · 5.44:1 dark
 *   score plate 18.51:1 light · 12.20:1 dark   6.15:1 light · 4.82:1 dark
 *
 * The unit is tight: `--text-md` owes AA_NORMAL 4.5, and dark-on-plate is 4.82.
 */

/** Lora, per the `na` task-card design. */
const LORA = "var(--font-display)";

interface DefaultPointsRingProps {
  value: string | number;
  unit: string;
  /** Outer diameter in px (ornament geometry, §4a). */
  size: number;
  /** A `--text-*` token, never raw px. */
  valueSize?: string;
  /** Host sheet showing through the annulus; defaults to the `na` card's. */
  ground?: string;
  style?: CSSProperties;
}

export default function DefaultPointsRing({
  value,
  unit,
  size,
  valueSize = "var(--text-heading)",
  ground = factionRoleVar("na", "paper"),
  style,
}: DefaultPointsRingProps) {
  return (
    <div
      className="spectrum-dial"
      style={{
        flex: "0 0 auto",
        boxSizing: "border-box",
        width: size,
        height: size,
        borderRadius: "50%",
        // The annulus thickness.
        padding: "var(--space-xs)",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: ground,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0.9,
        }}
      >
        <span
          style={{
            fontFamily: LORA,
            fontWeight: 600,
            fontSize: valueSize,
            color: factionRoleVar("na", "ink"),
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-md)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: factionRoleVar("na", "quiet"),
            marginTop: "var(--space-xs)",
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
