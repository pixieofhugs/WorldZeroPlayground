import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import FactionSigil from "../sigil/FactionSigil";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";

/**
 * The masthead anatomy the card kits share (#2029): mark hard left, faction
 * title centred on the band. Carries no paint — skins pass ground/rule/ink as
 * `style` and the wordmark as `children`; `factionBands` holds the painted
 * bands both kits mount (#2185).
 *
 * `na` and `albescent` mount none (ADR-0048: a band naming the society would
 * un-hide it on a public card), and must never link to `/factions/albescent`.
 *
 * The band links to the faction (#2167). Valid only because it is a SIBLING of
 * the card's other links, never inside one — `mastheadFactionLink.test.tsx` and
 * `praxisMasthead.test.tsx` hold that. Frames that pad themselves must pad an
 * inner box: the band is full-bleed.
 *
 * `1fr auto 1fr` grid, not a flex row: equal gutters put the title on the
 * band's centreline whatever sits beside the mark (Singularity's lamps).
 * Backdrops (Coven's twinkle field) are wrapped around this by the band in
 * `factionBands`; no ornament slot here. One mark per header.
 */

/**
 * The mark's slot, which the grid centres against, and the default drawn size.
 * Geometry, so a raw number (WORLD_ZERO_STYLE §4a).
 */
const MARK = 20;

interface CardMastheadProps {
  /** Whose band this is. Real components know their own faction (#2027). */
  slug: string;
  /**
   * The mark's ink where the sigil's default vanishes on the ground (Everymen
   * red on red, WOW plum on plum). A token, always.
   */
  markColor?: string;
  /**
   * How big the mark is DRAWN, when a design grows one past the kit's 20.
   * S.N.I.D.E.'s brushed A at 24 is the only caller (#2035); everyone else omits
   * it and gets {@link MARK}.
   *
   * IT IS THE DRAWING THAT GROWS, NOT THE SLOT. The box below stays `MARK` for
   * every card on purpose: it is what the `1fr auto 1fr` grid measures, so a
   * slot that moved with the mark would take the centred wordmark — and
   * `leading`, Singularity's lamps — off true because one faction's mark got
   * louder. A bigger drawing is centred in the fixed box and bleeds
   * symmetrically into the band's own inset instead, which is what `SnideSigil`
   * sets `overflow: visible` for.
   *
   * ponytail: the ceiling is that inset, so roughly 24–26px. A mark that needs
   * more room than the band's padding has to spare wants the SLOT to grow too —
   * and the moment it does, re-check the gutters: a `1fr` track is floored at
   * its own min-content, so a left cluster wider than half the band's free space
   * wins that floor and the title stops sitting on the card's centreline.
   */
  markSize?: number;
  /** Left-cluster chrome beside the mark: Singularity's window lamps only. */
  leading?: ReactNode;
  /** The band's own paint — ground, rule, ink, height. All of it the skin's. */
  style?: CSSProperties;
  /**
   * Draw the band as ORNAMENT: no link, no hover, `aria-hidden`, same paint.
   * For composers: an anchor inside a draft `<form>` is one Tab from the top
   * and a click would navigate away and discard the draft. Matches
   * `ComposerMasthead`, which is aria-hidden by construction.
   */
  inert?: boolean;
  /** The wordmark, in the faction's hand. */
  children: ReactNode;
}

export default function CardMasthead({
  slug,
  markColor,
  markSize = MARK,
  leading,
  style,
  inert = false,
  children,
}: CardMastheadProps) {
  /* Shared by both arms; only the wrapping element changes. */
  const anatomy = (
    <>
      <span
        style={{
          justifySelf: "start",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
        }}
      >
        {/* Decorative: the name is spelled right beside it. */}
        <span
          aria-hidden="true"
          data-masthead-mark={slug}
          style={{
            flex: "0 0 auto",
            width: MARK,
            height: MARK,
            lineHeight: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FactionSigil slug={slug} size={markSize} color={markColor} />
        </span>
        {leading}
      </span>
      <span style={{ minWidth: 0, textAlign: "center" }}>{children}</span>
      {/* Empty right gutter: keeps the centre column on the centreline. */}
      <span aria-hidden="true" />
    </>
  );

  /* Key order is load-bearing: React serialises styles in insertion order and
     `praxisDetail`'s `markupStability` suite hashes the markup. */
  const band: CSSProperties = {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "var(--space-sm)",
    padding: "var(--space-sm) var(--space-lg)",
    /* Before `...style`: a skin's ink wins, otherwise the card's — never UA link
       blue. */
    color: "inherit",
    textDecoration: "none",
    /* The band never takes the row's slack; the chain ends at
       `data-card-link` (index.css, #2380). Kept as a belt — only `flex-grow` is
       pinned. `pages/tasks/__tests__/equalHeightRow.test.tsx` holds the chain. */
    flexGrow: 0,
    ...style,
  };

  if (inert) {
    return (
      /* See the `inert` prop. Padding stays overridable via the skin's `style`. */
      <div
        aria-hidden="true"
        data-card-masthead={slug}
        style={band}
      >
        {anatomy}
      </div>
    );
  }

  return (
    <Link
      to={`/factions/${slug}`}
      /* Unlabelled this would announce just the name; the label adds the
         destination. */
      aria-label={i18n.t("feed:taskCard.mastheadLink", { faction: factionName(slug) })}
      /* The hover affordance, as an inline handler because the kit's paint is
         inline and `index.css` has no hook for this band (a class would be a
         style decision this component does not own). Underline is the platform's
         own link tell and takes `currentColor`, so it costs no token and reads
         in both themes.

         ponytail: the ceiling is that a pointer is the only thing that lights
         it — `:focus-visible` cannot be expressed inline, so keyboard users get
         the user agent's focus ring instead (nothing in `index.css` suppresses
         it). If the band ever wants a paint of its own on hover or focus, that
         is a `frontend-style` change: one class in `index.css` replaces both
         handlers. */
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = "underline";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = "none";
      }}
      data-card-masthead={slug}
      style={band}
    >
      {anatomy}
    </Link>
  );
}
