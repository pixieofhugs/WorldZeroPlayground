import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { EphemeristsColophon, EphemeristsMasthead } from "../../../components/factionMarks/EphemeristsMasthead";
import EphemeristsNotationBand from "../../../components/factionMarks/EphemeristsNotationBand";
import EphemerisNet from "../../../components/factionMarks/EphemerisNet";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionFill, factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import {
  actionColumnSize,
  ErrorBanner,
  headerFactionName,
  LevelJumpBanner,
  showWorthBreakdown,
  TaskDetailComments,
} from "./shared";
import {
  Cornice,
  initialsOf,
  Octagon,
  Sign,
  SMALL_CAPS,
  Tally,
} from "../../../components/factionMarks/ephemeristsPlate";
import { signupCtaKey } from "../signupCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * The Ephemerists task detail — THE VALLEY PLATE at page size (task detail v2,
 * #1032; design project 0711d3a7, unvendored by #1039).
 *
 * Deco × Egypt, the same metaphor the v2 task card ships (#1023): a papyrus
 * field journal out of the Valley. A cavetto-cornice masthead whose night band
 * holds the ENGRAVED MASTHEAD (#1634, page scale on desktop and card scale on a
 * phone) between two incised registers of glyphs; the level a numeral over tally
 * strokes; the worth on a stepped octagon medallion; the brief on a leaf of the
 * chart with a red margin rule. Poiret One display, Cinzel small caps, Spectral
 * reading.
 *
 * The winged sun disc appeared TWICE on this page — over the wordmark, and 400px
 * wide crowning the action panel — from a local copy of the shared kit's mark.
 * #1634 retired the disc across the kit: the sigil is the only mark, and it is
 * in the masthead. The panel's reserved space and the `collapsedMinWidth` that
 * kept the column from narrowing under it went with the crown.
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
 * - **The gallery expands in place.** "View all" is a local expand: the reader
 *   stays on the task. (`/praxis?task_id=N` did not filter at all until #1050.)
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * collapses the two-column split. The separate Ephemerists mobile skin and the
 * manifest surface that held it were deleted by #1068 when the ADR was accepted;
 * re-adding a dispatcher branch would be drift, not a revert.
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
/* `GOLD` stood here. Its one reader was this page's copy of the kit's `Glyph`,
   which #1654 deleted — and the kit's own already defaults its ink to the same
   gold, so nothing has to hand it in. Gold is the masthead's ink on a night
   band and a stain on the papyrus page; nothing else here wants it. */
const BAND = "var(--faction-ephemerists-plate-band)";
const BAND_INK = "var(--faction-ephemerists-plate-band-ink)";
const BAND_QUIET = "var(--faction-ephemerists-plate-band-quiet)";
const DISC = "var(--faction-ephemerists-plate-disc)";
const OCHRE = "var(--faction-ephemerists-plate-ochre)";
const CTA_BG = "var(--faction-ephemerists-plate-cta-bg)";
const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";
const LINE = "var(--faction-ephemerists-plate-line)";
const SHADOW = "var(--faction-ephemerists-plate-shadow)";
/* `--faction-ephemerists-plate-wash` filled the breadcrumb cartouche and nothing
   else on this page; #1124 retired the cartouche with the task id it framed. */

/**
 * Praxis cards shown before the gallery expands. The row is `.praxis-gallery`,
 * which narrows `PraxisCard`'s basis to 320px (#1137), so three land in one row
 * at the 1200 cap and the row rewraps on its own — never the design's
 * `repeat(3,1fr)`, which would squeeze every card instead. The feed's own 394px
 * basis fitted only two across the content column.
 */
const GALLERY_PREVIEW = 3;

/**
 * The brief's leading, in px. It used to be TWO things — the leading and the
 * pitch of the journal ruling beneath it, one number by construction so no rule
 * missed a baseline. #2144 took the ruling away (the net replaces it), and the
 * leading it was pitched to is what stays: the design's 28 was drawn for 15.5px
 * type and `--text-content` is 18px (the #627 floor), so the line opened to
 * match rather than the type closing to fit. Nothing tracks it any more, which
 * is why it is now a plain number and not a pair.
 */
const BRIEF_LEADING = 32;

/* The glyph library, its 16-sign register and their pitch stood here — a
   transcription of the kit's, path for path, which is exactly the shape that
   lets one surface keep drawing last month's mark. #1654 collapsed all seven
   into `factionMarks/ephemeristsPlate`, imported at the top of this file.
   #2210 then retired the REGISTER itself, kit and copies together: the
   mathematical notation band #2143 hung under the wordmark is the faction's
   only ornament row, and `GLYPHS` survives as the vocabulary for a single mark
   drawn by `Sign`. */

/* The page's own `SMALL_CAPS` stood here — the kit's constant to the byte, and
   the last thing in this file that restated the plate's typography. It is now
   imported at the top with the marks (#1664). The task CARD's copy is NOT this
   one and deliberately stays local: it tracks at 0.26em, which is the card
   design's drawing rather than a drift from this one — the same situation as the
   cornice's 40 flutes against the page's 52. */

/* `Wing` and `WingedDisc` stood here — this page's LOCAL copy of the shared
   kit's winged sun disc (the two were byte-identical, which is how a duplicate
   survives review). #1634 retired the mark across the kit: the sigil is the only
   one now, and it arrives through `EphemeristsMasthead`. The copy goes with the
   original rather than outliving it. */

/* The page's own hand-copied `FlutedRule` stood here — a second, byte-identical
   declaration of the kit's divider that no import-following sweep could see, so
   #1638's "fluted rules become shifting runes" would have converted six mounts
   and silently left this page's two on the old drawing. Its replacement, the
   kit's rune band, retired with the rest of the old glyph vocabulary in #2210;
   this page's two section heads keep the brass hairline that already flexes
   across each heading row. Nothing in this file declares a mark. */

interface SizeSet {
  /** Masthead band height. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  masthead: number
  /** The wordmark's winged disc. Geometry. */
  wordmarkDisc: number
  /** The disc crowning the action panel, and the room reserved above it. */
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
  /** Where the ochre margin rule is struck down the gutter. */
  marginRule: number
  titleSize: string
  levelSize: string
  pointsSize: string
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    masthead: 108,
    wordmarkDisc: 176,
    medallion: 104,
    ledgerWidth: 150,
    tapTarget: 32,
    cellPadding: "var(--space-lg)",
    briefPadding: "var(--space-xl) var(--space-xl) var(--space-lg) var(--space-3xl)",
    marginRule: 26,
    titleSize: "var(--text-display)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    masthead: 92,
    wordmarkDisc: 150,
    medallion: 88,
    ledgerWidth: 116,
    tapTarget: 44,
    cellPadding: "var(--space-md)",
    briefPadding: "var(--space-lg) var(--space-lg) var(--space-md) var(--space-xl)",
    marginRule: 18,
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
  },
};

/** The page cap the epic settled on. Geometry. */
const PAGE_WIDTH = 1200;
/**
 * The action panel — 420, the narrowest in the set. Dress, and deliberate. It is
 * the width of a plate that HAS a summons on it; with no move to make the column
 * collapses to the crown (#1138).
 */
const PANEL_WIDTH = 420;

/* The byline's `initialsOf` stood here, and it was the ONE transcription in this
   file that was not a de-duplication: it agreed with the kit's on every input
   except a display name that is nothing but whitespace, where the local copy
   returned "" and the kit's returns "·". That case is reachable — creation
   strips and rejects a blank name, but `CharacterUpdate.display_name` carries
   only `max_length`, so a PATCH lands "   " in the column — so #1664 had to
   choose rather than collapse, and chose the kit's mark: this page was the only
   Ephemerists surface that answered the question differently, and every other
   one (the praxis byline, the comment row, the roster monogram, all of them
   `AuthorOctagon`) already strikes the "·". An empty disc reads as a failed
   render; the mark reads as a character with no name, which is what it is. */

export default function EphemeristsTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
  // The gallery expands in place. It deliberately does NOT link out to
  // `/praxis?task_id=N` — the reader stays on the task. That URL does filter
  // properly since #1050; before it, it silently showed the whole feed.
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
  // Null on a metatask carrying the generic sentinel (#2282, headerFactionName).
  const eyebrowFaction = headerFactionName(task);
  const showBreakdown = showWorthBreakdown(factionMultiplier);
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
   * The page-ground label voice. `-quiet`, not `-caption` — and the reason has
   * expired without the choice changing. The caption ink was measured against
   * the PLATE (4.75:1) and only reached 4.45:1 on the darker page this surface
   * introduces; since #1627 took the register to its night values it clears the
   * page at 7.71 and `-quiet` at 6.38, so both are legal and this is now a voice
   * decision rather than a contrast one: the page's labels are the quiet tier,
   * a panel cell's are the gold. Labels on a cell take `plateEyebrow` below.
   */
  const eyebrow: CSSProperties = {
    ...SMALL_CAPS,
    fontSize: "var(--text-md)",
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
  /**
   * The plate's primary control, MINUS ITS PAINT (#2146).
   *
   * Ground, ink and enclosure arrive from `.eph-cta` in index.css, which every
   * surface drawing this button wears. They used to be three lines here — and
   * three more in the task card, and three more again in the composer, the
   * faction page and the field desk — with the enclosure quietly disagreeing
   * with itself at 2px, 1.5px and 2px. It could not have been unified inline
   * either way: the enclosure changes WIDTH between the cascades and an inline
   * style has no cascade to change in.
   *
   * Every element spreading this must also carry `className="eph-cta"`.
   */
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
    color: BRASS_LIGHT,
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
      {/* A rune band closed this head until #2210 retired the old glyph
          vocabulary. The hairline above rules the head off on its own. */}
    </div>
  );

  // ── The masthead: the night band and the engraved title ──────────────────
  //
  // AN ORNAMENT LAYER SAT BEHIND THE LOCKUP UNTIL #2210 — an absolutely
  // positioned SVG carrying two incised glyph registers, one along the top of
  // the band and one along the foot, with a pair of faint brass rules bracketing
  // them off from the title. This is the surface the owner reported: #2143 put
  // the NOTATION BAND under the wordmark and left the registers standing, so the
  // page wore two glyph vocabularies at once and the lower register ran through
  // the band's own marks — the row had been placed to clear a datum row the band
  // had already replaced, and the band's lead had opened from 5px to 9px.
  //
  // The whole layer goes, not just the two registers: the pair of rules existed
  // to bracket them, and the notation band brought the masthead its own `1px` /
  // `3px double` pair, which is the head's rule now. What is left on the band is
  // the lockup, which no longer needs a stacking layer to sit above.
  const masthead = (
    <div style={{ marginBottom: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: size.masthead,
          background: BAND,
          color: BAND_INK,
        }}
      >
        <EphemeristsMasthead
          slug={slug}
          scale={desktop ? "page" : "card"}
          seed={`task:${task.id}`}
        />
      </div>
      <Cornice />
    </div>
  );

  // ── Header: breadcrumb, faction line, title ── (byline + stats: `credentials`, below the brief — #2120)
  const header = (
    <div>
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
        <span style={{ ...eyebrow, fontSize: "var(--text-base)" }}>{eyebrowFaction}</span>
        {isMetatask && (
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-md)",
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
        // `eyebrow`'s own `QUIET` — `-plate-quiet`, this column's register,
        // 6.38 / 5.98 / 5.52:1 on its three grounds in BOTH cascades (#1754).
        // The override was a foreign faction's spine hue, a FILL (§3, #1932);
        // on the plate the brass this faction was itself given in #2068 is the
        // one that fails hardest, which is what #2077 was filed about.
        <p
          style={{
            ...eyebrow,
            margin: 0,
            marginBottom: "var(--space-lg)",
          }}
        >
          {t("detail.metataskIssuer", {
            faction: factionName(task.metatask_faction_slug),
          })}
        </p>
      )}
    </div>
  );

  // ── Who and at what level: the byline, the level, the headcount ──
  //
  // Split out of `header` by #2120 so the DESCRIPTION reads between them. See
  // `DefaultTaskDetail` for the whole sequence and why it is this one.
  const credentials = (
    <div>
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
                  color: BAND_INK,
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
        // Alone on the plate — no move for this viewer (#1138) — the ledger
        // spreads to the plate rather than sitting in one corner of it. Until
        // #1634 the plate could not narrow to it: a 400px winged disc hung over
        // the panel, absolutely positioned, so it added nothing to a
        // shrink-to-fit width and would have overhung both edges. With the crown
        // gone the panel really can go to its contents, so `collapsedMinWidth`
        // at the column below is dropped rather than re-pointed.
        flex: hasAction ? "0 0 auto" : "1 1 auto",
        width: hasAction ? size.ledgerWidth : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-md)",
      }}
    >
      {/* The ledger — both rows or neither (#1704). The modifier row is absent
          at ×1.00, so under era_1's neutralised modifiers the base row was left
          reading out the same figure the medallion below already strikes; the
          ledger comes back whole the day a modifier moves (ADR-0055). The design
          labels the second row "Bonus"; ADR-0057 leaves no shared word for it, so
          the label slot takes an incised ankh instead of an invented one. */}
      {showBreakdown && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {ledgerRow(<span style={plateEyebrow}>{t("detail.points.base")}</span>, basePoints)}
          {ledgerRow(
            <Sign name="ankh" size={11} color={BRASS} weight={1.4} />,
            t("detail.points.multiplier", { multiplier: factionMultiplier.toFixed(2) }),
          )}
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
          {/* The medallion is a dark chip in both themes; its inks are the
              band's, not the sheet's (#2141). */}
          <span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: BAND_INK }}>{modifiedPoints}</span>
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-md)",
              letterSpacing: "0.2em",
              marginTop: "var(--space-xs)",
              color: BAND_QUIET,
            }}
          >
            {t("detail.points.total", { count: modifiedPoints })}
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
          {/* The rune strips bracket the plate's CTA on every surface that
              paints one (#2067) — the same component the task card mounts, so
              the motif cannot drift between the card and the page it opens.
              Only the SIGN-UP button is bracketed: "continue" and "view your
              praxis" below wear the same `primaryButton` paint but are exits
              from a task already taken, not the summons. */}
          <EphemeristsNotationBand side="top" seed={`task:${task.id}`} />
          <button data-testid="task-signup-cta" className="eph-cta" onClick={handleSignup} style={{ ...primaryButton, margin: "var(--space-md) auto" }}>
            <Sign name="platinum" size={15} color={CTA_INK} weight={1.3} />
            <span style={{ whiteSpace: "nowrap" }}>{t(signupCtaKey(task.signup_reason))}</span>
            <Sign name="planet" size={14} color={CTA_INK} weight={1.4} />
          </button>
          <EphemeristsNotationBand side="bottom" seed={`task:${task.id}`} />
          <div style={{ ...quietItalic, marginTop: "var(--space-sm)" }}>
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: BRASS_LIGHT }}>
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
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
          <Link className="eph-cta" to={`/praxis/${mySubmission.id}`} style={primaryButton}>
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
            <Sign name="openEye" size={15} color={BRASS_LIGHT} />
            <span style={{ ...quietItalic, color: BRASS_LIGHT }}>{t("detail.inProgress.text")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
            <Link className="eph-cta" to={`/praxis/${inProgressPraxisId}/edit`} style={{ ...primaryButton, flex: 1, width: "auto" }}>
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

  // The worth beside the summons, on one plate.
  //
  // A 400px winged sun disc used to hang over it, absolutely positioned in
  // reserved space above the plate. #1634 retired it — the sigil is the kit's
  // only mark, and it is in the masthead at the head of this page — which takes
  // `crownWidth`/`crownHeight`/`crownReserve` with it. The panel is now an
  // ordinary block: no reserve to pad, and nothing overhanging its edges.
  const actionPanel = (
    <div style={{ position: "relative" }}>
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

  // ── The brief, in full, on a leaf of the chart with a red margin rule ──
  //
  // The leaf used to be RULED NOTEPAPER: a `repeating-linear-gradient` pitched
  // to `BRIEF_LEADING` so every rule met a baseline. #2144 replaces it with the
  // page's own net — one drawing across the whole faction, where the rules were
  // a second ruling this page drew for itself.
  //
  // 0.17, WHICH IS THE PAGE'S WEIGHT AND NOT THE DESIGN'S 0.42. Owner ruling:
  // at 0.42 the net's diagonals land at roughly the weight of a 13px serif's
  // strokes, and this is body copy. If the brief later needs to read as more
  // written-on than the page around it, the honest fix is to keep BOTH — the
  // rules for the writing line, the net for the material — and NOT to double
  // the net's weight; 0.42 has already been tried and ruled out once.
  //
  // `isolation: isolate` is the whole mount: it makes this leaf a stacking
  // context, so the net's `z-index: -1` lands above the plate's fill and below
  // the copy, the margin rule and everything else printed here. The design's
  // `z-index: 1` lift is not used — see the net's header.
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <div
          style={{
            ...plate,
            position: "relative",
            isolation: "isolate",
            padding: size.briefPadding,
          }}
        >
          <EphemerisNet opacity={0.17} />
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
        fontSize: "var(--text-md)",
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
          {/* Nothing to sort until something is filed (#1704). The heading and
              the empty line below stay; only the control goes. */}
          {sortedSubmissions.length > 0 && (
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the 2px reveal that reads as an engraved frame around the two tabs.
            <span style={{ display: "flex", gap: 2, border: `1px solid ${LINE}`, padding: 2 }}>
              {sortTab("score", t("detail.gallery.sort.top"))}
              {sortTab("recent", t("detail.gallery.sort.recent"))}
            </span>
          )}
        </div>
      </div>

      {sortedSubmissions.length === 0 ? (
        <p className="content-text" style={{ fontFamily: READING, fontStyle: "italic", color: QUIET, margin: 0 }}>
          {t("detail.gallery.empty")}
        </p>
      ) : (
        <>
          <div className="praxis-gallery flex flex-wrap gap-4 items-start">
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
    <div className="py-8">
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The page IS the plate: the column carries the papyrus itself, headed by
          the cornice masthead flush to its own edges. There is deliberately no
          fixed full-bleed backdrop element — see the `.eph-plate-sheet` note in
          index.css for what that pattern does to the sidebar. */}
      <div
        className="eph-plate-sheet"
        style={{
          maxWidth: PAGE_WIDTH,
          margin: "0 auto",
          boxSizing: "border-box",
          color: INK,
          border: `1px solid ${LINE}`,
          boxShadow: SHADOW,
        }}
      >
        {masthead}

        <div
          style={{
            padding: desktop
              ? "0 var(--space-2xl) var(--space-2xl)"
              : "0 var(--space-lg) var(--space-lg)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: desktop ? "row" : "column",
              alignItems: desktop ? "flex-start" : "stretch",
              gap: desktop ? "var(--space-2xl)" : "var(--space-xl)",
              marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {header}
              {brief}
              {credentials}
            </div>
            <div
              style={{
                // 420 with a summons to answer; with none, the plate goes to its
                // contents like every other skin (#1138). This was the one
                // exception, and only because a 400px winged disc hung over the
                // panel without participating in the layout; #1634 retired it.
                ...actionColumnSize({ desktop, hasAction, width: PANEL_WIDTH }),
                maxWidth: "100%",
              }}
            >
              {actionPanel}
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            {gallery}
            <TaskDetailComments
              state={state}
              heading={sectionHead(t("detail.comments.heading"))}
            />
          </div>

          {/* The plate's provenance, at the foot of the sheet (#2143). It is
              the masthead's old datum row, labelled — see `EphemeristsColophon`
              for why the label and this placement are a requirement (#2124) and
              not a layout preference. It sits OUTSIDE the two-column region and
              below the comment thread, so nothing player-scoped is beside it,
              and its own rule separates it from whatever ended above. */}
          <EphemeristsColophon
            scale={desktop ? "page" : "card"}
            date={task.created_at}
          />
        </div>
      </div>
    </div>
  );
}
