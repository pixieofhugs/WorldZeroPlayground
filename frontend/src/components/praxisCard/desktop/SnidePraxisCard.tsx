import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * S.N.I.D.E. — THE EVIDENCE SLAB (#842). A photocopier-black plate ruled in
 * deep acid, printed onto the page with a hard 6px/8px drop shadow (no blur: it
 * is stuck down, not floating) over a 3px dot tooth, with the case title struck
 * in Anton and skewed -3deg.
 *
 * Three pieces of chrome came off, all inventions with no counterpart in the
 * vendored prototype and all pulling the slab toward a different archetype:
 *
 *  • the TORN-PAPER top/bottom edges (a 25-point clip-path). The design's slab
 *    is guillotined — square corners, unbroken acid rule. The tearing read as
 *    the Updates feed's aged-paper foe note;
 *  • the TAPE strip (and there is no strip to reconsider: #1708 retired tape
 *    from every SNIDE surface);
 *  • the `Special Elite` MASTHEAD block. The design's running head was a single
 *    Courier eyebrow line in acid, inside the text column, where it stopped at
 *    the score tag instead of running under it — passed to {@link PraxisBody} as
 *    `eyebrow`, the seam #841 opened for the codex. #1909 CUT its string
 *    (`card.masthead.snide`, "evidence locker"), so the slot ships empty.
 *
 * The dashed acid rule above the vote widget is the design's, and is the one
 * divider the slab carries.
 */
export function SnidePraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        // No borderRadius: the evidence slab has hard corners in the prototype.
        position: "relative",
        background: "var(--faction-snide-card-bg)",
        border: "1.5px solid var(--faction-snide-acid-deep)",
        boxShadow: "6px 8px 0 var(--faction-snide-slab-shadow)",
        // The plate's xerox tooth — ornament geometry, raw by §4a.
        backgroundImage: "radial-gradient(var(--faction-snide-slab-tooth) 1px, transparent 1px)",
        backgroundSize: "3px 3px",
        padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
        fontFamily: "var(--faction-snide-font-type)",
        color: "var(--faction-snide-card-text)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint="var(--faction-snide-card-accent)"
        muted="var(--faction-snide-card-muted)"
        paper="var(--faction-snide-card-bg)"
        showCrown={showCrown}
        // The split earning its keep (#888): Permanent Marker is S.N.I.D.E.'s
        // declared card font and it finally reaches the card — but only where
        // identity belongs. A two-line excerpt set in it is unreadable, so the
        // body stays on the slab's Special Elite.
        fonts={{
          display: "var(--faction-snide-card-font)",
          body: "var(--faction-snide-font-type)",
        }}
        titleStyle={{
          fontFamily: "var(--faction-snide-font-impact)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1,
          transform: "skewX(-3deg)",
          color: "var(--faction-snide-card-text)",
        }}
        /* The eyebrow read "evidence locker" (`card.masthead.snide`). #1909 cut
           the slot — once generic it says "Praxis" on a praxis card — so the
           shared eyebrow is left unfilled here. */
        voteRule={
          <div
            aria-hidden
            style={{
              height: 2,
              opacity: 0.7,
              background:
                "repeating-linear-gradient(90deg, var(--faction-snide-acid-deep) 0 6px, transparent 6px 11px)",
              margin: "var(--space-lg) 0 var(--space-md)",
            }}
          />
        }
      />
    </div>
  );
}

export default SnidePraxisCard;
