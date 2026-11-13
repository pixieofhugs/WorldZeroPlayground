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
  detailSignupCta,
  ErrorBanner,
  headerFactionName,
  LevelJumpBanner,
  TaskDetailComments,
  TaskWorthStamp,
} from "./shared";
import {
  Cornice,
  initialsOf,
  Sign,
  SMALL_CAPS,
  Tally,
} from "../../../components/factionMarks/ephemeristsPlate";
import { CardCtaControl } from "../../../components/taskCard/CardCtaControl";
import { EPHEMERISTS_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * The Ephemerists task detail — the Valley plate at page size (#1032). Deco ×
 * Egypt papyrus journal: cornice masthead, level over tally strokes, brief on a
 * leaf with an ochre margin rule. Contract (no roster, raw ×mult, neutral
 * `detail.*` copy, in-place gallery) is `DefaultTaskDetail`'s.
 *
 * One responsive component (ADR-0058); don't re-add a mobile dispatcher branch.
 * Colours are `--faction-ephemerists-plate-*` tokens; `-brass` is a rule colour,
 * never an ink.
 */

/** Cinzel via the shared engraved token, NOT `--faction-ephemerists-card-font`. */
const DECO = "var(--font-faction-engraved)";
const CAPS = "var(--font-faction-engraved)"; /* Cinzel */
const READING = "var(--font-faction-deco)"; /* Poiret One */

const PLATE = "var(--faction-ephemerists-plate-bg)";
const INNER = "var(--faction-ephemerists-plate-inner)";
const INK = "var(--faction-ephemerists-plate-ink)";
const QUIET = "var(--faction-ephemerists-plate-quiet)";
const BRASS = "var(--faction-ephemerists-plate-brass)";
const BRASS_LIGHT = "var(--faction-ephemerists-plate-brass-light)";
const BAND = "var(--faction-ephemerists-plate-band)";
const BAND_INK = "var(--faction-ephemerists-plate-band-ink)";
const DISC = "var(--faction-ephemerists-plate-disc)";
const OCHRE = "var(--faction-ephemerists-plate-ochre)";
const CTA_BG = "var(--faction-ephemerists-plate-cta-bg)";
const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";
const LINE = "var(--faction-ephemerists-plate-line)";
const SHADOW = "var(--faction-ephemerists-plate-shadow)";

/**
 * Praxis cards shown before the gallery expands. `.praxis-gallery` narrows the
 * card basis to 320px (#1137), so three fit one row at the 1200 cap.
 */
const GALLERY_PREVIEW = 3;

/** The brief's leading, in px: the design's 28 opened for 18px `--text-content` (#627). */
const BRIEF_LEADING = 32;

/* Marks (glyphs, SMALL_CAPS, rules) come from `factionMarks/ephemeristsPlate`
   (#1654); this file declares none. */

interface SizeSet {
  /** Masthead band height. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  masthead: number
  wordmarkDisc: number
  medallion: number
  ledgerWidth: number
  /**
   * Min height for a small control. Phone takes 44 and its rows wrap; pointer
   * keeps the design's tighter chrome (`docs/agents/design-fidelity.md`).
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

const PAGE_WIDTH = 1200;
/** Panel width with a summons on it (dress, the narrowest in the set); collapses without (#1138). */
const PANEL_WIDTH = 420;

export default function EphemeristsTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
  // Expands in place; deliberately no link out to `/praxis?task_id=N`.
  const [showAllPraxis, setShowAllPraxis] = useState(false);
  const {
    task,
    submissions,
    mySubmission,
    isInProgress,
    inProgressPraxisId,
    levelJumpSignup,
    slotsOpen,
    maxTaskSlots,
    inProgressCount,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleDrop,
  } = state;

  // Guarded non-null by the dispatcher.
  if (!task) return null;

  const slug = task.primary_faction_slug;
  const isMetatask = task.task_type === "metatask";
  const eyebrowFaction = headerFactionName(task);
  const cta = detailSignupCta(state);
  const authorName = task.created_by_display_name ?? "";
  const hasAction =
    !!cta || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

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
  /** The page-ground label voice: `-quiet` (a voice choice; `-caption` also clears AA). */
  const eyebrow: CSSProperties = {
    ...SMALL_CAPS,
    fontSize: "var(--text-md)",
    color: QUIET,
  };
  const quietItalic: CSSProperties = {
    fontFamily: READING,
    fontSize: "var(--text-lg)",
    lineHeight: 1.7,
    color: QUIET,
  };
  /**
   * The plate's primary control minus its paint, which comes from `.eph-cta`
   * (the enclosure width changes per cascade; inline can't). Every element
   * spreading this must also carry `className="eph-cta"` (#2146).
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

  /** Small caps, a brass hairline running out, an optional gloss. */
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
    </div>
  );

  // The masthead: night band + engraved lockup. No glyph registers behind it —
  // the notation band is the faction's only ornament row (#2210).
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

  // Header: faction line, title. Byline + stats are `credentials`, below the brief (#2120).
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
        // `QUIET` ink, not the issuer's hue: a fill, it fails AA here (#2077).
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

  // Byline, level, headcount — order per `DefaultTaskDetail` (#2120).
  const credentials = (
    <div>
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

      {/* No roster by design; this count is the only place that population appears. */}
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

  const scoreCell = (
    <div
      style={{
        ...cell,
        // Alone on the plate (no move, #1138) the ledger spreads to fill it.
        flex: hasAction ? "0 0 auto" : "1 1 auto",
        width: hasAction ? size.ledgerWidth : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-md)",
      }}
    >
      <TaskWorthStamp state={state} />
    </div>
  );

  // The summons: sign up / continue / edit. Nothing renders with no move to make.
  const summons = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* Notation bands bracket only the sign-up CTA, as on the card (#2067). */}
          <EphemeristsNotationBand side="top" seed={`task:${task.id}`} />
          {/* The cards' control and paint (#2642); `.eph-cta` stays a class (see primaryButton). */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            className="eph-cta"
            size="detail"
            style={EPHEMERISTS_CARD_CTA}
          >
            <Sign name="platinum" size={15} color={CTA_INK} weight={1.3} />
            <span style={{ whiteSpace: "nowrap" }}>{cta.label}</span>
            <Sign name="planet" size={14} color={CTA_INK} weight={1.4} />
          </CardCtaControl>
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
          {/* The READ page, not `/edit`, which bounces a submitted praxis (#1397). */}
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

  // The brief on a leaf over the faction's net (#2144). Net at 0.17, not the
  // design's 0.42 (owner ruling: 0.42 fights body copy; don't raise it).
  // `isolation: isolate` makes the leaf a stacking context so the net's
  // `z-index: -1` sits above the fill and below the copy.
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
          {/* Nothing to sort until something is filed (#1704). */}
          {sortedSubmissions.length > 0 && (
            // eslint-disable-next-line local/no-raw-style-values -- ornament: 2px engraved frame
            <span style={{ display: "flex", gap: 2, border: `1px solid ${LINE}`, padding: 2 }}>
              {sortTab("score", t("detail.gallery.sort.top"))}
              {sortTab("recent", t("detail.gallery.sort.recent"))}
            </span>
          )}
        </div>
      </div>

      {sortedSubmissions.length === 0 ? (
        <p className="content-text" style={{ fontFamily: READING, color: QUIET, margin: 0 }}>
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
      {/* Site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The column IS the plate; no full-bleed backdrop (see `.eph-plate-sheet`). */}
      <div
        className="eph-plate-sheet"
        style={{
          ...factionBodyVars("ephemerists"),
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

          {/* Provenance at the sheet's foot, below everything player-scoped;
              placement is a requirement — see `EphemeristsColophon` (#2124). */}
          <EphemeristsColophon
            scale={desktop ? "page" : "card"}
            date={task.created_at}
          />
        </div>
      </div>
    </div>
  );
}
