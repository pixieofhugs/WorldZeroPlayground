import type { CSSProperties } from "react";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import SingularityLamps from "../../factionMarks/SingularityLamps";

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
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 8, // terminal slab
        position: "relative",
        overflow: "hidden",
        background: "var(--faction-singularity-card-bg)",
        border: "1px solid var(--faction-singularity-frame)",
        boxShadow: "0 4px 18px var(--color-cast-shadow)",
        // The standing raster — ornament geometry, raw by §4a.
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 2px, var(--faction-singularity-scanline) 2px 3px)",
        padding: "var(--space-lg)",
        fontFamily: "var(--font-faction-terminal)",
        color: "var(--faction-singularity-terminal-ink)",
      }}
    >
      <span aria-hidden className="sg-scan" style={scanSweepStyle} />
      <span aria-hidden style={bracketTopLeft} />
      <span aria-hidden style={bracketTopRight} />
      <span aria-hidden style={bracketBottomLeft} />
      <span aria-hidden style={bracketBottomRight} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Window chrome: three LEDs, then the log line pushed to the rail. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingBottom: "var(--space-sm)",
            marginBottom: "var(--space-md)",
            borderBottom: "1px solid var(--faction-singularity-rule)",
          }}
        >
          {/* #1979: three spans spreading a local `ledStyle` — 7px dots at a 6px
              pitch, the one surface that drew the cluster without a `Lamp` at
              all. The kit's 8px/`--space-xs` is what the other four already
              drew, and the bar's own `gap` went with the copy: the cluster is
              now this row's only child and carries its own pitch. */}
          <SingularityLamps />
          {/* "singularity protocol" closed this LED bar
              (`card.masthead.singularity`). #1909 cut the slot: once the praxis
              masthead is generic it reads "Praxis" on a praxis card, and this
              one was the faction naming itself. The lamps stay. */}
        </div>

        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-singularity-card-accent)"
          muted="var(--faction-singularity-phosphor-dim)"
          paper="var(--faction-singularity-card-bg)"
          showCrown={showCrown}
          // A terminal has one face by definition, so Singularity answers both
          // questions with Share Tech Mono — via its own card token, not the
          // raw family (#888).
          fonts={{
            display: "var(--faction-singularity-card-font)",
            body: "var(--faction-singularity-card-font)",
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
