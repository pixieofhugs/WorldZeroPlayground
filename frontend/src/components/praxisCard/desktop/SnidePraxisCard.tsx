import { SnideBand } from "../../cardMasthead/factionBands";
import { WALL, WALL_PLAIN } from "../../factionMarks/snideAtoms";
import { useGroundIsBusy } from "../../backdrop/BackdropContext";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";

/**
 * S.N.I.D.E. — the evidence slab (#842) on the flyposted wall (#2177): square
 * corners, acid rule, Archivo Black title skewed -3deg, hard 6px/8px shadow.
 *
 * The wall FLIPS by theme while `-card-*` is pinned near-black (#2066), so this
 * card reads the `-note-*` inks, which flip with it; pairs are measured in
 * `factionContrast.test.ts` (SNIDE_WALL_PAIRS). On a patterned page ground it
 * grounds on {@link WALL_PLAIN} (#2395); faction pages are exempt via
 * `useFactionBackdrop`. On task detail the host sets `--snd-praxis-*` to black
 * (`.snd-detail-praxis` in index.css); this file supplies the wall as fallback.
 * Black reads as redaction on purpose, but every ink still clears AA.
 *
 * Band is `SnideTaskCard`'s (#2185); the `eyebrow` slot stays empty. The dashed
 * acid rule above the vote is the slab's one divider.
 */
/** The wall, or the bare ramp on a patterned page (#2395); the host's
 *  `--snd-praxis-ground` overrides both. */
const ground = (busy: boolean) =>
  `var(--snd-praxis-ground, ${busy ? WALL_PLAIN : WALL})`;
const INK = "var(--snd-praxis-ink, var(--faction-snide-note-ink))";
const MUTED = "var(--snd-praxis-muted, var(--faction-snide-note-muted))";
/** The pink that is TEXT on the wall; acid is an ink only on a slab (#2066). */
const ACCENT = "var(--snd-praxis-accent, var(--faction-snide-note-pink-ink))";
const PAPER = "var(--snd-praxis-paper, var(--faction-snide-note-paper))";

export function SnidePraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  // Only the body texture branches on the ground; chrome never does (#2395).
  const groundIsBusy = useGroundIsBusy();
  return (
    <div
      className="snd-praxis-frame"
      style={{
        ...frameBase,
        /* Own prefix, not `--snd-praxis-*`: that channel is the HOST's (#2676). */
        ...factionBodyVars("snide"), ...factionRoleVars("snide", "snd-pcard"),
        // No borderRadius: the evidence slab has hard corners in the prototype.
        position: "relative",
        background: ground(groundIsBusy),
        border: "1.5px solid var(--faction-snide-acid-deep)",
        boxShadow: "6px 8px 0 var(--faction-snide-slab-shadow)",
        /* No frame padding: the band is full-bleed (#2185). */
        fontFamily: "var(--faction-snide-font-type)",
        color: INK,
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* `SnideTaskCard`'s band; it ignores `--snd-praxis-*`, so it is the same
          strip on the wall and on task detail's black. */}
      <SnideBand />

      <div style={{ padding: "var(--space-xl) var(--space-xl) var(--space-lg)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={ACCENT}
          muted={MUTED}
          paper={PAPER}
          showCrown={showCrown}
          // Marker for identity only (#888); the body stays readable.
          fonts={{
            display: "var(--snd-pcard-face)",
            body: "var(--faction-snide-font-type)",
          }}
          titleStyle={{
            fontFamily: "var(--faction-snide-font-black)",
            // LOAD-BEARING, do not sweep (#2797): one-cut Archivo Black vs
            // `PraxisTitle`'s `font-semibold`; owner ruled 400 here. See
            // LOAD_BEARING in `utils/__tests__/fontsLoaded.test.ts`.
            fontWeight: 400,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1,
            transform: "skewX(-3deg)",
            color: INK,
          }}
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
    </div>
  );
}

export default SnidePraxisCard;
