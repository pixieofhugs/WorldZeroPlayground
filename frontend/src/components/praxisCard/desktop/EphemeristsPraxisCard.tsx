import {
  BRASS,
  BRASS_LIGHT,
  CAPTION,
  CardGravityField,
  Cornice,
  DECO,
  INK,
  LotusSign,
  PLATE,
  QUIET,
  READING,
  SHADOW,
} from "../../factionMarks/ephemeristsPlate";
import EphemeristsNotationBand from "../../factionMarks/EphemeristsNotationBand";
import { EphemeristsBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The Ephemerists — the field-journal plate (#1207): papyrus leaf, cornice, Poiret
 * One title over Spectral, tally cell in the right column.
 *
 * A card wears the kit band its task card wears (#2185); the engraved masthead is
 * the PAGE tier's. Every colour is a `--faction-ephemerists-plate-*` token
 * (ADR-0055; never mix with `--eph-*` on one surface). `-brass` is a rule colour,
 * never an ink: labels take `-caption`, running text `-quiet`. One card, both form
 * factors (ADR-0067). Ornament comes from `ephemeristsPlate`, not a copy.
 *
 * Deviations from the vendored `#eph` frames: the byline keeps the shared
 * `FactionAvatar` (#888), and `border-radius` is 0 (the design draws none).
 */

/**
 * The field's nominal width (`--praxis-card-basis` default). The canvas is
 * anchored at the right edge, so a wider card scales rows up rather than measuring.
 */
const FIELD_WIDTH = 394;

export function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{ ...factionBodyVars("ephemerists"),
        ...frameBase,
        position: "relative",
        overflow: "hidden",
        background: PLATE,
        color: INK,
        border: `1px solid ${BRASS}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 3,
        boxShadow: SHADOW,
        fontFamily: READING,
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* The kit's gravity-field ground (#2398); `CardGravityField` owns the
          drop-on-ornamented-ground branch, shared with the task card. z-index 1:
          under band (2) and cornice (3). Nothing below branches on the ground. */}
      <CardGravityField width={FIELD_WIDTH} />

      {/* Same band as `EphemeristsTaskCard` (#2185). */}
      <EphemeristsBand />
      <Cornice />

      {/* z-index 4, above the cornice: the stamp's crown hangs at `top: -13`
          into the cornice on purpose (#2240, #2122), and only the leaf's own
          stacking context can lift it.

          Top pad is `--space-sm`, not more: 8px against the 13px overhang still
          breaks the crown into the cornice (#2360, #2655). The title's
          `--space-lg` makes up the 24px. */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          padding: "var(--space-sm) var(--space-xl) var(--space-lg)",
        }}
      >
        <AdminOverlay {...adminProps} />

        <PraxisBody
          praxis={praxis}
          // Brass frames and rings; it is never an ink.
          tint={BRASS}
          muted={QUIET}
          paper={PLATE}
          showCrown={showCrown}
          // Plus the leaf's `--space-sm` = `--space-xl` (#2360, #2655).
          titleStyle={{
            fontFamily: DECO,
            // LOAD-BEARING, do not sweep (#2597): `PraxisTitle` puts
            // `font-semibold` on the <h2>, and one-cut Poiret One would fake-bold.
            fontWeight: 400,
            letterSpacing: "0.02em",
            color: INK,
            marginTop: "var(--space-lg)",
          }}
          fonts={{ display: DECO, body: READING }}
          mediaEmptyStyle={{
            borderRadius: 0,
            border: `1px solid ${BRASS}`,
            background: "transparent",
            color: CAPTION,
          }}
          /* The rune strip replaces the byline's dotted rule (#2312), at the
             media box's width — no bleed (#2724). The one shared drawing
             (#2230). `side="divider"` is the vertical-offset knob and also
             keeps the seed distinct from the composer's `praxis:${id}` at `top`. */
          bylineDivider={
            <EphemeristsNotationBand side="divider" seed={`praxis:${praxis.id}`} />
          }
          voteRule={
            /* The vote section's head; the widget carries no prompt. */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-md)",
              }}
            >
              <span aria-hidden style={{ flex: 1, height: 1, background: BRASS, opacity: 0.5 }} />
              <LotusSign width={16} color={BRASS} />
            </div>
          }
        />
      </div>
    </div>
  );
}

export default EphemeristsPraxisCard;
