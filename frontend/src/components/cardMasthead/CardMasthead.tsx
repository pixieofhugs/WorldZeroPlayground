import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import FactionSigil from "../sigil/FactionSigil";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";

/**
 * The one masthead anatomy the CARD KITS share (#2029, task cards v3):
 * **the faction's mark hard left, the faction's title centred on the band.**
 *
 * TWO KITS MOUNT IT NOW, which is why it lives here rather than under
 * `taskCard/` (#2185): the owner ruled that a praxis card wears the same band
 * its task card does, so the praxis kit stopped being a stranger to this file
 * and the file stopped belonging to one kit. The PAINT is not repeated across
 * the two — `factionBands` beside this module holds one painted band per
 * faction and both kits mount that, so "the same band" is an identity rather
 * than a promise two directories make to each other.
 *
 * Seven of the nine cards carry one. `na` and `albescent` mount none — that is
 * deliberate (ADR-0048: the Albescent card IS the unaffiliated sheet plus a
 * drift, and a band naming the society would un-hide it), not an omission. On a
 * praxis card that reasoning binds harder, not softer: the card is PUBLIC, so a
 * band naming Albescent would reveal the society on a stranger's feed.
 *
 * THE BAND IS A LINK TO THE FACTION (#2167). A card has three regions and three
 * destinations: the body reads the task, the CTA signs up, and the band — which
 * says nothing but the faction's name — reads the faction. It is derived here
 * from the `slug` every mount already passes rather than wired seven times, so
 * one change lands on seven surfaces and no skin can drift.
 *
 * It is valid HTML because the band is a SIBLING of the links inside the card,
 * never inside one — the task card's card-wide task link, the praxis card's
 * task line and byline. `taskCard/__tests__/mastheadFactionLink.test.tsx` and
 * `praxisCard/__tests__/praxisMasthead.test.tsx` hold that on both kits, and it
 * is the one thing that would make an anchor here illegal. It is also why a
 * frame that pads itself has to move that padding to an inner box before it
 * mounts a band: the band is full-bleed, and the two praxis frames that wrapped
 * their whole body in padding got an inner box rather than an inset band.
 *
 * The two bandless cards get no such link and must not grow one:
 * `/factions/albescent` is an in-world dead end, not a faction page.
 *
 * WHY A COMPONENT AND NOT A CONVENTION. The epic's sequencing ruling exists
 * because seven agents each inventing this shape yields seven slightly
 * different mastheads — every branch green, `main` red. The precedent is the
 * composer's `ComposerMasthead`: a shared wrapper each archetype PAINTS,
 * carrying none of the paint itself. So everything faction here arrives as
 * `style` (the band's ground, its rule, its ink) or as `children` (the
 * wordmark, in the faction's own hand and at its own size). What the wrapper
 * owns is only the anatomy: the inset, the mark's box, and the centring.
 *
 * THE TITLE IS CENTRED ON THE BAND, not on the space left over beside the
 * mark. That is a three-column grid with equal `1fr` gutters rather than a flex
 * row, and the difference is the whole point: a flex row centres the title in
 * the remainder, so every card whose left cluster is a different width centres
 * it somewhere else. With `1fr auto 1fr` the two gutters are equal by
 * construction, so the title sits on the card's own centreline whatever stands
 * beside the mark — Singularity's window lamps included. (The vendored design
 * reached the same place by absolutely positioning the title and measuring the
 * band back, which is what a DOM-mutating spec sheet has to do; a real
 * component knows its own layout.)
 *
 * THE BAND IS THE ANATOMY'S, so ornament that used to fill it stands down —
 * S.N.I.D.E.'s broken acid rule and Everymen's pair of cogs both occupied the
 * space the centred title now takes. Ornament that sits BESIDE the mark without
 * reaching the centre survives, which is why Singularity keeps its lamps. Where
 * a band carries a backdrop — Coven's twinkle field is the only one left, since
 * #2067 took the Ephemerists' glyph registers off the card tier — the BAND
 * wraps this component in its own positioned box and paints there. That wrapper
 * lives with the band in `factionBands`, so both kits inherit it; no ornament
 * slot is needed here, and none is offered.
 *
 * NO CARD RENDERS TWO FACTION MARKS IN ITS HEADER. The mark below is the kit's
 * `FactionSigil`, so a card that drew its own header mark hands it over rather
 * than gaining a second: UA's eyebrow ensō and Coven's pentagram badge were
 * both stood down when their bands were built.
 */

/**
 * The mark's SLOT, on every card — the box the three-cell grid measures its
 * centring against. Geometry, so a raw number (WORLD_ZERO_STYLE §4a), and a
 * SHARED one, which is the point: the kit has exactly one place to say how much
 * room a faction mark gets.
 *
 * It is also the default DRAWN size, which for eight of the nine skins is the
 * whole story. See `markSize` for the one that draws bigger.
 */
const MARK = 20;

interface CardMastheadProps {
  /** Whose band this is. Real components know their own faction (#2027). */
  slug: string;
  /**
   * The mark's ink, when the sigil's own default would land on a ground it
   * cannot be seen against — Everymen's red mark on the red bill mast, WOW's
   * plum mark on the plum banner. A token, always.
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
  /**
   * Chrome that rides with the mark in the left cluster. One caller: the
   * Singularity terminal's three window lamps, which are the window and not a
   * faction mark.
   */
  leading?: ReactNode;
  /** The band's own paint — ground, rule, ink, height. All of it the skin's. */
  style?: CSSProperties;
  /**
   * Draw the band as ORNAMENT: no link, no hover, `aria-hidden`, same paint.
   *
   * THE BAND IS A LINK ON A CARD BECAUSE A CARD IS A PLACE YOU LEAVE FROM
   * (#2167) — three regions, three destinations. A COMPOSER is the opposite: it
   * is a `<form>` holding a draft, and an anchor inside it is a way to lose that
   * draft. Mounted live it would be the first focusable thing on the sheet, one
   * Tab from the top, and a click on the wordmark would navigate to
   * `/factions/<slug>` and discard whatever had been typed, with no confirm.
   *
   * So the composer mounts this arm instead, and it matches what every other
   * composer masthead already is: `ComposerMasthead` is `aria-hidden` and inert
   * by construction, and a faction's ornament may not announce itself ahead of
   * the page's first real content. The paint, the anatomy and the centring are
   * identical — only the anchor and its two hover handlers stand down.
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
  /* The anatomy, drawn once for both arms: the mark's fixed slot, the centred
     wordmark, the empty right gutter that keeps the centre column on the band's
     own centreline. Only the ELEMENT around it changes. */
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
        {/* Decorative: the band says the faction's name in words right beside
            it, so a screen reader that also announced the mark would say it
            twice. */}
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
      {/* The right gutter. Empty by design — it is what makes the centre column
          land on the band's centreline rather than beside the mark. */}
      <span aria-hidden="true" />
    </>
  );

  /* The band's geometry and the skin's paint, shared by both arms so the inert
     one cannot drift from the linked one. `color: inherit` and the flex pin are
     the linked arm's own notes, one block down. */
  const band: CSSProperties = {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "var(--space-sm)",
    /* Ahead of the skin's own `style`, so a band that sets its ink still wins
       and one that does not inherits the card's — either way, never the user
       agent's link blue over a hand-set wordmark. */
    color: "inherit",
    textDecoration: "none",
    /* THE BAND DOES NOT TAKE THE ROW'S SLACK. `.task-card-row` hands a card's
       spare height down a chain that ends at the one anchor marked
       `data-card-link` (index.css, the equal-height row), and this band is not
       it. That was not always the selector: the chain used to end at `a[href]`,
       so the moment this element became an anchor (#2167) it joined the chain
       and stretched beside the body link, splitting the slack between them —
       this pin was the correction. #2380 moved the chain onto the hook, so the
       pin now restates the initial value instead. It stays as the belt: a band
       is as tall as its own content whatever a later rule decides, and only
       `flex-grow` is pinned, so shrink and basis keep the values the band had as
       a plain block. `frontend/src/pages/tasks/__tests__/equalHeightRow.test.tsx`
       holds the chain to a single anchor. */
    flexGrow: 0,
    ...style,
  };

  if (inert) {
    return (
      /* No anchor, no hover handlers, `aria-hidden`: see the `inert` prop. The
         padding is spelled here rather than in `band` for the one reason the
         linked arm's is spelled at its own call — a skin's `style` must be able
         to override it, and `band` is spread into both. */
      <div
        aria-hidden="true"
        data-card-masthead={slug}
        style={{ padding: "var(--space-sm) var(--space-lg)", ...band }}
      >
        {anatomy}
      </div>
    );
  }

  return (
    <Link
      to={`/factions/${slug}`}
      /* The band's text IS the faction's name, so unlabelled this announces as
         "Cozy Coven, link" — the name without the destination. The label keeps
         the name and says where it goes; it names the faction, never the
         furniture. */
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
      style={{ padding: "var(--space-sm) var(--space-lg)", ...band }}
    >
      {anatomy}
    </Link>
  );
}
