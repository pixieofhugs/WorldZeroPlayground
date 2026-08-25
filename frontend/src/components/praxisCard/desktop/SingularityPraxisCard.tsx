import type { CSSProperties } from "react";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { SingularityBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import { factionRoleVars } from "../../../utils/factionRoles";

/**
 * Singularity — THE SYSTEM SLAB (#842). A booted terminal: near-black glass on
 * a standing raster, a green hairline frame, four cyan corner brackets, a
 * window-chrome header of three LEDs and a right-aligned log line, and a cyan
 * SCANLINE that sweeps the slab every five seconds.
 *
 * Two inventions came off, both of which said "punch card" where the design
 * says "screen":
 *
 *  • the SPROCKET-HOLE strips top and bottom — five perforations each, with no
 *    counterpart in the prototype;
 *  • the blinking BLOCK CURSOR in the header. The design has exactly one
 *    cursor and it trails the computed total in the score stamp, where it is
 *    the machine holding the line open on a number. A second one in the running
 *    head made the card read as an input field.
 *
 * The corner brackets were also wrong in kind, not merely in size: 10px, at a
 * 3px inset, drawn in the card's own text colour, so they read as a border's
 * mitred corner. The design's are 12px CYAN at 6px — a viewfinder laid over the
 * screen, in the brand blue rather than the phosphor green.
 *
 * Body ink is pale mint (`--faction-singularity-terminal-ink`), not the bright
 * phosphor accent: the accent is a chrome colour and burns as running text.
 *
 * Both motions are class-gated on reduced-motion in `index.css` — the sweep
 * parks off-slab, the cursor stops blinking but stays drawn.
 *
 * ## THE HEADER IS THE KIT'S BAND NOW (#2185)
 *
 * #1909's reasoning is SUPERSEDED by owner ruling: the praxis masthead was
 * removed on the judgement that a card answering a task does not need a band,
 * and the owner has since decided it does. Nothing about #1909 was wrong at the
 * time — the decision changed. So the hand-rolled LED bar this file drew is
 * gone and `SingularityTaskCard`'s own window chrome stands in its place,
 * mounted from `cardMasthead/factionBands`. The lamps did not stand down:
 * they are the window, not a faction mark, and they ride beside the sigil.
 */

/** The viewfinder brackets — ornament geometry, raw px by §4a. */
const bracketRule = "2px solid var(--faction-singularity-bracket)";
const bracketBase: CSSProperties = {
  position: "absolute",
  width: 12,
  height: 12,
  pointerEvents: "none",
  zIndex: 2,
};
const bracketTopLeft: CSSProperties = {
  ...bracketBase,
  top: 6,
  left: 6,
  borderTop: bracketRule,
  borderLeft: bracketRule,
};
const bracketTopRight: CSSProperties = {
  ...bracketBase,
  top: 6,
  right: 6,
  borderTop: bracketRule,
  borderRight: bracketRule,
};
const bracketBottomLeft: CSSProperties = {
  ...bracketBase,
  bottom: 6,
  left: 6,
  borderBottom: bracketRule,
  borderLeft: bracketRule,
};
const bracketBottomRight: CSSProperties = {
  ...bracketBase,
  bottom: 6,
  right: 6,
  borderBottom: bracketRule,
  borderRight: bracketRule,
};

/** The sweeping scanline. Its `top` and the animation live on `.sg-scan`. */
const scanSweepStyle: CSSProperties = {
  position: "absolute",
  left: "-30%",
  right: "-30%",
  height: 34,
  background: "linear-gradient(transparent, var(--faction-singularity-scan), transparent)",
  pointerEvents: "none",
  zIndex: 1,
};

export function SingularityPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  // THE ORNAMENT ALTERNATES (#2195): on a patterned page ground the raster
  // comes off and the slab is BARE — never a quieter substitute texture.
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      style={{
        ...frameBase,
        /* THE SLAB DECLARES THE NINE ROLES AND READS FIVE (#2675). The prefix
           belongs to this card and not to the app: `PraxisBody` below is a
           SHARED renderer another faction's card mounts too, so a page-wide
           `--kit-*` name would be exactly the leak the law forbids. Every read
           carries today's token as its fallback, so the computed value is
           byte-identical — this card is one of the four the migration freezes
           and it owes a zero-row diff. */
        ...factionRoleVars("singularity", "praxis-card"),
        borderRadius: 8, // terminal slab
        position: "relative",
        overflow: "hidden",
        background: "var(--praxis-card-paper, var(--faction-singularity-card-bg))",
        border: "1px solid var(--faction-singularity-frame)",
        boxShadow: "0 4px 18px var(--color-cast-shadow)",
        /* THE STANDING RASTER — ornament geometry, raw by §4a, and the ONE
           drawing the kit has (#2394). This card used to run its own second
           pitch (`to bottom, transparent 0 2px`) off a private
           `--faction-singularity-scanline` at 0.03; that token is retired and
           this is the line the task card, the feed frame, the comment voice,
           the select card, the profile body, the edit-praxis panel and both
           detail pages all already draw. Dropped entirely on a busy ground. */
        backgroundImage: groundIsBusy
          ? undefined
          : "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
        /* NO PADDING ON THE FRAME since #2185: the window chrome is full-bleed,
           and an inset frame would have floated it off three edges. The slab's
           inset moved to the body box below. */
        fontFamily: "var(--font-faction-terminal)",
        color: "var(--faction-singularity-terminal-ink)",
      }}
    >
      <span aria-hidden className="sg-scan" style={scanSweepStyle} />
      <span aria-hidden style={bracketTopLeft} />
      <span aria-hidden style={bracketTopRight} />
      <span aria-hidden style={bracketBottomLeft} />
      <span aria-hidden style={bracketBottomRight} />

      {/* THE WINDOW CHROME (#2185) — the same bar `SingularityTaskCard` wears,
          mounted from the shared module.

          IT REPLACES THIS CARD'S OWN LED BAR rather than sitting above it. That
          bar was three lamps on a hairline rule with nothing else on it once
          #1909 cut "singularity protocol" from it, and the shared band IS that
          bar plus the one title that is not generic — the faction's own name,
          with the lamps riding beside the mark as `leading`. Two chrome bars
          stacked would have been two windows on one screen. */}
      <SingularityBand />

      <div style={{ position: "relative", zIndex: 2, padding: "var(--space-lg)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--praxis-card-accent, var(--faction-singularity-card-accent))"
          muted="var(--faction-singularity-phosphor-dim)"
          paper="var(--praxis-card-paper, var(--faction-singularity-card-bg))"
          showCrown={showCrown}
          // A terminal has one face by definition, so Singularity answers both
          // questions with Share Tech Mono — via its own card token, not the
          // raw family (#888).
          fonts={{
            display: "var(--praxis-card-face, var(--faction-singularity-card-font))",
            body: "var(--praxis-card-face, var(--faction-singularity-card-font))",
          }}
          titleStyle={{
            fontFamily: "var(--font-faction-terminal)",
            textTransform: "uppercase",
            lineHeight: 1.1,
            color: "var(--faction-singularity-terminal-ink)",
          }}
        />
      </div>
    </div>
  );
}

export default SingularityPraxisCard;
