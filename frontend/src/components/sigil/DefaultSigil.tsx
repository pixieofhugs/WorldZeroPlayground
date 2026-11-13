/**
 * DefaultSigil — the `na` mark: the whole spectrum swept as a ring, via
 * `--faction-default-rainbow-conic` (flips in dark, #418). A smooth sweep, not
 * seven wedges: the light stops are too close in luminance to separate (#1127).
 */
import i18n from "../../i18n";

interface DefaultSigilProps {
  /** px diameter */
  size?: number;
  /** inner cut-out as a fraction of the radius (0–1) */
  hole?: number;
  /** Any CSS `background` (#1892): the sidebar rail samples a rainbow window per row. */
  color?: string;
}

export default function DefaultSigil({ size = 48, hole = 0.4, color }: DefaultSigilProps) {
  const inner = Math.round(hole * 100);
  // Alpha stencil, not a themed colour.
  const mask = `radial-gradient(circle, transparent ${inner - 2}%, #000 ${inner}%)`;
  return (
    <div
      role="img"
      aria-label={i18n.t("feed:identity.na.sigilLabel")}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "none",
        background: color ?? "var(--faction-default-rainbow-conic)",
        WebkitMask: mask,
        mask,
      }}
    />
  );
}
