import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import { SingularityBand } from "../cardMasthead/factionBands";
import { CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import SingularityProcessLight from "../factionMarks/SingularityProcessLight";
import SingularityReadout from "../factionMarks/SingularityReadout";

/**
 * Singularity — THE TERMINAL SESSION (task card v2, #1023).
 *
 * A windowed terminal: a chrome bar carrying three LEDs and the process name; a
 * LEVEL + POINTS readout with the total in a lit blue well; a standing raster
 * over the whole chassis and a slow scan sweep travelling down it. Share Tech
 * Mono throughout — the faction has one face and this card uses it for
 * everything, chrome and copy alike.
 *
 * The chrome bar's right-hand slug and the boot line beneath it both read the
 * task's id ("Task {id}", and in the design a hex twin of it). #1124 retired the
 * id from every card, and neither element carried anything else — the boot line
 * was a `> query` with only the ordinal to query — so both are gone and the bar
 * is LEDs plus process name.
 *
 * This replaces the sprocket-holed "Terminal Printout" wholesale (ADR-0055 /
 * ADR-0056 — a metaphor swap, not a tweak): the perforated fanfold paper is
 * gone, and what remains is the screen it was printed from.
 *
 * ALWAYS DARK, IN BOTH THEMES (WORLD_ZERO_STYLE §6). This is the one card in the
 * wave whose light variant is still a black chassis; the design's own header
 * says "theme tunes phosphor contrast, not the black chassis". It is NOT a
 * theme-invariant surface either — `--faction-singularity-term-*` is a real
 * two-theme contract, and what the cascade flips is the phosphor. There is no
 * ternary here; both halves live in index.css.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * Motion is entirely index.css's (#911 retired component-injected `<style>`):
 * the design names `sgBlink`/`sgSweep`/`sgPulse` and defines none of them, and
 * all three already exist here under the repo's names — `.sg-cursor`, `.sg-scan`
 * and `.sg-pulse` — each behind the shared `prefers-reduced-motion` guard. No
 * new keyframe was needed.
 */

const MONO = "var(--faction-singularity-card-font)"; /* Share Tech Mono */

/**
 * The face that idles beside the sign-up key (#2036) — three lines of
 * characters, which is why this ornament costs the bundle almost nothing.
 *
 * Text, and therefore ornament for assistive tech: the element that carries it
 * is `aria-hidden` and is not inside the button.
 */
const BOT = "[^-^]\n /|_|\\\n  d b";

const BG = "var(--faction-singularity-term-bg)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
/* `--faction-singularity-term-blue` stood here — the unit stencilled beside the
   points figure. It moved into {@link SingularityReadout} with the rest of the
   well (#2042), because a shared mark that took its inks from whichever surface
   mounted it would be two marks wearing one name. */
const HAIR = "var(--faction-singularity-term-hair)";

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "var(--space-lg) var(--space-lg) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    cardWidth: 340,
    bodyPad: "var(--space-lg) var(--space-md) var(--space-lg)",
    titleSize: "var(--text-content)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
  },
};

/** Terminal caption voice — every label on the chassis speaks in it. */
const LABEL: CSSProperties = {
  fontFamily: MONO,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
};

/** A dashed terminal rule. */
function Rule({ style }: { style?: CSSProperties }) {
  return <div aria-hidden="true" style={{ height: 0, borderTop: `1px dashed ${HAIR}`, ...style }} />;
}

export default function SingularityTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  // THE ORNAMENT ALTERNATES (#2195): on a patterned page ground the standing
  // raster comes off and the chassis is BARE — never a substitute texture.
  const groundIsBusy = useGroundIsBusy();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: BG,
          border: "1px solid var(--faction-singularity-term-border)",
          borderRadius: 8,
          boxShadow: "var(--faction-singularity-term-shadow)",
          color: "var(--faction-singularity-term-ink)",
          fontFamily: MONO,
        }}
      >
        {/* The standing raster — a fixed scrim, no motion, and the kit's ONE
            ornament (#2394): the praxis card now draws this same line. Gone,
            not softened, when the page ground is already a pattern. */}
        {!groundIsBusy && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 3,
              background:
                "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
            }}
          />
        )}

        {/* The scan sweep. `.sg-scan` owns both the resting offset and the
            reduced-motion-guarded travel (#842's keyframe, reused). */}
        <div
          aria-hidden="true"
          className="sg-scan"
          style={{
            position: "absolute",
            left: "-30%",
            right: "-30%",
            height: 34,
            pointerEvents: "none",
            zIndex: 3,
            background: "var(--faction-singularity-term-sweep)",
          }}
        />

        {/* Window chrome, mounted from the shared band (#2185) so the
            Singularity praxis card wears the identical one — the three lamps
            included, since they ride with the mark rather than standing down.
            The paint lives at `cardMasthead/factionBands`. */}
        <SingularityBand />

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span style={{ ...LABEL, fontSize: "var(--text-md)", marginBottom: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: MONO, fontSize: size.levelSize, lineHeight: 0.85, color: BRIGHT }}>
                  {String(task.level_required).padStart(2, "0")}
                </span>
              </div>

              <Rule style={{ flex: 1, marginBottom: "var(--space-md)" }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "var(--text-lg)",
                      lineHeight: 1,
                      color: "var(--faction-singularity-term-cta-ink)",
                      background: BRIGHT,
                      borderRadius: 4,
                      padding: "var(--space-xs) var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ ...LABEL, fontSize: "var(--text-md)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* The points, in the lit well — the faction's points mark, and
                  since #2042 a shared one: the praxis-card score stamp mounts
                  the same drawing for its total instead of the bare glowing
                  numeral it drew before. The well is drawn ONCE, in
                  {@link SingularityReadout}; nothing about the mark is this
                  card's any more except the tier it asks for. */}
              <SingularityReadout
                value={basePoints}
                unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                valueSize={size.pointsSize}
                style={{ flex: "0 0 auto" }}
              />
            </div>

            <h2
              style={{
                fontFamily: MONO,
                fontWeight: 400,
                fontSize: size.titleSize,
                lineHeight: 1.22,
                color: BRIGHT,
                margin: "0 0 var(--space-sm)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{ fontFamily: MONO, lineHeight: 1.55, color: DIM, margin: "0 0 var(--space-md)" }}
              >
                {task.description}
              </p>
            )}

            <Rule style={{ margin: "0 0 var(--space-md)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                {/* The process light — the kit's mark since #2092, the same
                    drawing the composer's window bar and the task detail's
                    header wear. */}
                <SingularityProcessLight />
                <span style={{ fontFamily: MONO, fontSize: "var(--text-xl)", color: DIM }}>
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {cta && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "var(--space-sm)",
                marginTop: "var(--space-lg)",
              }}
            >
              <CardCtaControl
                cta={cta}
                style={{
                  ...CARD_CTA,
                  gridColumn: 2,
                  cursor: cta.denied ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: MONO,
                  fontSize: "var(--text-xl)",
                  letterSpacing: "0.02em",
                  padding: "var(--space-sm) var(--space-xl)",
                  borderRadius: 5,
                  color: "var(--faction-singularity-term-cta-ink)",
                  background: "var(--faction-singularity-term-cta-bg)",
                  border: `1.5px solid ${BRIGHT}`,
                }}
              >
                {cta.label}
                {/* The block cursor trailing the prompt. `.sg-cursor` carries the
                    reduced-motion-guarded blink; stilled it stays drawn, because
                    it is punctuation on the prompt, not an indicator. */}
                <span
                  aria-hidden="true"
                  className="sg-cursor"
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 13,
                    marginLeft: "var(--space-xs)",
                    background: "currentColor",
                    verticalAlign: "-0.12em",
                  }}
                />
              </CardCtaControl>

              {/* The little robot idling in the right gutter (#2036). It is
                  ornament: `aria-hidden`, and OUTSIDE the button, so it never
                  joins the control's accessible name (epic #2027, ruling 4).
                  Its drift is `.sg-ascii`'s own `sg-float` keyframe, which #2071
                  moved into the deferred ornament sheet `src/motion.ornament.css`
                  (index.css keeps only the resting `opacity: 0.45` — paint, not
                  motion). Behind the reduced-motion gate either way, and a
                  viewer who never receives that sheet lands exactly where a
                  reduced-motion viewer does: parked, drawn.

                  WHY A GRID COLUMN AND NOT `position:absolute`. The design
                  parks it at `right:18px` over a centred flex row, which is
                  what a spec sheet mutating someone else's DOM has to do. Here
                  the two are siblings in two columns of one grid, so they
                  cannot overlap at any card width and the 44px tap target stays
                  whole — the same reasoning `CardMasthead` uses for its equal
                  `1fr` gutters, and the button sits on the card's centreline
                  for the same reason. `minWidth: 0` lets the gutter collapse
                  under the longest denial label ("Applied to praxis, not
                  claimed"): the ornament clips, the control never does. */}
              <pre
                aria-hidden="true"
                className="sg-ascii"
                style={{
                  gridColumn: 3,
                  justifySelf: "center",
                  minWidth: 0,
                  overflow: "hidden",
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: "var(--text-lg)",
                  lineHeight: 1.2,
                  color: DIM,
                }}
              >
                {BOT}
              </pre>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
