import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { PLATINUM } from "../factionMarks/ephemeristsPlate";

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

/**
 * The glyph library. Egyptian signs beside later-era marks, all drawn as deco
 * geometry on a 24-unit square. Stroke-only, so they read as incised rather than
 * as illustration.
 */
const GLYPHS: Record<string, string> = {
  ankh: "M12 22 V10 M6 15 H18 M12 10 a4 4 0 1 0 0.001 0 Z",
  eye: "M3 12 C7 7 17 7 21 12 C17 16 7 16 3 12 M12 10.2 a1.8 1.8 0 1 0 .01 0 Z M15 15 L18 20 M8 15 L5 19",
  feather: "M12 22 V4 M12 6 C15 7 17 10 17 13 M12 6 C9 7 7 10 7 13 M12 12 C14.6 12.8 16 14.6 16 17 M12 12 C9.4 12.8 8 14.6 8 17",
  water: "M2 9 l4 3 4-3 4 3 4-3 4 3 M2 15 l4 3 4-3 4 3 4-3 4 3",
  djed: "M12 22 V8 M6 8 H18 M6 12 H18 M7.5 4.6 H16.5 M9 2 H15",
  reed: "M12 22 V7 C12 4 14 2.6 17 2.6 C17 6 15 7.4 12 7.4",
  sun: "M12 12 a5 5 0 1 0 .01 0 Z M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21",
  offering: "M4 8 H20 M6 8 V14 H18 V8 M9 14 V20 M15 14 V20 M4 20 H20",
  scarab: "M12 4 C15.5 4 17.5 7 17.5 11 C17.5 16.6 15 20 12 20 C9 20 6.5 16.6 6.5 11 C6.5 7 8.5 4 12 4 M12 4 V20 M6.5 9 L2.5 6 M17.5 9 L21.5 6 M6.5 15 L2.5 18 M17.5 15 L21.5 18",
  greekKey: "M2 20 V6 H16 V16 H8 V11 H12", // meander — Greek, c. 700 BC
  chevrons: "M3 8 L12 3 L21 8 M3 14 L12 9 L21 14 M3 20 L12 15 L21 20", // deco, 1925
  alchemy: "M12 3 L21 19 H3 Z M6.6 13.6 H17.4", // alchemical fire — medieval
  hourglass: "M5 3 H19 M5 21 H19 M6.5 3 L12 12 L6.5 21 M17.5 3 L12 12 L17.5 21",
  /* The summons mark since #1638 — the ladder's top metal, read from the kit
     rather than copied, so the sign the vote plate strikes and the sign the
     summons wears cannot drift apart. It replaced the open eye, which had no
     other reader on this card and went with it. */
  platinum: PLATINUM.glyph,
  planet: "M5.8 12 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0 M1.8 16.2 A10.8 3.7 -22 0 1 22.2 7.8 A10.8 3.7 -22 0 1 1.8 16.2", // Saturn
};

const REGISTER_TOP = [
  "ankh", "water", "feather", "eye", "djed", "greekKey",
  "reed", "offering", "alchemy", "chevrons", "scarab", "sun",
];
const REGISTER_BOTTOM = [
  "scarab", "greekKey", "sun", "reed", "chevrons", "ankh",
  "water", "djed", "eye", "alchemy", "offering", "feather",
];

const GLYPH_SIZE = 13;

/** One incised sign, at its own strength and its own phase in the cycle. */
function Glyph({ name, x, y, strength, delay }: {
  name: string
  x: number
  y: number
  strength: number
  delay: number
}) {
  return (
    <g
      className="epg-glyph"
      transform={`translate(${x} ${y}) scale(${GLYPH_SIZE / 24}) translate(-12 -12)`}
      style={{ ["--epg-op"]: strength, ["--epg-delay"]: `${delay}s` } as CSSProperties}
    >
      <path
        d={GLYPHS[name]}
        fill="none"
        stroke="var(--faction-ephemerists-plate-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A register of signs marching across the band. */
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

/** A stepped octagon, inset from the medallion's edge. */
function Octagon({ inset, stroke, width, fill }: {
  inset: number
  stroke: string
  width: number
  fill?: string
}) {
  return (
    <path
      d="M30 4 L70 4 L96 30 L96 70 L70 96 L30 96 L4 70 L4 30 Z"
      fill={fill ?? "none"}
      stroke={stroke}
      strokeWidth={width}
      transform={`translate(50,50) scale(${(100 - inset * 2) / 100}) translate(-50,-50)`}
    />
  );
}

/** The cavetto cornice: fluted strokes under a stepped double rule. */
function Cornice() {
  return (
    <div aria-hidden="true" style={{ position: "relative", zIndex: 3, background: "var(--faction-ephemerists-plate-band)" }}>
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between cornice flutes; rounding it to a rung reflows the fluting. */}
      <div style={{ display: "flex", height: 7, alignItems: "flex-end", gap: 3, padding: "0 var(--space-sm)", overflow: "hidden" }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: i % 2 ? 6 : 3.5,
              background: "var(--faction-ephemerists-plate-brass-light)",
              opacity: i % 2 ? 0.5 : 0.28,
            }}
          />
        ))}
      </div>
      <div style={{ height: 2, background: "var(--faction-ephemerists-plate-brass)", opacity: 0.9 }} />
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the gap in the cornice's stepped double rule. */}
      <div style={{ height: 1, marginTop: 2, background: "var(--faction-ephemerists-plate-brass-light)", opacity: 0.55 }} />
    </div>
  );
}

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
  const showMultiplier = !isNeutralMultiplier(multiplier);
  const tallyStrokes = Math.min(9, Math.max(1, Math.round(task.level_required)));

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
              {i18n.t("feed:taskCard.ephemerists.masthead")}
            </span>
          </div>
        </div>
        <Cornice />

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
                <span style={{ ...SMALL_CAPS, fontSize: "var(--text-sm)", color: "var(--faction-ephemerists-plate-caption)" }}>
                  {i18n.t("feed:taskCard.ephemerists.levelCaption")}
                </span>
                <span style={{ fontFamily: DECO, fontSize: size.levelSize, lineHeight: 0.8 }}>
                  {task.level_required}
                </span>
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the pitch of the tally strokes, drawn at 1.6px wide. */}
                <span aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 11 }}>
                  {Array.from({ length: tallyStrokes }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 1.6,
                        height: 11 - (i % 3) * 2,
                        opacity: 0.85,
                        background: i === 4
                          ? "var(--faction-ephemerists-plate-ochre)"
                          : "var(--faction-ephemerists-plate-brass)",
                      }}
                    />
                  ))}
                </span>
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
                  <span style={{ ...SMALL_CAPS, fontSize: "var(--text-xs)", color: "var(--faction-ephemerists-plate-caption)" }}>
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
                    {i18n.t("feed:taskCard.ephemerists.pointsUnit")}
                  </span>
                </div>
              </div>
            </div>

            <h3
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
            </h3>

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

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            style={{
              position: "relative",
              zIndex: 2,
              cursor: "pointer",
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
            <span>{i18n.t("feed:taskCard.ephemerists.signup")}</span>
            <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
              <path d={GLYPHS.planet} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </article>
    </div>
  );
}
