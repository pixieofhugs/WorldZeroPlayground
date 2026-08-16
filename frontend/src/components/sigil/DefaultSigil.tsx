/**
 * DefaultSigil — the mark for the unaffiliated / no-faction (`na`) state: the
 * whole spectrum swept as a ring (every path still open). Pure presentation, no
 * data. Built on the `--faction-default-rainbow-conic` token so it flips to the
 * brightened spectrum in dark automatically (#418). Parity with the seven
 * faction sigils; consumed by the default task/praxis cards, DefaultAvatar, and
 * the Edit Character retheme (#434).
 *
 * It was seven HARD wedges until #1127 — one arc per faction, which read neatly
 * as "one segment per open path". It is a smooth sweep now: all seven light
 * stops sit inside a WCAG-luminance band of 0.184, so the wedge boundaries had
 * nothing to distinguish them and the ring read as one dark band in light mode.
 * The spectrum is still the point; the segment count no longer is.
 */
import i18n from "../../i18n";

interface DefaultSigilProps {
  /** px diameter */
  size?: number;
  /** inner cut-out as a fraction of the radius (0–1) */
  hole?: number;
  /**
   * What to paint the ring with instead of the whole conic sweep (#1892). Any
   * CSS `background` value, not just a colour: the ring is PAINTED rather than
   * stroked, and the one caller that needs this — the sidebar's activity rail —
   * samples a window of `--faction-default-rainbow` by row position, which is a
   * background shorthand and not a stop that can be named. Its rows would
   * otherwise repeat one identical spectrum ring down the column.
   *
   * Named `color` to line up with `FactionSigilProps`, so a caller that reaches
   * this through the dispatcher spells it the same way the other seven marks do.
   */
  color?: string;
}

export default function DefaultSigil({ size = 48, hole = 0.4, color }: DefaultSigilProps) {
  const inner = Math.round(hole * 100);
  // The mask color is an alpha stencil (not a themed value): opaque keeps the
  // ring, transparent punches the centre hole.
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
