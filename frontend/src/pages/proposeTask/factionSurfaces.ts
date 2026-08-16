/**
 * The propose-task form's faction surfaces (#1824).
 *
 * One selected faction, one visual language: the card's frame, the task-name
 * field, the metatask box and the submit pill all read the SAME slug, and they
 * are here rather than inline so they answer it the same way. Before this, the
 * card wore a 4px left rule for a known faction and a full spectrum frame for
 * `na` — two different-looking components depending on selection.
 *
 * No colour lives here. Every value resolves through `factionCssVar` /
 * `factionFill` into `index.css`, so each faction and each `[data-theme]`
 * arrives through the cascade (ADR-0039 for why `na` branches at all: its
 * identity is a gradient, and `factionCssVar('na')` is deliberately neutral
 * grey). The branch is `isKnownFaction`, a VALUE test — which is also what
 * keeps Albescent unthemed here (#749, #783).
 */
import type { CSSProperties } from "react";
import { factionCssVar, factionFill, isKnownFaction } from "../../utils/factions";

/**
 * A gradient border around an OPAQUE interior.
 *
 * Two background layers: the neutral card paper clipped to the padding box, the
 * gradient clipped to the border box, with a transparent border for it to show
 * through. The paper layer must be `--faction-default-card-bg` and not
 * `--color-bg-surface` — surface is translucent in BOTH themes
 * (rgba(255,255,255,0.04) dark, rgba(255,255,255,0.72) light), so the gradient
 * reads straight through it and the whole card fills rainbow.
 *
 * Longhand rather than the `background` shorthand `factionFill(_, "frame")`
 * uses: this one lands on a `.sidebar-card`, whose own background rules the
 * shorthand interacts badly with. `backgroundColor: transparent` is part of
 * that — the longhand image list does not reset the class's colour on its own.
 */
function gradientFrame(edge: string): CSSProperties {
  return {
    backgroundColor: "transparent",
    backgroundImage: `linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)), ${edge}`,
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
    backgroundRepeat: "no-repeat",
    border: "2px solid transparent",
    boxSizing: "border-box",
  };
}

/**
 * The form card: an even 2px frame on all four sides.
 *
 * `na` flies the spectrum; a real faction gets a 135° ramp of its own hue,
 * shaded at one end and lifted at the other so the edge reads as a bevel rather
 * than a flat outline. `#000` / `#fff` there are `color-mix` ENDPOINTS — the
 * arithmetic that darkens and lightens the faction's own token — not theme
 * colours, and there is deliberately no per-faction hex anywhere near them.
 */
export function proposeCardStyle(slug: string | null | undefined): CSSProperties {
  const tint = factionCssVar(slug);
  const edge = isKnownFaction(slug)
    ? `linear-gradient(135deg, color-mix(in srgb, ${tint} 30%, #000) 0%, ${tint} 55%, color-mix(in srgb, ${tint} 45%, #fff) 100%)`
    : "var(--faction-default-rainbow)";
  return {
    ...gradientFrame(edge),
    borderRadius: 8,
    padding: "var(--space-lg) var(--space-xl)",
  };
}

/**
 * The task-name field, set in the faction's own display face.
 *
 * DEVIATION FROM THE ISSUE PROSE, FOLLOWING THE DESIGN FILE: unaffiliated keeps
 * the body face. `factionCssVar("na", "card-font")` resolves to
 * `--faction-default-card-font`, which is Bebas Neue — a condensed display face
 * the form's DEFAULT state never asked for. The design's `titleInputStyle`
 * hands `na` `var(--font-body)`, and this is the state the page opens in.
 *
 * The bottom rule takes the tint once the field has a value; unaffiliated has
 * no single hue to take, so it reads as the primary ink instead.
 */
export function taskNameInputStyle(
  slug: string | null | undefined,
  hasValue: boolean,
): CSSProperties {
  const known = isKnownFaction(slug);
  const rule = hasValue
    ? known
      ? factionCssVar(slug)
      : "var(--color-text-primary)"
    : "var(--color-border-strong)";
  return {
    width: "100%",
    fontFamily: known
      ? `${factionCssVar(slug, "card-font")}, var(--font-body)`
      : "var(--font-body)",
    fontSize: "var(--text-title)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${rule}`,
    outline: "none",
    paddingBottom: "var(--space-sm)",
    transition: "border-color 150ms",
  };
}

/**
 * The metatask tick box.
 *
 * A native `<input type="checkbox">` cannot carry this: `accent-color` takes a
 * single colour, and unaffiliated's identity is seven of them. So the control
 * is a `role="checkbox"` button and this is the box it draws.
 */
export function metaBoxStyle(
  slug: string | null | undefined,
  checked: boolean,
): CSSProperties {
  const box: CSSProperties = {
    width: 18,
    height: 18,
    flex: "none",
    borderRadius: 4,
    boxSizing: "border-box",
  };
  if (!checked) {
    return { ...box, border: "2px solid var(--color-border-strong)", background: "transparent" };
  }
  if (!isKnownFaction(slug)) {
    // The spectrum fills the whole box, so the border is only there to keep the
    // checked and unchecked states the same size.
    return { ...box, border: "2px solid transparent", ...factionFill(slug, "bar") };
  }
  const tint = factionCssVar(slug);
  return { ...box, border: `2px solid ${tint}`, background: tint };
}

/** The submit pill — the chips' selected treatment at CTA size. */
export function submitButtonStyle(slug: string | null | undefined): CSSProperties {
  const tint = factionCssVar(slug);
  return {
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-md)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderRadius: 999,
    padding: "var(--space-sm) var(--space-xl)",
    minHeight: 40,
    boxSizing: "border-box",
    color: "var(--color-text-primary)",
    ...(isKnownFaction(slug)
      ? {
          border: `2px solid ${tint}`,
          background: `color-mix(in srgb, ${tint} 18%, var(--color-bg-surface))`,
        }
      : factionFill(slug, "frame")),
  };
}
