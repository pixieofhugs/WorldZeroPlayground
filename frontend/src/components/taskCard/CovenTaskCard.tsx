import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { CovenBand } from "../cardMasthead/factionBands";
import { CARD_CTA, CARD_CTA_ROW } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import CovenCauldron from "../factionMarks/CovenCauldron";
import { CovenCat, SLIP_SHEET } from "../factionMarks/covenSlip";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";

/**
 * Cozy Coven — THE CANDLELIT SPELL SLIP (task card v2, #1023).
 *
 * A slip of paper that fades pink → lavender under a gold twinkle field, headed
 * by a pentagram badge and the coven's name hand-lettered in Caveat. A celtic
 * braid, hearts tied off at both ends, rules off each section; the points bubble
 * in a cauldron; a slow-turning cat watches from the corner; and the call to
 * action is a rounded pink box. Grenze Gotisch carries the title, Cormorant
 * Garamond the reading copy, Quicksand the chrome.
 *
 * This REPLACES the lo-fi `coven.exe` window archetype wholesale (ADR-0055 /
 * ADR-0056 — a full metaphor swap, not a tweak). The `--faction-coven-win-*`
 * tokens stay declared: other surfaces still paint with them.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * All colour via `--faction-coven-slip-*`; light/dark flips through the
 * `[data-theme="dark"]` cascade, never a ternary. Three of the design's inks are
 * walked down for AA against the gradient's darkest stop — see index.css.
 */

const CHROME = "var(--font-faction-rounded)"; /* Quicksand */
const READING = "var(--font-faction-serif)"; /* Cormorant Garamond */
const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch */


interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  /**
   * Rendered side of {@link CovenCauldron}. Geometry, and the ONLY dial the
   * mark takes — everything in it, text included, is inside the viewBox.
   *
   * Bigger than the arcane sigil's 100/88 box it replaces, because the design
   * scales its own cauldron to 1.16× the badge and the shared mark draws a
   * little tighter inside its 132-unit square. At 116 the caption sets at
   * ~8.8px, in line with the slip's other captions; below about 100 it drops
   * under 8px and the vessel stops reading as one.
   */
  cauldron: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    /* Top pad is the band's now: the floating wordmark used to carry the gap. */
    bodyPad: "var(--space-md) var(--space-xl) var(--space-lg)",
    titleSize: "var(--text-heading)",
    /* One rung up (#2033): the numeral was set small for Cormorant's eye and
       read two steps behind Everymen's and Snide's. */
    levelSize: "var(--text-display)",
    cauldron: 116,
  },
  mobile: {
    cardWidth: 340,
    bodyPad: "var(--space-md) var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    cauldron: 100,
  },
};

/** Small-caps caption voice — every label on the slip speaks in it. */
const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--faction-coven-slip-label)",
};


/** One heart, tied off at an end of the braid. */
function Heart({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d="M6 10.5 C1 7.3, 1.2 3.4, 3.6 2.6 C5 2.1, 5.8 3, 6 3.6 C6.2 3, 7 2.1, 8.4 2.6 C10.8 3.4, 11 7.3, 6 10.5 Z"
        fill="var(--faction-coven-slip-deep)"
      />
    </svg>
  );
}

/** The braid with a heart at each end. `.cvn-braid` owns the thread's pigments. */
function Thread({ style }: { style?: CSSProperties }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", ...style }}>
      <Heart />
      <span className="cvn-braid" style={{ flex: 1, minWidth: 0 }} />
      <Heart />
    </span>
  );
}


export default function CovenTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  /* THE CAT ALTERNATES (#2396, epic #2195). True on exactly one route today —
     a character profile painted in a PATTERNED faction's ground — and false
     everywhere else, including a Coven profile, whose candlelight is a wash.
     Only the watermark branches: the sheet, band, braid, cauldron and CTA are
     chrome and never move. */
  const groundIsBusy = useGroundIsBusy();
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
          /* The four-stop ramp, from `covenSlip` rather than retyped (#2135):
             the praxis card and both detail columns wear the same sheet now, so
             a fourth copy of the gradient is a fourth thing to re-tune. */
          background: SLIP_SHEET,
          border: "2px solid var(--faction-coven-slip-border)",
          borderRadius: 18,
          boxShadow: "var(--faction-coven-slip-shadow)",
          color: "var(--faction-coven-slip-ink)",
          fontFamily: CHROME,
        }}
      >
        {/* THE WATERMARK IS A CAT NOW (#2041) — same slow turn, new drawing.
            `.cvn-wheel` still owns the motion and its reduced-motion guard
            (#911 — no component-injected <style>); only the artwork moved, and
            it moved into `covenSlip` because four other surfaces turn it too.

            It also SHRINKS AND COMES INSIDE. The pentacle was 420px hung 118px
            off the right edge and 64px below the bottom, which is fine for a
            radially-symmetric abstract mark and fatal for a face: the design's
            own note is that "a face can't bleed off the card the way the
            pentacle did". 190px at -6/-4 is #2041's placement verbatim. The
            only thing that leaves the card is the right whisker's round cap —
            its tip is at x=97 of the 100-unit box, so 5.7px inside a box whose
            edge sits 6px out, leaving ~2px of a 3.6px cap clipped. The face is
            38px clear of the edge.

            Opacity holds at 0.09 rather than taking #2041's 0.15; the reason,
            with the measurements, is at {@link CovenCat}.

            AND IT COMES OFF ON A BUSY GROUND (#2396): "either burst, or plain"
            — where the cat is not worn the slip is BARE, never a substitute
            texture. Nothing takes its place below. */}
        {!groundIsBusy && (
          <CovenCat size={190} style={{ right: -6, bottom: -4, opacity: 0.09 }} />
        )}

        {/* Masthead. THE WORDMARK MOVES (#2029): it floated over the slip
            under a pentagram badge, with a braid tied off beneath it; v3 pins it
            into a band at the top of the card. The badge is retired in favour of
            the kit's own `CovenSigil` (a card may not draw two faction marks in
            its header), and the braid under the wordmark goes with it — a band
            that already names the coven does not need an ornament run repeating
            it. The braid lives on below, ruling off every section.

            Mounted from the shared band (#2185) so the Coven praxis card wears
            the identical one, twinkle field and all — the field is the band's
            backdrop, so it travels with it rather than being rebuilt beside it.
            The paint lives at `cardMasthead/factionBands`. */}
        <CovenBand />

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            {/* The slip's pencilled ordinal ("Task {id}", hand-lettered under the
                masthead) is gone with #1124 — the id no longer shows on any card,
                and it was the whole line. */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)" }}>
                <span style={{ fontFamily: READING, fontWeight: 600, fontSize: size.levelSize, lineHeight: 0.8 }}>
                  {task.level_required}
                </span>
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption set to the numeral beside it, not the label ramp. */}
                <span style={{ ...CAPTION, fontSize: 8.5 }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
              </div>

              <Thread style={{ flex: 1, minWidth: 0 }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: CHROME,
                      fontWeight: 700,
                      fontSize: "var(--text-md)",
                      lineHeight: 1,
                      color: "var(--faction-coven-slip-cta-ink)",
                      background:
                        "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))",
                      border: "1.5px solid var(--faction-coven-slip-cta-to)",
                      borderRadius: 20,
                      padding: "var(--space-xs) var(--space-sm)",
                      boxShadow: "0 3px 8px var(--faction-coven-slip-glow)",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption tucked under the chip. */}
                  <span style={{ ...CAPTION, fontSize: 7.5 }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* THE SCORE MOVES INTO THE CAULDRON (#2033). It sat in a drawn
                  arcane sigil — a halo disc, a pale core, a ringed circle of
                  gold ticks and sparkles, with the numeral floated over the
                  middle. All of it goes: the vessel is #2019's, by owner
                  ruling, because Coven draws the same pot on the praxis card's
                  score stamp and two cauldrons is the outcome that ruling
                  exists to prevent. Everything the sigil painted, the mark
                  paints — including the numeral and its caption, which are
                  typeset INSIDE the viewBox so one `size` scales the lot. */}
              <CovenCauldron
                total={String(basePoints)}
                caption={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                size={size.cauldron}
              />
            </div>

            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: size.titleSize,
                lineHeight: 1.06,
                letterSpacing: "0.005em",
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
                  fontFamily: READING,
                  fontStyle: "italic",
                  lineHeight: 1.45,
                  color: "var(--faction-coven-slip-soft)",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            <Thread style={{ margin: "0 0 var(--space-sm)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <svg width={15} height={15} viewBox="0 0 36 36" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path
                    d="M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z"
                    fill="var(--faction-coven-slip-pk)"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: READING,
                    fontStyle: "italic",
                    fontSize: "var(--text-xl)",
                    color: "var(--faction-coven-slip-soft)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* The pink band ran the slip's full width. #2030 tucked it in with
            clearance under it; #2033 gives it its final shape — A ROUNDED BOX,
            not a pill. At the 20 it inherited from the modifier chip a 44px-tall
            button is within 2px of fully round, so the two controls read as the
            same object at different lengths; 12 keeps a corner soft enough for a
            slip that has no square one on it while letting the CTA be the one
            BOX on the card. The chip keeps its 20 and stays a chip.

            No rule above: the braid under the description is the section's own
            tie-off, and the dotted-with-a-gem rule the design defines for Coven
            is dead code it skips in the same pass. */}
        {cta && (
          <div style={{ ...CARD_CTA_ROW, position: "relative", zIndex: 2 }}>
            <CardCtaControl
              cta={cta}
              style={{
                ...CARD_CTA,
                cursor: cta.denied ? "not-allowed" : "pointer",
                display: "flex",
                gap: "var(--space-sm)",
                background:
                  "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))",
                color: "var(--faction-coven-slip-cta-ink)",
                fontFamily: CHROME,
                fontWeight: 700,
                fontSize: "var(--text-lg)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "var(--space-sm) var(--space-xl)",
                border: "1.5px solid var(--faction-coven-slip-cta-to)",
                borderRadius: 12,
                boxShadow: "0 3px 8px var(--faction-coven-slip-glow)",
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                <path
                  d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
                  fill="currentColor"
                />
              </svg>
              {cta.label}
            </CardCtaControl>
          </div>
        )}
      </article>
    </div>
  );
}
