import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { UaBand } from "../cardMasthead/factionBands";
import { CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { Lotus } from "../factionMarks";
import UaMandala from "../factionMarks/UaMandala";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, UaEnsoScore } from "../factionMarks/uaAtoms";

/**
 * UA — THE VELLUM LEAF (task card v2, #1023).
 *
 * A leaf of sun-bleached vellum bound in sienna, with a lotus hanging off the
 * top-left corner as a ground wash and the task's marks held in an ensō at the
 * centre of the hero. Cormorant Garamond carries the title and the numerals; EB
 * Garamond carries everything read.
 *
 * This replaces "The Ink Column" (ADR-0055 / ADR-0056). The hairline down the
 * left margin is gone; the gilt-sandwich salon it replaced is still gone.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * TWO MARKS, AND THE COUNT IS THE POINT (WORLD_ZERO_STYLE §6). The design draws
 * the ensō three times — in the eyebrow, behind the score, and again on the
 * sign-up button. The third is the mark spent as decoration, so it is dropped:
 * the ensō is reserved for the SCORE and the FACTION MARK, and a seal on a
 * button is neither. The eyebrow mark stood beside the uniform "Task {id}"
 * ordinal until #1124 retired the id, and kept its line alone until #2029 gave
 * the card a masthead — the faction mark now sits in the band, which is the
 * same one mark in a better place, and the count is still two.
 *
 * THE LOTUS COMES BACK, and that reverses a line in this file's old docstring.
 * #851 read the kit's corner-bleed as something "the brief's strength ruling
 * supersedes" — but that ruling is `UaMandala`'s, and the mandala is a different
 * mark: radial concentric geometry, `absent` on dense text surfaces. The lotus
 * has its own precedent on exactly this kind of surface (`UaPraxisCard` floats
 * one off its left edge at the same opacity token).
 *
 * AND THE MANDALA COMES BACK TOO (#2031), which reverses the line that used to
 * close that paragraph. `absent` is the strength for "dense and text-heavy
 * surfaces: feed rows, comments, task lists, the editor" — copy the pattern
 * would sit under and make harder to read. The two mandalas below sit in the
 * SIGN-UP region, beneath the rule that closes the reading column off (#2030),
 * where there is no prose at all: they flank the button rather than lie behind
 * anything. So the strength ruling is not overruled here, it simply does not
 * reach past the rule. Inside the reading column the mandala is still absent.
 *
 * Both marks are inline/masked components tinted from tokens, so the design's
 * four `filter:` recolour hacks (`brightness(0) invert(1)`, `saturate(1.35)` and
 * friends) have no translation and are simply gone — that is what ADR-0049's
 * "tintable from a token" buys.
 *
 * Every colour is an already-shipped `--faction-ua-*` token; this card added
 * none. One ink is walked down — see the score note below.
 */

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  pad: string;
  levelSize: string;
  /** Diameter of the score's ensō, and of the lotus wash. Geometry. */
  enso: number;
  lotus: number;
  /** Diameter of each mandala flanking the sign-up. Geometry. */
  flank: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    pad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    levelSize: "var(--text-display)",
    enso: 124,
    lotus: 360,
    flank: 46,
  },
  mobile: {
    cardWidth: 340,
    pad: "var(--space-lg)",
    levelSize: "var(--text-heading)",
    enso: 108,
    lotus: 300,
    flank: 38,
  },
};

/**
 * One of the two mandalas standing either side of the sign-up (#2031).
 *
 * IN FLOW, NEVER POSITIONED, and that is the whole safety argument. The design
 * hangs its single mandala off `position:absolute; right:6px`, which is what a
 * DOM-mutating spec sheet has to do — it cannot re-layout a row it did not
 * write. An absolute flank takes no width, so it rides over the button the
 * moment the card is narrower than the sheet drew it, which is the failure
 * `docs/agents/design-fidelity.md` names by example (44px hit boxes on a plate
 * drawn for smaller marks). Three flex siblings cannot overlap at any width:
 * past the point where they stop fitting they overflow, and the article's
 * `overflow: hidden` trims the ornament rather than the control.
 *
 * The figure takes `UaMandala`'s own default ink — `--faction-ua-glow`, the
 * ornament-only hue the ensō and the lotus already use — not the design's
 * `currentColor`, which on this row resolves to the leaf's BODY INK. The
 * primitive's contract says it in as many words: "never pass an ink token".
 * One hue for all three of the card's drawn marks is also simply the read.
 */
function UaCtaFlank({ side, size }: { side: "start" | "end"; size: number }) {
  return (
    <span
      data-ua-flank={side}
      aria-hidden="true"
      // Ornament only: the button is the one thing in this row a finger may hit.
      style={{ flex: "0 0 auto", lineHeight: 0, pointerEvents: "none" }}
    >
      {/* The boundary ring is off (`trimMarks()`): closed into a disc, the
          figure reads as a second boxed seal beside a boxed button. Trimmed, it
          is a rosette, and the button keeps the only edge in the row.

          `pulse` IS THE FLANK'S OWN MOTION (#2072) — the petals pop and the hue
          cycles, band by band on a stagger, from the reduced-motion-gated
          classes in `src/motion.ornament.css`. This is the only mount of the
          primitive that asks for it, and the only motion this rosette has: it
          does not spin (`spin` defaults to false and the vote control is where
          the slow bands turn). Stilled — reduced motion, or the deferred sheet
          not yet arrived — it is the fully drawn glow-coloured rosette below. */}
      <UaMandala size={size} strength="full" rings={3} petalsPerRing={8} boundary={false} pulse />
    </span>
  );
}

export default function UaTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
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
          background: "var(--faction-ua-card-parchment)",
          border: "2px solid var(--faction-ua-card-frame)",
          // The salon sheet's shape, said once (#2361/#2403).
          borderRadius: "var(--faction-ua-card-radius)",
          color: "var(--faction-ua-card-text)",
          fontFamily: UA_TEXT,
        }}
      >
        {/* The ground wash — the lotus hangs off the top-left corner with its
            centre pulled onto the leaf. Raw geometry on purpose: an ornament's
            position is illustration, not layout spacing (§4a). Its opacity is a
            token, so dark mode lifts it through the cascade rather than through
            the design's `saturate(1.35) brightness(1.2)`. */}
        <Lotus
          size={size.lotus}
          color="var(--faction-ua-card-lotus)"
          style={{
            position: "absolute",
            left: -150,
            top: -104,
            opacity: "var(--faction-ua-card-lotus-opacity)",
            pointerEvents: "none",
          }}
        />

        {/* THE LEAF GAINS A MASTHEAD (#2029). UA shipped none: the top of the
            card was a bare eyebrow holding the ensō alone, once #1124 took the
            "Task {id}" ordinal that stood beside it. The eyebrow stood down with
            it, because the ensō it held is the same mark the band carries and no
            card draws two. Mounted from the shared band (#2185) so the UA praxis
            card wears the identical one; the paint and the ink measurement live
            at `cardMasthead/factionBands`. */}
        <UaBand />

        <div style={{ position: "relative", padding: size.pad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span style={{ ...UA_EYEBROW, fontSize: "var(--text-md)", marginBottom: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                {/* A RUNG UP THE SCALE, TO WEIGH THE SAME (#2031). This numeral
                    sat at --text-heading while Snide, Everymen and the
                    Ephemerists set theirs at --text-display, and it read
                    smaller than all three — Cormorant Garamond is a small-faced
                    old-style cut, so 32px of it carries visibly less ink than
                    32px of Impact or of a poster gothic. Matching the WEIGHT
                    means not matching the number: the tier moves up one on both
                    form factors so the gate reads at the kit's strength. */}
                <span style={{ fontFamily: UA_DISPLAY, fontWeight: 700, fontSize: size.levelSize, lineHeight: 0.9 }}>
                  {task.level_required}
                </span>
              </div>

              <span aria-hidden="true" style={{ flex: 1, height: 1, background: "var(--faction-ua-hair)" }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: UA_DISPLAY,
                      fontWeight: 700,
                      fontSize: "var(--text-xl)",
                      lineHeight: 1,
                      color: "var(--faction-ua-card-chip-ink)",
                      background: "var(--faction-ua-card-chip-bg)",
                      borderRadius: 4,
                      padding: "var(--space-xs) var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ ...UA_EYEBROW, fontSize: "var(--text-md)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* The score, in the ensō — the mark's one sanctioned use besides
                  the faction mark above. The numeral takes `card-accent` rather
                  than the design's brighter `--faction-ua-glow`, which measures
                  2.93:1 on the parchment's darkest stop and so misses even the
                  large-text floor; the accent is 4.88:1 there and clears the
                  normal one.

                  THE RING GREW FOR THE WORD (#2031). The caption used to be the
                  four-letter `pts`-class unit this skin shipped; #2028 made it
                  the kit's one word, and "POINTS" set at --text-md with the
                  eyebrow's 0.22em tracking is ~51px of ink — wider than the
                  ~48px the 96px ring left clear across its middle, and it sits
                  BELOW the middle where the chord is shorter still. So the
                  container yields, which is §4's own rule: type wins, geometry
                  moves. 96 -> 124 is the design's measured number
                  (`growUaScoreRing()`); the mobile ring takes the same ratio.
                  The numeral does not grow with it — `valueSize` is a ceiling
                  and it is still --text-heading. */}
              <UaEnsoScore
                size={size.enso}
                value={basePoints}
                unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                valueColor="var(--faction-ua-card-accent)"
              />
            </div>

            <h2
              className="content-title"
              style={{
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: "-0.01em",
                margin: "0 0 var(--space-sm)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{
                  fontFamily: UA_TEXT,
                  lineHeight: 1.5,
                  color: "var(--faction-ua-card-muted)",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--faction-ua-glow)", display: "block", flex: "0 0 auto" }}
                />
                <span
                  style={{
                    fontFamily: UA_TEXT,
                    fontStyle: "italic",
                    fontSize: "var(--text-xl)",
                    color: "var(--faction-ua-card-muted)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {cta && (
            <>
              {/* The leaf's faintest rule, closing the reading column off from
                  the sign-up (#2030) — the same `-hair` the hero already draws
                  between the level and the ensō, so the card rules its two
                  divisions with one line and not two. */}
              <div
                aria-hidden="true"
                data-cta-rule="ua"
                style={{
                  height: 1,
                  background: "var(--faction-ua-hair)",
                  margin: "var(--space-lg) 0",
                }}
              />
              {/* THE MANDALAS FLANK THE SIGN-UP (#2031). One row, three
                  in-flow items, the control in the middle — see UaCtaFlank. */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-md)" }}>
              <UaCtaFlank side="start" size={size.flank} />
              <CardCtaControl
                cta={cta}
                style={{
                  ...CARD_CTA,
                  cursor: cta.denied ? "not-allowed" : "pointer",
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-content)",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  padding: "var(--space-sm) var(--space-xl)",
                  borderRadius: 5,
                  color: "var(--faction-ua-card-chip-ink)",
                  background: "var(--faction-ua-card-chip-bg)",
                  border: "1.5px solid var(--faction-ua-card-frame)",
                }}
              >
                {cta.label}
              </CardCtaControl>
              <UaCtaFlank side="end" size={size.flank} />
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
