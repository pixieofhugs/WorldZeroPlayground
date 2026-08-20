import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { EphemeristsBand } from "../cardMasthead/factionBands";
/* No `CARD_CTA_ROW` here: the plate's rule and its button share one inset box,
   so the clearance comes from that box's own `bodyPad` bottom. */
import { CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import EphemeristsNotationBand from "../factionMarks/EphemeristsNotationBand";
import EphemeristsGloss from "../factionMarks/EphemeristsGloss";
import EphemerisNet from "../factionMarks/EphemerisNet";
import {
  CompassRose,
  Cornice,
  GLYPHS,
  Tally,
  WASH,
  chamferMount,
  chamferSheet,
} from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists — THE VALLEY PLATE (task card v2, #1023). Deco × Egypt: the
 * deco-space card carried into a field journal out of the Valley.
 *
 * A papyrus plate ruled in brass, headed by a short cavetto-topped band that
 * says only whose card this is. The points ride a compass rose — v3 (#2037)
 * struck them on the surveyor's instrument in place of the v2 card's stepped
 * octagon; the level is a numeral over tally strokes; the call to action is an
 * inset cartouche under a double brass rule, bracketed by two shimmering rows of
 * mathematical marks. Poiret One for display, Cinzel for the small caps,
 * Spectral for the reading copy.
 *
 * THE MASTHEAD IS RESTRAINED (#2067). It carried a winged sun disc between two
 * incised twelve-sign registers on a 110px night band, over a tick strip — all
 * of it drawn in the design the card was built from and all of it stripped by the
 * re-pull. The band is the kit's plain `CardMasthead` now, on the medallion's own
 * disc rather than the cornice band, and the glyph motif moved to the CTA as
 * `EphemeristsRuneStrip` — which #2230 in turn retired into
 * `EphemeristsNotationBand`, so the masthead's row and the CTA's are now one
 * drawing at one pitch. The band's fixed height went with the registers: it was
 * only ever the canvas they marched across, so the band is `CardMasthead`'s own
 * height and no size-set field names it.
 *
 * This REPLACES "The Discordant Map" wholesale (ADR-0055 / ADR-0056 — a full
 * metaphor swap). The `--eph-*` illuminated-codex family stays DECLARED but is
 * no longer painted: #1208 swept the last surface off it, so the only readers
 * left are the `--faction-ephemerists-card-*` aliases in `index.css`.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * All colour via `--faction-ephemerists-plate-*`; light/dark flips through the
 * `[data-theme="dark"]` cascade, never a ternary. `-brass` is a rule colour and
 * never an ink — the "Level" caption the design sets in it takes `-caption`,
 * which is the same hue walked down to AA (see index.css).
 */

/**
 * Poiret One, via the shared display token — deliberately NOT
 * `--faction-ephemerists-card-font`, which is Cinzel: that token is the codex's
 * display face and is read by a dozen other Ephemerists surfaces. The v2 design
 * names Poiret One for THIS surface only.
 */
const DECO = "var(--font-faction-deco)";
const CAPS = "var(--font-faction-engraved)"; /* Cinzel */
const READING = "var(--font-faction-spectral)"; /* Spectral */

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  /**
   * The points plate's box. Geometry — and the size that makes the compass rose
   * legible: the needles reach in to 26/74 of a 100-unit viewBox, so the clear
   * field the figure and its unit sit on is 48% of this number. The design
   * grows it to 128 (the octagon it replaces was 104) for exactly that reason;
   * the phone keeps the ratio the two sizes always had.
   */
  medallion: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    medallion: 128,
    bodyPad: "0 var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-display)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    cardWidth: 340,
    medallion: 112,
    bodyPad: "0 var(--space-xl) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-title)",
  },
};

/** Incised small caps — the plate's whole label voice. */
const SMALL_CAPS: CSSProperties = {
  fontFamily: CAPS,
  fontWeight: 500,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
};

/* ── THE SCRIPT ROTATION MOVED OUT (#2148) ──────────────────────────────────
 *
 * `ScriptTurn`, `POINTS_TURNS`, `CTA_TURNS`, `nextTurn` and the `Turning`
 * component stood here (#2038), with the four casts of each label written as
 * two arrays in this file. That is the shape #2148 was filed against: the turn
 * is a KIT MECHANISM, not a task-card detail, and its casts are COPY. Both now
 * live in one place each — `factionMarks/EphemeristsGloss` and
 * `locales/en/glosses.json` — and this card is one consumer of them alongside
 * the score stamp and the faction hero.
 *
 * `eph-turn-scope` below is unchanged and still WCAG 2.2.2's pause mechanism.
 */

/*
 * The glyph library stood here — a 15-key transcription of the kit's own table,
 * identical path for identical path. #1654 collapsed it: `GLYPHS` is imported
 * from `factionMarks/ephemeristsPlate`, which is where the signs are drawn.
 *
 * `REGISTER_TOP`, `REGISTER_BOTTOM` and the `register()` helper stood here too —
 * two named 12-sign orders and the 20px lead-in that marched them across the
 * night band. #2067 struck all three: the re-pulled design's masthead carries no
 * ornament, and the motif is `EphemeristsNotationBand` at the CTA. They were
 * card-local (the page cycles one 16-sign register to fill its width instead), so
 * nothing else lost a register when they went.
 *
 * `Wing` went with them — one wing of the winged sun disc, drawn as deco stepped
 * bars over a 176px `viewBox="-88 -20 176 40"`. It is NOT the kit's
 * `WingedDiscSign`, which is a separate drawing on an 24-unit square that
 * `EmblemOctagon` and the metatask seal still read; this was the wordmark's crown
 * on this card alone, and `ephemeristsDetail.test.tsx` already pinned that the
 * detail page does not draw it. `discWidth` measured nothing else and went too.
 */

/* The stepped `Octagon` and the cavetto `Cornice` stood here — the octagon
   identical to the kit's, the cornice identical but for its FLUTE COUNT. Both
   moved to `factionMarks/ephemeristsPlate` in #1654; the count is now
   `<Cornice flutes={40} />`, which is the task-card design's density on a 384px
   band and always was.

   The octagon is no longer mounted here at all: #2037 replaces the points
   medallion with `CompassRose`, drawn in the same kit module for the same
   reason — the praxis card's score stamp strikes the identical plate, and the
   owner's ruling is that the two marks unify (#2042). The octagon stays kit
   vocabulary; four other Ephemerists surfaces still cut it. */

/* `JournalRule` stood here — this card's own fluted band, bleeding past the text
   column between the description and the in-progress line.

   #1638 converts the kit's fluted rules to RUNE BANDS, and this is the one mount
   that is DROPPED rather than converted: the card already marched two full
   registers of the same signs, so a third row of them mid-leaf would read as the
   band repeating rather than as a divider. The description's own bottom margin is
   the separation the rule was carrying, and `ruleBleed` went with it — it
   measured nothing else.

   #2067 does NOT reopen this. The registers left the masthead, so the argument
   above now points at the two rune strips bracketing the CTA rather than at the
   band — the card still carries the motif twice, and a third row of it between
   the description and the in-progress line would still be the repeat rather than
   the divider. Restoring a rule here is a design decision, not a consequence. */

export default function EphemeristsTaskCard({
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
      {/* `eph-turn-scope` is WCAG 2.2.2's mechanism, not decoration: pointing
          at the card or focusing anything in it pauses both rotations. See
          index.css, where the rule lives. */}
      <article
        className="eph-turn-scope"
        style={{
          position: "relative",
          /* THE NET'S MOUNT (#2144's card weight, landed by #2146). Isolating
             makes the plate its own stacking context, so the net's `z-index: -1`
             paints after the plate's own fill and before every descendant. NOT
             the design's `z-index: 1` lift on the content: lifting static
             children needs `position: relative` on them, which would override
             the absolutely positioned ornament this skin is full of. */
          isolation: "isolate",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--faction-ephemerists-plate-bg)",
          color: "var(--faction-ephemerists-plate-ink)",
          border: "1px solid var(--faction-ephemerists-plate-brass)",
          outline: "1px solid var(--faction-ephemerists-plate-brass-light)",
          outlineOffset: 3,
          boxShadow: "var(--faction-ephemerists-plate-shadow)",
        }}
      >
        {/* THE RESTRAINED MASTHEAD (#2067) — the kit's shared anatomy and
            nothing else, mounted from the shared band (#2185). The wrapper box
            that used to pin a 110px canvas for the glyph registers went with
            #2067, which is what makes the hero row rise ~75px. The paint and the
            disc-vs-band ruling live at `cardMasthead/factionBands`. */}
        {/* 0.10, not the page's 0.17 (#2144's table). On a card the net sits
            behind 12px body text rather than behind a solid fill, and at the
            page's weight its lines cross letterforms. */}
        <EphemerisNet opacity={0.1} />

        <EphemeristsBand />
        <Cornice flutes={40} />

        {/* The journal leaf. */}
        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            {/* #1020's brass cartouche stood here, ruling off the uniform "Task
                {id}" ordinal at both ends. #1124 retired the id from every card
                and the cartouche held nothing else, so both are gone. */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-md) 0 var(--space-lg)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)", lineHeight: 1 }}>
                <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: "var(--faction-ephemerists-plate-caption)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: DECO, fontSize: size.levelSize, lineHeight: 0.8 }}>
                  {task.level_required}
                </span>
                {/* The kit's `Tally` — this was the same strokes written out
                    inline, which is a copy no grep for a component NAME could
                    have found (#1654's table listed four here; this is a
                    fifth). Its `Math.min(9, Math.max(1, Math.round(level)))`
                    clamp came with it. */}
                <Tally level={task.level_required} />
              </div>

              {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between three 1px hairlines. */}
              <div aria-hidden="true" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                {[1, 0.7, 0.4].map((strength, i) => (
                  <span
                    key={strength}
                    style={{
                      height: 1,
                      background: "var(--faction-ephemerists-plate-brass)",
                      opacity: strength * 0.65,
                      marginRight: i * 14,
                    }}
                  />
                ))}
              </div>

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  {/* The chip's rule is its GROUND, not a border (#2150). It
                      typed its own chamfer out by hand and painted a border
                      under it, so `clip-path` shaved the rule along both cuts
                      and the chip opened at two corners. Same treatment as the
                      score stamp's ratio chip, which is the same drawing. */}
                  <span style={{ ...chamferMount(6), display: "inline-flex" }}>
                    <span
                      style={{
                        ...chamferSheet(6, WASH),
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "var(--space-xs) var(--space-sm)",
                        fontFamily: CAPS,
                        fontWeight: 600,
                        fontSize: "var(--text-lg)",
                        lineHeight: 1,
                      }}
                    >
                      {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                    </span>
                  </span>
                  <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: "var(--faction-ephemerists-plate-caption)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* The compass-rose points plate (#2037). The plate is the kit's
                  `CompassRose`; the figure and its unit stay HTML laid over it,
                  on the type ramp, which is also what keeps the unit a SINGLE
                  REPLACEABLE NODE — #2038 swaps that one span through five
                  scripts and needs to pin its box, which it cannot do to a
                  `<text>` node inside somebody else's viewBox. */}
              <div
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: size.medallion,
                  height: size.medallion,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CompassRose size={size.medallion} />
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.82 }}>
                  {/* THE ROSE IS A DARK CHIP ON A LIGHT SHEET (#2141), so this
                      numeral states its ink instead of inheriting the plate's:
                      `-plate-ink` is the same #12151f as the disc in light and
                      would read 1.00:1. `-plate-band-ink` is the MARK, and the
                      compass blue is the ground it is measured on — 7.59:1 in
                      both themes. */}
                  <span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: "var(--faction-ephemerists-plate-band-ink)" }}>{basePoints}</span>
                  {/* Ornament: the unit engraved inside the rose, sized to the
                      disc rather than to the label ramp (§4a). #2037 kept this
                      as one HTML node over the rose so #2038 could turn it. */}
                  {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption engraved inside the rose. */}
                  <span data-points-label="ephemerists" style={{ ...SMALL_CAPS, fontSize: 7, letterSpacing: "0.2em", marginTop: "var(--space-xs)", color: "var(--faction-ephemerists-plate-band-quiet)" }}>
                    <EphemeristsGloss
                      word="points"
                      english={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                      ordinal={0}
                    />
                  </span>
                </div>
              </div>
            </div>

            <h2
              style={{
                fontFamily: DECO,
                fontWeight: 400,
                fontSize: size.titleSize,
                letterSpacing: "0.02em",
                lineHeight: 1.24,
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
                  lineHeight: 1.55,
                  color: "var(--faction-ephemerists-plate-muted)",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path
                    d={GLYPHS.hourglass}
                    fill="none"
                    stroke="var(--faction-ephemerists-plate-brass)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: READING,
                    fontStyle: "italic",
                    fontSize: "var(--text-xl)",
                    color: "var(--faction-ephemerists-plate-muted)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* The plate's CTA was a full-bleed band closing the leaf. #2030 sets
            it as an inset cartouche with air under it, beneath the plate's own
            double brass rule — two hairlines, which is how this card rules
            everything it rules (the hero's stepped lead-in, the cornice).

            #2067 BRACKETS IT WITH THE MASTHEAD'S OWN MOTIF. The two rune strips
            are the registers that came off the band, and they are the reason this
            block no longer sits inside one `bodyPad` box: `[data-eph-runes]` is
            the full width of ITS OWN parent, so nested inside a box already inset
            by `--space-xl` they would read as a short line rather than as a
            register. So the wrapper is bare, the brass rule carries its own inset
            as a margin, and the trailing strip's 18px is what closes the card in
            place of `bodyPad`'s bottom.

            #2312 DROPPED THE STRIP'S OWN 20px INSET (it was `calc(100% - 40px)`
            centred), on the owner's ruling that corner-to-corner applies
            "anywhere there are runes". Because this wrapper is bare, that is now
            literal here: both strips run to the card's border box, where before
            they stopped 20px short of it. The brass rule above keeps its own
            `--space-xl` margin — a rule and a register are different marks and
            were never meant to line up. */}
        {cta && (
          <div style={{ position: "relative", zIndex: 2 }}>
            <div
              aria-hidden="true"
              data-cta-rule="ephemerists"
              style={{
                height: 3,
                /* The notation band's own closing pair (#2146 §4) — a hairline
                   above, a `3px double` below, both in the faction's LINE brass.
                   It was two matched hairlines in `-plate-brass`, which is the
                   MARK brass and the heavier of the two after dark. The masthead
                   opens on this rule and the CTA block closes on it. */
                borderTop: "1px solid var(--faction-ephemerists-plate-brass-rule)",
                borderBottom: "3px double var(--faction-ephemerists-plate-brass-rule)",
                margin: "0 var(--space-xl) var(--space-md)",
              }}
            />
            <EphemeristsNotationBand side="top" seed={`task:${task.id}`} />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CardCtaControl
                cta={cta}
                /* THE ONE PLATE CTA (#2146). Ground, ink and enclosure all come
                   from `.eph-cta` in index.css — the enclosure changes WIDTH
                   between the cascades, which no token can carry and which an
                   inline style could only get with the ternary §3 forbids. An
                   inline `background` or `border` here would beat the class and
                   pin the light half in both themes on this card alone. */
                className="eph-cta"
                style={{
                  ...CARD_CTA,
                  cursor: cta.denied ? "not-allowed" : "pointer",
                  display: "flex",
                  gap: "var(--space-md)",
                  /* The design's 14px, on the rung below it: the air between the
                     button and the two strips it sits between. */
                  margin: "var(--space-md) auto",
                  padding: "var(--space-sm) var(--space-xl)",
                  fontFamily: CAPS,
                  fontWeight: 500,
                  fontSize: "var(--text-xl)",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                }}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path d={GLYPHS.platinum} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* A REFUSAL DOES NOT TURN. When sign-up is shut the label is
                    the reason it is shut ("Reach level 4 first"), and the four
                    ornament frames all mean *sign up* — turning them over a
                    denial would advertise a claim the server will reject. The
                    accessible name is `cta.label` either way. */}
                {cta.denied ? (
                  <span>{cta.label}</span>
                ) : (
                  <EphemeristsGloss word="signup" english={cta.label} ordinal={1} />
                )}
                <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path d={GLYPHS.planet} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </CardCtaControl>
            </div>
            <EphemeristsNotationBand side="bottom" seed={`task:${task.id}`} />
          </div>
        )}
      </article>
    </div>
  );
}
