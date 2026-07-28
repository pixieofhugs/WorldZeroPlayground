import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionCssVar, factionFill, factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { isNeutralMultiplier } from "../../../utils/points";
import { ErrorBanner, LevelJumpBanner, TaskDetailComments } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * The Ephemerists task detail — THE VALLEY PLATE at page size (task detail v2,
 * #1032, design `.design-sync/task-details-v2/ephemerists-task-detail.jsx`).
 *
 * Deco × Egypt, the same metaphor the v2 task card ships (#1023): a papyrus
 * field journal out of the Valley. A cavetto-cornice masthead whose night band
 * holds a winged sun disc between two incised registers of glyphs; the task
 * number in a cartouche; the level a numeral over tally strokes; the worth on a
 * stepped octagon medallion inside a panel crowned by a second winged disc; the
 * brief on a ruled leaf with a red margin rule. Poiret One display, Cinzel small
 * caps, Spectral reading.
 *
 * This REPLACES "The Discordant Map" — the 909-line illuminated-codex archetype
 * built on `credenceHeading` / `ephemeridesHeading` / `cartographersHeading` /
 * `commissionHeading` / `puncta` / `triangulating` and the coordinate diagram.
 * A full metaphor swap (ADR-0055/0056); the `--eph-*` codex family stays
 * declared because every OTHER Ephemerists surface still paints with it.
 *
 * Contract points inherited from the na reference build (#1030) — reasoning
 * lives in `DefaultTaskDetail` and is not re-derived here:
 * - **No in-progress roster.** The header count is the only place that
 *   population appears (owner ruling 2026-07-28, reversing epic #1028 decision
 *   3). The design builds a whole roster section — octagon avatars, tally
 *   strokes, Ally/Rival tags, a "+N more players" row — and never mounts it in
 *   either layout. That is dead code, deliberately not ported.
 * - **The `×mult` row only renders off the identity factor**, read raw from the
 *   state contract, never reconstructed as `modifiedPoints / basePoints`
 *   (ADR-0053's dead-arithmetic trap). `era_1` neutralises every faction, so the
 *   ledger's modifier row is correctly invisible today. The design draws a
 *   `Bonus ×1.00` row unconditionally; here it hides at 1.0 like every other
 *   skin's badge (ADR-0055).
 * - **Copy is the shared neutral `detail.*` set** (ADR-0057). None of the
 *   design's words survive, and none of the retired faction voice does either.
 * - **The gallery expands in place.** `/praxes?task_id=N` has never filtered —
 *   `usePraxes` reads no such param — so "view all" is a local expand.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * collapses the two-column split. `pages/taskDetail/mobileArchetypes/
 * EphemeristsTaskDetail.tsx` and its `mobileTaskDetail` manifest row stay
 * registered but DORMANT — restoring the dispatcher branch is the whole revert.
 *
 * Every colour is a `--faction-ephemerists-plate-*` token; light/dark flips
 * through the `[data-theme="dark"]` cascade, never a ternary. `-brass` is a rule
 * colour and never an ink; quiet type takes `-quiet`, which clears AA on the
 * page, the plate AND the panel cells (see index.css).
 */

/** Poiret One — the v2 display face. NOT `--faction-ephemerists-card-font`
 *  (Cinzel), which is the codex's display token a dozen surfaces still read. */
const DECO = "var(--font-faction-deco)";
const CAPS = "var(--font-faction-engraved)"; /* Cinzel */
const READING = "var(--font-faction-spectral)"; /* Spectral */

const PLATE = "var(--faction-ephemerists-plate-bg)";
const INNER = "var(--faction-ephemerists-plate-inner)";
const INK = "var(--faction-ephemerists-plate-ink)";
const QUIET = "var(--faction-ephemerists-plate-quiet)";
const CAPTION = "var(--faction-ephemerists-plate-caption)";
const BRASS = "var(--faction-ephemerists-plate-brass)";
const BRASS_LIGHT = "var(--faction-ephemerists-plate-brass-light)";
const GOLD = "var(--faction-ephemerists-plate-gold)";
const BAND = "var(--faction-ephemerists-plate-band)";
const BAND_INK = "var(--faction-ephemerists-plate-band-ink)";
const DISC = "var(--faction-ephemerists-plate-disc)";
const OCHRE = "var(--faction-ephemerists-plate-ochre)";
const NILE = "var(--faction-ephemerists-plate-nile)";
const CTA_BG = "var(--faction-ephemerists-plate-cta-bg)";
const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";
const RULE = "var(--faction-ephemerists-plate-rule)";
const LINE = "var(--faction-ephemerists-plate-line)";
const SHADOW = "var(--faction-ephemerists-plate-shadow)";
const WASH = "var(--faction-ephemerists-plate-wash)";

/**
 * Praxis cards shown before the gallery expands. `PraxisCard` carries
 * `flex: 1 1 394px`, so three land in one row at the 1200 cap and the row
 * rewraps on its own — never the design's `repeat(3,1fr)`, which would squeeze
 * every card instead.
 */
const GALLERY_PREVIEW = 3;

/**
 * The brief's leading, in px, and the pitch of the journal ruling under it.
 * These are ONE number by construction: a ruled leaf whose rules miss the text's
 * baselines reads as a printing error rather than as stationery. The design's 28
 * was drawn for 15.5px type; `--text-content` is 18px (the #627 floor), so the
 * ruling opens to match rather than the type closing to fit.
 */
const BRIEF_LEADING = 32;

/**
 * The glyph library — Egyptian signs beside later-era marks, drawn as deco
 * geometry on a 24-unit square, stroke-only so they read as incised rather than
 * illustrated.
 *
 * Duplicated from `components/cards/EphemeristsTaskCard.tsx`, which owns the
 * same set for the card. Deliberate under this issue's two-file scope; the
 * extraction target is `components/cards/ephemeristsAtoms.tsx`, and until the
 * two are merged a change to one sign has to be made twice.
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
  openEye: "M2 12 C6 5.4 18 5.4 22 12 M2 12 C6 18.6 18 18.6 22 12 M8.4 12 a3.6 3.6 0 1 0 7.2 0 a3.6 3.6 0 1 0 -7.2 0 M10.7 12 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 M12 2.8 V5 M5 4.6 L6.8 6.6 M19 4.6 L17.2 6.6",
  planet: "M5.8 12 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0 M1.8 16.2 A10.8 3.7 -22 0 1 22.2 7.8 A10.8 3.7 -22 0 1 1.8 16.2", // Saturn
};

/** The order the signs march in — the design's own register. */
const REGISTER = [
  "ankh", "water", "feather", "eye", "djed", "greekKey", "reed", "offering",
  "alchemy", "chevrons", "scarab", "sun", "ankh", "water", "djed", "eye",
];

/** Distance between two signs in a register, in viewBox units. */
const GLYPH_PITCH = 27.5;
const GLYPH_SIZE = 13;

/** Incised small caps — the plate's whole label voice. */
const SMALL_CAPS: CSSProperties = {
  fontFamily: CAPS,
  fontWeight: 500,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
};

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
        stroke={GOLD}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * A register of signs marching the full width of the band. The count follows the
 * viewBox rather than the design's fixed 16: the masthead is page-wide here (up
 * to the 1200 cap) and a fixed count would either stop short of the edge or,
 * under `slice`, blow every sign up to a cartoon.
 */
function GlyphRegister({ width, y, strength, keyPrefix }: {
  width: number
  y: number
  strength: number
  keyPrefix: string
}) {
  const count = Math.ceil(width / GLYPH_PITCH);
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Glyph
          key={`${keyPrefix}${index}`}
          name={REGISTER[index % REGISTER.length]}
          x={18 + index * GLYPH_PITCH}
          y={y}
          strength={strength * (index % 3 === 0 ? 1 : 0.7)}
          delay={((index * 7) % 12) * 1.6}
        />
      ))}
    </>
  );
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
          fill={GOLD}
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
          fill={BRASS_LIGHT}
          opacity={0.62 - i * 0.11}
        />
      ))}
    </g>
  );
}

/** The winged sun disc, at whatever width it is asked for. */
function WingedDisc({ width, height, className }: {
  width: number
  height: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="-88 -20 176 40"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <Wing />
      <Wing flip />
      <circle r={11} fill={DISC} stroke={BRASS} strokeWidth="1.6" />
      <circle r={5.5} fill={GOLD} opacity={0.85} />
    </svg>
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
    <div aria-hidden="true" style={{ position: "relative", zIndex: 3, background: BAND }}>
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between cornice flutes; rounding it to a rung reflows the fluting. */}
      <div style={{ display: "flex", height: 7, alignItems: "flex-end", gap: 3, padding: "0 var(--space-sm)", overflow: "hidden" }}>
        {Array.from({ length: 52 }).map((_, i) => (
          <span
            key={i}
            style={{ flex: 1, height: i % 2 ? 6 : 3.5, background: BRASS_LIGHT, opacity: i % 2 ? 0.5 : 0.28 }}
          />
        ))}
      </div>
      <div style={{ height: 2, background: BRASS, opacity: 0.9 }} />
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the gap in the cornice's stepped double rule. */}
      <div style={{ height: 1, marginTop: 2, background: BRASS_LIGHT, opacity: 0.55 }} />
    </div>
  );
}

/** The cavetto band reused as a divider — the rule under every section head. */
function FlutedRule() {
  return (
    <div
      aria-hidden="true"
      // eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between the fluted rule's strokes.
      style={{ display: "flex", alignItems: "flex-start", gap: 3, height: 7, overflow: "hidden" }}
    >
      {Array.from({ length: 48 }).map((_, i) => (
        <span
          key={i}
          style={{ flex: 1, height: i % 2 ? 7 : 4, background: BRASS, opacity: i % 2 ? 0.5 : 0.28 }}
        />
      ))}
    </div>
  );
}

/** The level, struck as tally marks — every fifth stroke in ochre. */
function Tally({ level }: { level: number }) {
  const strokes = Math.min(9, Math.max(1, Math.round(level)));
  return (
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the pitch of the tally strokes, drawn 1.6px wide.
    <span aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 11 }}>
      {Array.from({ length: strokes }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 1.6,
            height: 11 - (i % 3) * 2,
            opacity: 0.85,
            background: i === 4 ? OCHRE : BRASS,
          }}
        />
      ))}
    </span>
  );
}

/** One incised sign at label scale, set beside a line of type. */
function Sign({ name, size, color, weight }: {
  name: string
  size: number
  color: string
  weight?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d={GLYPHS[name]}
        fill="none"
        stroke={color}
        strokeWidth={weight ?? 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SizeSet {
  /** Masthead band height. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  masthead: number
  /** Width the masthead's registers are drawn to fill. Geometry. */
  mastheadView: number
  /** The wordmark's winged disc. Geometry. */
  wordmarkDisc: number
  /** The disc crowning the action panel, and the room reserved above it. */
  crownWidth: number
  crownHeight: number
  crownReserve: number
  /** The points medallion, and the ledger cell that holds it. Geometry. */
  medallion: number
  ledgerWidth: number
  /**
   * Minimum height for a small control (sort tabs, drop, expand). The standing
   * Ephemerists carve-out in `docs/agents/design-fidelity.md` is that touch
   * targets win but the geometry gets RE-SOLVED around them, rather than 44px
   * boxes being dropped into ornament drawn for intrinsic sizes: the phone takes
   * 44 and the rows it sits in wrap, the pointer build keeps the design's
   * tighter chrome.
   */
  tapTarget: number
  cellPadding: string
  briefPadding: string
  /** Where the ochre margin rule is struck, and where the ruling starts. */
  marginRule: number
  rulingOffset: number
  titleSize: string
  levelSize: string
  pointsSize: string
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    masthead: 108,
    mastheadView: 1200,
    wordmarkDisc: 176,
    crownWidth: 400,
    crownHeight: 91,
    crownReserve: 96,
    medallion: 104,
    ledgerWidth: 150,
    tapTarget: 32,
    cellPadding: "var(--space-lg)",
    briefPadding: "var(--space-xl) var(--space-xl) var(--space-lg) var(--space-3xl)",
    marginRule: 26,
    rulingOffset: 30,
    titleSize: "var(--text-display)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    masthead: 92,
    mastheadView: 440,
    wordmarkDisc: 150,
    crownWidth: 290,
    crownHeight: 66,
    crownReserve: 74,
    medallion: 88,
    ledgerWidth: 116,
    tapTarget: 44,
    cellPadding: "var(--space-md)",
    briefPadding: "var(--space-lg) var(--space-lg) var(--space-md) var(--space-xl)",
    marginRule: 18,
    rulingOffset: 22,
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
  },
};

/** The page cap the epic settled on. Geometry. */
const PAGE_WIDTH = 1200;
/** The action panel — 420, the narrowest in the set. Dress, and deliberate. */
const PANEL_WIDTH = 420;

/** Initials fallback for an author with no uploaded avatar. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EphemeristsTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
  // The gallery expands in place. It deliberately does NOT link to
  // `/praxes?task_id=N`: the praxis feed reads no such param, so that link has
  // always dropped the filter and shown the whole feed.
  const [showAllPraxis, setShowAllPraxis] = useState(false);
  const {
    task,
    submissions,
    mySubmission,
    isInProgress,
    inProgressPraxisId,
    canSignUp,
    levelJumpSignup,
    slotsOpen,
    maxTaskSlots,
    basePoints,
    factionMultiplier,
    modifiedPoints,
    inProgressCount,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  // Guarded non-null by the dispatcher.
  if (!task) return null;

  const slug = task.primary_faction_slug;
  const isMetatask = task.task_type === "metatask";
  const showMultiplier = !isNeutralMultiplier(factionMultiplier);
  const authorName = task.created_by_display_name ?? "";
  const hasAction =
    canSignUp || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

  const plate: CSSProperties = {
    background: PLATE,
    border: `1px solid ${LINE}`,
    boxSizing: "border-box",
  };
  const cell: CSSProperties = {
    background: INNER,
    border: `1px solid ${LINE}`,
    padding: size.cellPadding,
    boxSizing: "border-box",
  };
  /**
   * The page-ground label voice. `-quiet`, not `-caption`: the caption ink was
   * measured against the PLATE (4.75:1) and only reaches 4.45:1 on the darker
   * page this surface introduces. Labels that sit on a panel cell take
   * `plateEyebrow` below, where the caption gold is both legal and better.
   */
  const eyebrow: CSSProperties = {
    ...SMALL_CAPS,
    fontSize: "var(--text-sm)",
    color: QUIET,
  };
  /** The same label voice on a panel cell, where the caption gold clears. */
  const plateEyebrow: CSSProperties = { ...eyebrow, color: CAPTION };
  const quietItalic: CSSProperties = {
    fontFamily: READING,
    fontStyle: "italic",
    fontSize: "var(--text-lg)",
    lineHeight: 1.7,
    color: QUIET,
  };
  const primaryButton: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    width: "100%",
    boxSizing: "border-box",
    minHeight: 48,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    background: CTA_BG,
    color: CTA_INK,
    border: `2px solid ${BRASS}`,
    padding: "var(--space-md) var(--space-sm)",
    fontFamily: CAPS,
    fontWeight: 500,
    fontSize: "var(--text-lg)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  };
  /** A quiet inline control — drop, expand. Sized for a thumb on the phone. */
  const quietButton: CSSProperties = {
    ...quietItalic,
    display: "inline-flex",
    alignItems: "center",
    minHeight: size.tapTarget,
    background: "none",
    border: "none",
    borderBottom: `1px solid ${LINE}`,
    cursor: "pointer",
    padding: 0,
    color: NILE,
  };

  /** Small caps, a brass hairline running out, an optional gloss, a fluted rule. */
  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-sm)",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            ...SMALL_CAPS,
            fontWeight: 600,
            fontSize: "var(--text-md)",
            color: INK,
            margin: 0,
            flex: "0 0 auto",
          }}
        >
          {label}
        </h2>
        <span aria-hidden style={{ flex: 1, minWidth: 24, height: 1, background: BRASS, opacity: 0.5 }} />
        {gloss !== undefined && <span style={eyebrow}>{gloss}</span>}
      </div>
      <FlutedRule />
    </div>
  );

  // ── The masthead: the night band, its two registers, the winged disc ──
  const masthead = (
    <div style={{ marginBottom: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          height: size.masthead,
          background: BAND,
          color: BAND_INK,
        }}
      >
        <svg
          width="100%"
          height={size.masthead}
          viewBox={`0 0 ${size.mastheadView} 108`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <path
            d={`M8 24 H${size.mastheadView - 8} M8 84 H${size.mastheadView - 8}`}
            stroke={BRASS_LIGHT}
            strokeWidth="0.6"
            opacity="0.28"
          />
          <GlyphRegister width={size.mastheadView} y={13} strength={0.34} keyPrefix="top" />
          <GlyphRegister width={size.mastheadView} y={95} strength={0.3} keyPrefix="bottom" />
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
          <WingedDisc width={size.wordmarkDisc} height={38} />
          <span
            style={{
              fontFamily: DECO,
              fontSize: "var(--text-xl)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: BAND_INK,
              whiteSpace: "nowrap",
            }}
          >
            {factionName(slug)}
          </span>
        </div>
      </div>
      <Cornice />
    </div>
  );

  // ── Header: breadcrumb cartouche, faction line, title, author, stats ──
  const header = (
    <div>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <Link to="/tasks" style={{ ...eyebrow, color: NILE, textDecoration: "none" }}>
          {t("detail.breadcrumb.tasks")}
        </Link>
        <span aria-hidden style={{ ...eyebrow, color: QUIET }}>
          /
        </span>
        {/* The cartouche — the task's ordinal, ruled off at both ends. */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            padding: "var(--space-xs) var(--space-md)",
            border: `1.5px solid ${BRASS}`,
            borderRadius: 12,
            background: WASH,
          }}
        >
          <span aria-hidden style={{ width: 1.5, height: 12, background: BRASS }} />
          <span style={{ ...SMALL_CAPS, fontWeight: 700, fontSize: "var(--text-base)", color: INK, whiteSpace: "nowrap" }}>
            {t("detail.breadcrumb.current", { number: task.id })}
          </span>
          <span aria-hidden style={{ width: 1.5, height: 12, background: BRASS }} />
        </span>
      </nav>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <Sign name="ankh" size={19} color={BRASS} weight={1.6} />
        <span style={{ ...eyebrow, fontSize: "var(--text-base)" }}>{factionName(slug)}</span>
        {isMetatask && (
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              letterSpacing: "0.16em",
              padding: "var(--space-xs) var(--space-sm)",
              // na → rainbow frame; a real faction → solid hue + on-fill ink.
              ...factionFill(task.metatask_faction_slug, "pill"),
            }}
          >
            {t("detail.meta")}
          </span>
        )}
      </div>

      <h1
        style={{
          fontFamily: DECO,
          fontWeight: 400,
          fontSize: size.titleSize,
          lineHeight: 1.16,
          letterSpacing: "0.02em",
          margin: 0,
          marginBottom: "var(--space-lg)",
          color: INK,
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        <p
          style={{
            ...eyebrow,
            color: factionCssVar(task.metatask_faction_slug),
            margin: 0,
            marginBottom: "var(--space-lg)",
          }}
        >
          {t("detail.metataskFor", {
            faction: factionName(task.metatask_faction_slug),
          })}
        </p>
      )}

      {/* Author row — the proposing character's byline (#1029). */}
      {authorName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            marginBottom: "var(--space-lg)",
            flexWrap: "wrap",
          }}
        >
          <Link
            to={`/characters/${task.created_by}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              textDecoration: "none",
            }}
          >
            {task.created_by_avatar_url ? (
              <img
                src={mediaUrl(task.created_by_avatar_url)}
                alt={authorName}
                style={{
                  width: 30,
                  height: 30,
                  flex: "none",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: `1px solid ${BRASS}`,
                }}
              />
            ) : (
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  flex: "none",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: DISC,
                  border: `1px solid ${BRASS}`,
                  fontFamily: CAPS,
                  fontWeight: 500,
                  fontSize: "var(--text-md)",
                  color: INK,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: READING,
                fontSize: "var(--text-content)",
                color: INK,
                borderBottom: `1px solid ${BRASS}`,
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={eyebrow}>
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Header stats — the level over its tally strokes, and the in-progress
          count. There is deliberately no roster; this count is the only place
          that population appears. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", lineHeight: 1 }}>
          <span style={eyebrow}>{t("detail.stats.level")}</span>
          <span style={{ fontFamily: DECO, fontSize: size.levelSize, lineHeight: 0.8, color: INK }}>
            {task.level_required}
          </span>
          <Tally level={task.level_required} />
        </div>
        <span aria-hidden style={{ width: 1, alignSelf: "stretch", minHeight: 38, background: LINE }} />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <Sign name="hourglass" size={15} color={BRASS} />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", lineHeight: 1 }}>
            <span style={eyebrow}>{t("detail.stats.inProgress")}</span>
            <span style={{ fontFamily: DECO, fontSize: size.pointsSize, lineHeight: 0.8, color: INK }}>
              {inProgressCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── The ledger: base, the (usually absent) modifier, the medallion total ──
  const ledgerRow = (label: ReactNode, value: ReactNode) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)" }}>
      {label}
      <span aria-hidden style={{ flex: 1, minWidth: 10, height: 1, background: LINE }} />
      <span style={{ fontFamily: DECO, fontSize: "var(--text-content)", color: INK, whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );

  const scoreCell = (
    <div
      style={{
        ...cell,
        flex: "0 0 auto",
        width: size.ledgerWidth,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-md)",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {ledgerRow(<span style={plateEyebrow}>{t("detail.points.base")}</span>, basePoints)}
        {/* The modifier row — absent at ×1.00, so invisible under era_1's
            neutralised modifiers and automatic the day one moves (ADR-0055).
            The design labels it "Bonus"; ADR-0057 leaves no shared word for it,
            so the label slot takes an incised ankh instead of an invented one. */}
        {showMultiplier &&
          ledgerRow(
            <Sign name="ankh" size={11} color={BRASS} weight={1.4} />,
            t("detail.points.multiplier", { multiplier: factionMultiplier.toFixed(2) }),
          )}
      </div>

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
        <svg
          width={size.medallion}
          height={size.medallion}
          viewBox="0 0 100 100"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0 }}
        >
          <Octagon inset={0} stroke={BRASS} width={1.6} fill={DISC} />
          <Octagon inset={6} stroke={BRASS_LIGHT} width={0.7} />
          <circle cx="50" cy="50" r="34" fill="none" stroke={BRASS_LIGHT} strokeWidth="0.7" opacity="0.55" />
          <path d="M16 70 H84" stroke={BRASS_LIGHT} strokeWidth="0.7" opacity="0.5" />
        </svg>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.82 }}>
          <span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: INK }}>{modifiedPoints}</span>
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-xs)",
              letterSpacing: "0.2em",
              marginTop: "var(--space-xs)",
              color: CAPTION,
            }}
          >
            {t("detail.points.total")}
          </span>
        </div>
      </div>
    </div>
  );

  // ── The summons: sign up / continue / edit. Nothing renders when the viewer
  //    has no move to make — an unusable control is worse than none.
  const summons = (
    <>
      {canSignUp && (
        <div>
          <LevelJumpBanner state={state} />
          <button onClick={handleSignup} style={primaryButton}>
            <Sign name="openEye" size={15} color={CTA_INK} weight={1.4} />
            <span style={{ whiteSpace: "nowrap" }}>{t("detail.signup.cta")}</span>
            <Sign name="planet" size={14} color={CTA_INK} weight={1.4} />
          </button>
          <div style={{ ...quietItalic, marginTop: "var(--space-sm)" }}>
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: NILE }}>
                  {t("detail.signup.levelMet", { level: task.level_required })}
                </span>
              </>
            )}
          </div>
          <ErrorBanner message={signupError} />
        </div>
      )}

      {mySubmission && (
        <div>
          <div style={{ ...quietItalic, marginBottom: "var(--space-sm)" }}>
            {t("detail.submitted.text")}
          </div>
          <Link to={`/praxes/${mySubmission.id}/edit`} style={primaryButton}>
            {t("detail.submitted.edit")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
            <Sign name="openEye" size={15} color={NILE} />
            <span style={{ ...quietItalic, color: NILE }}>{t("detail.inProgress.text")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
            <Link to={`/praxes/${inProgressPraxisId}/edit`} style={{ ...primaryButton, flex: 1, width: "auto" }}>
              {t("detail.inProgress.continue")}
            </Link>
            <button onClick={handleDrop} style={quietButton}>
              {t("detail.inProgress.drop")}
            </button>
          </div>
          <ErrorBanner message={signupError} />
        </div>
      )}
    </>
  );

  // The worth beside the summons, one plate, crowned by a winged disc.
  const actionPanel = (
    <div style={{ position: "relative", paddingTop: size.crownReserve }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          pointerEvents: "none",
          maxWidth: "100%",
        }}
      >
        <WingedDisc className="eph-plate-crown" width={size.crownWidth} height={size.crownHeight} />
      </div>
      <div
        style={{
          ...plate,
          position: "relative",
          zIndex: 1,
          outline: `1px solid ${BRASS_LIGHT}`,
          outlineOffset: 3,
          boxShadow: SHADOW,
          padding: "var(--space-sm)",
          display: "flex",
          flexDirection: "row",
          gap: "var(--space-sm)",
          alignItems: "stretch",
        }}
      >
        {scoreCell}
        {hasAction && (
          <div
            style={{
              ...cell,
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {summons}
          </div>
        )}
      </div>
    </div>
  );

  // ── The brief, in full, on a ruled leaf with a red margin rule ──
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <div
          style={{
            ...plate,
            position: "relative",
            padding: size.briefPadding,
            backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${BRIEF_LEADING - 1}px, ${RULE} ${BRIEF_LEADING - 1}px ${BRIEF_LEADING}px)`,
            backgroundPosition: `0 ${size.rulingOffset}px`,
          }}
        >
          {/* The margin rule, struck in ochre down the gutter. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: size.marginRule,
              width: 1,
              background: OCHRE,
              opacity: 0.5,
            }}
          />
          <p
            className="content-text"
            style={{
              fontFamily: READING,
              lineHeight: `${BRIEF_LEADING}px`,
              color: INK,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              margin: 0,
            }}
          >
            {task.description}
          </p>
        </div>
      )}
    </section>
  );

  // ── The praxis gallery ──
  const sortTab = (sort: "score" | "recent", label: string) => (
    <button
      key={sort}
      onClick={() => setSubmissionSort(sort)}
      style={{
        ...SMALL_CAPS,
        display: "inline-flex",
        alignItems: "center",
        minHeight: size.tapTarget,
        cursor: "pointer",
        border: "none",
        padding: "var(--space-xs) var(--space-md)",
        fontSize: "var(--text-sm)",
        background: submissionSort === sort ? CTA_BG : "transparent",
        color: submissionSort === sort ? CTA_INK : QUIET,
      }}
    >
      {label}
    </button>
  );

  const gallery = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            marginBottom: "var(--space-sm)",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", color: INK, margin: 0 }}>
            {t("detail.gallery.heading", { count: submissions.length })}
          </h2>
          <span aria-hidden style={{ flex: 1, minWidth: 24, height: 1, background: BRASS, opacity: 0.5 }} />
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the 2px reveal that reads as an engraved frame around the two tabs. */}
          <span style={{ display: "flex", gap: 2, border: `1px solid ${LINE}`, padding: 2 }}>
            {sortTab("score", t("detail.gallery.sort.top"))}
            {sortTab("recent", t("detail.gallery.sort.recent"))}
          </span>
        </div>
        <FlutedRule />
      </div>

      {sortedSubmissions.length === 0 ? (
        <p className="content-text" style={{ fontFamily: READING, fontStyle: "italic", color: QUIET, margin: 0 }}>
          {t("detail.gallery.empty")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 items-start">
            {(showAllPraxis ? sortedSubmissions : sortedSubmissions.slice(0, GALLERY_PREVIEW)).map(
              (praxis) => (
                <PraxisCard key={praxis.id} praxis={praxis} />
              ),
            )}
          </div>
          {submissions.length > GALLERY_PREVIEW && (
            <button
              onClick={() => setShowAllPraxis((shown) => !shown)}
              style={{ ...quietButton, marginTop: "var(--space-lg)" }}
            >
              {showAllPraxis
                ? t("detail.gallery.showFewer")
                : t("detail.gallery.viewAll", { count: submissions.length })}
            </button>
          )}
        </>
      )}
    </section>
  );

  return (
    <div className="py-8" style={{ position: "relative", color: INK }}>
      {/* The papyrus ground, full-bleed behind the column (index.css). */}
      <div className="eph-plate-backdrop" aria-hidden />

      <div style={{ position: "relative", zIndex: 1, maxWidth: PAGE_WIDTH, margin: "0 auto" }}>
        {masthead}

        <div
          style={{
            display: "flex",
            flexDirection: desktop ? "row" : "column",
            alignItems: desktop ? "flex-start" : "stretch",
            gap: desktop ? "var(--space-2xl)" : "var(--space-xl)",
            marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
          <div
            style={{
              flex: desktop ? `0 0 ${PANEL_WIDTH}px` : "1 1 auto",
              width: desktop ? PANEL_WIDTH : "100%",
              maxWidth: "100%",
            }}
          >
            {actionPanel}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {brief}
          {gallery}
          <TaskDetailComments state={state} heading={sectionHead(t("detail.comments.heading"))} />
        </div>
      </div>
    </div>
  );
}
