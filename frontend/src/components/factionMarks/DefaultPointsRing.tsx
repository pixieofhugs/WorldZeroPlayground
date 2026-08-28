import type { CSSProperties } from "react";
import { factionRoleVar } from "../../utils/factionRoles";

/**
 * The spectrum ring — the unaffiliated (`na` ≡ Default) points mark (#2042).
 *
 * A figure and its unit inside a smooth conic rainbow annulus. Under ADR-0049 a
 * faction's total mark is the device the figure sits INSIDE, and this is the
 * unaffiliated one: where each faction commits to a loud archetype, `na` stays
 * un-committed and lets the whole spectrum ring the number, because every path is
 * still open (`DefaultTaskCard`).
 *
 * IT IS A SHARED MARK, BY OWNER RULING (#2042). `na` drew its points mark twice —
 * this ring on the task card, and a STRUCK DISC on the praxis-card score stamp
 * (a double hairline circle tilted -7deg, holding a rainbow-clipped numeral over a
 * gold caption, from the unaffiliated praxis-detail design #1091). The ruling is
 * that the point card reflects the card's total look, so the ring is canonical and
 * both surfaces mount it. THIS IS THE MOST VISIBLE CHANGE IN #2042 and the one to
 * eyeball first: the disc's tilt, its inner hairline, the rainbow-clipped figure
 * and the gold caption all go, and the rainbow arrives as structure instead — the
 * annulus rather than a fill clipped to four glyphs of type.
 *
 * A ROOTLESS PIECE TAKES `factionRoleVar`, NOT A PREFIX (#2672, the rule lane
 * 04 settled). This mark owns no root — it renders inside whatever host mounts
 * it, and the two hosts sit under two different prefixes — so there is nowhere
 * to spread `factionRoleVars`, a prefix of its own would be the `--kit-*`
 * namespace `WORLD_ZERO_STYLE.md:1179` declines, and taking the host's prefix
 * as a prop would be tree work rather than a paint lane's. Its three core roles
 * resolve through the map directly, with no fallback arm to keep in step:
 * `factionRoleVar("na", "ink")` IS `var(--faction-default-card-text)`, computed
 * rather than transcribed.
 *
 * THE GROUND IS A PROP, because the mark's disc is the SHEET IT IS MOUNTED ON
 * showing through the annulus rather than a colour of its own. The task card
 * passes nothing and gets na's `paper`; the score stamp passes
 * `--faction-default-stamp-bg`, its own plate. That is what makes the pairing
 * travel intact instead of being re-derived per surface — measured on each
 * surface's own ground, in both themes:
 *
 *              figure (`-card-text`)          unit (`-card-muted`)
 *   card sheet  18.22:1 light · 13.75:1 dark   6.05:1 light · 5.44:1 dark
 *   score plate 18.51:1 light · 12.20:1 dark   6.15:1 light · 4.82:1 dark
 *
 * The unit is the tight one: `--text-md` is small type, so it owes AA_NORMAL 4.5,
 * and dark-on-the-plate is 4.82:1. It clears, with less room than the
 * `--faction-default-gold` caption it replaces on that surface (8.23:1 dark,
 * 5.00:1 light) — worth knowing before anyone walks either token.
 *
 * Every value is a token, so both themes come from the `[data-theme="dark"]`
 * cascade and Albescent's `.alb-task` repointing reaches the mark for free —
 * there is no ternary and no prop for either.
 */

/** Lora, via the shared display token — the face the `na` task-card design names. */
const LORA = "var(--font-display)";

interface DefaultPointsRingProps {
  /** The figure inside the ring, already formatted by the caller. */
  value: string | number;
  /** The unit lettered under it. */
  unit: string;
  /**
   * Outer diameter in px. Ornament geometry (§4a) — the card draws 92/80 by form
   * factor and the score stamp draws the 96 its struck disc held.
   */
  size: number;
  /**
   * The figure's tier. A `--text-*` token, never a raw px: the numeral is type and
   * the ring is the geometry that yields to it.
   */
  valueSize?: string;
  /**
   * The sheet showing through the annulus. Defaults to the `na` card's own; a
   * surface on a different ground passes its own so the disc reads as the sheet
   * rather than as a patch laid on it.
   */
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
        // The annulus is the ring's whole thickness — a `--space-*` rung, so the
        // band scales with the app's spacing rather than with a drawn number.
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
