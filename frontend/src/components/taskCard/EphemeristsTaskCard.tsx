import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import {
  Cornice,
  Glyph,
  GLYPHS,
  Octagon,
  Tally,
} from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists — THE VALLEY PLATE (task card v2, #1023). Deco × Egypt: the
 * deco-space card carried into a field journal out of the Valley.
 *
 * A papyrus plate ruled in brass, headed by a cavetto cornice whose night band
 * holds a winged sun disc between two incised registers of glyphs — Egypt,
 * Greece, the middle ages, 1925 — that surface and recede on a long, staggered
 * cycle. The points ride a stepped octagon medallion; the level is a numeral
 * over tally strokes; the call to action is a full-bleed band with an open eye
 * and a ringed planet. Poiret One for display, Cinzel for the small caps,
 * Spectral for the reading copy.
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
  /** Masthead band height. Geometry. */
  masthead: number;
  /** Winged-disc width — the ornament narrows on the phone. Geometry. */
  discWidth: number;
  /** Medallion box. Geometry. */
  medallion: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    masthead: 110,
    discWidth: 176,
    medallion: 104,
    bodyPad: "0 var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-display)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    cardWidth: 340,
    masthead: 98,
    discWidth: 154,
    medallion: 90,
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

/*
 * The glyph library stood here — a 15-key transcription of the kit's own table,
 * identical path for identical path. #1654 collapsed it: `GLYPHS` is imported
 * from `factionMarks/ephemeristsPlate`, which is where the signs are drawn.
 *
 * The card's registers are still the CARD's, and deliberately: the design
 * marches two named 12-sign rows here where the page cycles one 16-sign
 * register to fill its width. Those orders are composition, not vocabulary.
 */

const REGISTER_TOP = [
  "ankh", "water", "feather", "eye", "djed", "greekKey",
  "reed", "offering", "alchemy", "chevrons", "scarab", "sun",
];
const REGISTER_BOTTOM = [
  "scarab", "greekKey", "sun", "reed", "chevrons", "ankh",
  "water", "djed", "eye", "alchemy", "offering", "feather",
];

/**
 * A register of signs marching across the band. The SIGN is the kit's `Glyph`;
 * only the order, the 20px lead-in and the 0.72 off-beat are this card's.
 */
function register(names: string[], y: number, strength: number, keyPrefix: string) {
  return names.map((name, index) => (
    <Glyph
      key={`${keyPrefix}${index}`}
      name={name}
      x={20 + index * 27.5}
      y={y}
      strength={strength * (index % 3 === 0 ? 1 : 0.72)}
      delay={((index * 7) % 12) * 1.6}
    />
  ));
}

/** One wing of the sun disc, drawn as deco stepped bars. */
function Wing({ flip }: { flip?: boolean }) {
  return (
    <g transform={flip ? "scale(-1,1)" : undefined}>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={13 + i * 11.4}
          y={-6 + i * 1.5}
          width={9.6}
          height={8.4 - i * 1.4}
          rx={1.4}
          fill="var(--faction-ephemerists-plate-gold)"
          opacity={0.9 - i * 0.13}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={`covert-${i}`}
          x={15 + i * 11.4}
          y={4.2 + i * 1.6}
          width={8}
          height={3.4 - i * 0.5}
          rx={1}
          fill="var(--faction-ephemerists-plate-brass-light)"
          opacity={0.62 - i * 0.11}
        />
      ))}
    </g>
  );
}

/* The stepped `Octagon` and the cavetto `Cornice` stood here — the octagon
   identical to the kit's, the cornice identical but for its FLUTE COUNT. Both
   are imported from `factionMarks/ephemeristsPlate` since #1654; the count is
   now `<Cornice flutes={40} />`, which is the task-card design's density on a
   384px band and always was. */

/* `JournalRule` stood here — this card's own fluted band, bleeding past the text
   column between the description and the in-progress line.

   #1638 converts the kit's fluted rules to RUNE BANDS, and this is the one mount
   that is DROPPED rather than converted: the masthead 300px above it already
   marches two full registers of the same signs, so a third row of them below the
   description would read as the band repeating rather than as a divider. The
   description's own bottom margin is the separation the rule was carrying, and
   `ruleBleed` went with it — it measured nothing else. */

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
      <article
        style={{
          position: "relative",
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
        {/* Masthead — the night band, its glyph registers, the winged disc. */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            height: size.masthead,
            background: "var(--faction-ephemerists-plate-band)",
            color: "var(--faction-ephemerists-plate-band-ink)",
          }}
        >
          <svg
            width="100%"
            height={size.masthead}
            viewBox="0 0 340 110"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
          >
            <path d="M8 24 H332 M8 86 H332" stroke="var(--faction-ephemerists-plate-brass-light)" strokeWidth="0.6" opacity="0.28" />
            {register(REGISTER_TOP, 13, 0.34, "top")}
            {register(REGISTER_BOTTOM, 97, 0.3, "bottom")}
          </svg>

          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-xs)",
            }}
          >
            <svg
              width={size.discWidth}
              height={40}
              viewBox="-88 -20 176 40"
              aria-hidden="true"
              style={{ display: "block", flex: "0 0 auto" }}
            >
              <Wing />
              <Wing flip />
              <circle r={10} fill="none" stroke="var(--faction-ephemerists-plate-gold)" strokeWidth="1.5" />
              <circle r={5} fill="var(--faction-ephemerists-plate-gold)" opacity={0.8} />
              <path d="M-13 0 H-10.5 M10.5 0 H13" stroke="var(--faction-ephemerists-plate-brass-light)" strokeWidth="1" />
            </svg>
            <span
              style={{
                fontFamily: DECO,
                fontSize: "var(--text-xl)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {/* #1910: the band spells the faction's name, so it reads the one
                  key that stays per-faction rather than a second copy. The
                  `textTransform` above already carried the plate's upper case,
                  so the band reads THE EPHEMERISTS either way. */}
              {factionName("ephemerists")}
            </span>
          </div>
        </div>
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
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "var(--space-xs) var(--space-sm)",
                      background: "var(--faction-ephemerists-plate-wash)",
                      border: "1px solid var(--faction-ephemerists-plate-brass)",
                      clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                      fontFamily: CAPS,
                      fontWeight: 600,
                      fontSize: "var(--text-lg)",
                      lineHeight: 1,
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: "var(--faction-ephemerists-plate-caption)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* The stepped octagon medallion. */}
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
                <svg width={size.medallion} height={size.medallion} viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
                  <Octagon inset={0} stroke="var(--faction-ephemerists-plate-brass)" width={1.6} fill="var(--faction-ephemerists-plate-disc)" />
                  <Octagon inset={6} stroke="var(--faction-ephemerists-plate-brass-light)" width={0.7} />
                  <circle cx="50" cy="50" r="34" fill="none" stroke="var(--faction-ephemerists-plate-brass-light)" strokeWidth="0.7" opacity="0.55" />
                  <path d="M18 74 H82" stroke="var(--faction-ephemerists-plate-brass-light)" strokeWidth="0.7" opacity="0.5" />
                </svg>
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.82 }}>
                  <span style={{ fontFamily: DECO, fontSize: size.pointsSize }}>{basePoints}</span>
                  {/* Ornament: the unit engraved inside the medallion, sized to
                      the disc rather than to the label ramp (§4a). */}
                  {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption engraved inside the medallion. */}
                  <span style={{ ...SMALL_CAPS, fontSize: 7, letterSpacing: "0.2em", marginTop: "var(--space-xs)", color: "var(--faction-ephemerists-plate-muted)" }}>
                    {i18n.t("feed:taskCard.pointsUnit")}
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

        {cta && (
          <button
            type="button"
            onClick={cta.onPress}
            aria-disabled={cta.denied || undefined}
            style={{
              position: "relative",
              zIndex: 2,
              cursor: cta.denied ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-md)",
              width: "100%",
              background: "var(--faction-ephemerists-plate-cta-bg)",
              color: "var(--faction-ephemerists-plate-cta-ink)",
              border: "none",
              borderTop: "2px solid var(--faction-ephemerists-plate-brass)",
              padding: "var(--space-md) 0",
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
            <span>{cta.label}</span>
            <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
              <path d={GLYPHS.planet} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </article>
    </div>
  );
}
