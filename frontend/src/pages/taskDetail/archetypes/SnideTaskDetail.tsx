import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionFill, factionName } from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
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
import { CardCtaControl } from "../../../components/taskCard/CardCtaControl";
import { SNIDE_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * S.N.I.D.E. — the ransom dossier (#1035): cut-up headline, redaction rules,
 * an acid action plate off true, hard unblurred shadows. Contract is
 * `DefaultTaskDetail`'s; one responsive component (ADR-0058).
 *
 * THE CENSOR REDACTS ORNAMENT, NEVER CONTENT (#1023). Don't black out words of
 * the brief; `.snd-censor` rules and the cut headline carry the metaphor.
 *
 * Two grounds (#2066): the WALL (`.snd-detail-sheet`) flips with the theme and
 * takes the `-note-*` inks (`INK`/`MUTED`/`PINK_INK`); every SLAB pasted on it is
 * black in both themes and takes only `PLATE_*`. Never mix them — a flipping
 * ink on a pinned slab is black-on-black. Invariant acid/pink draw lines, and
 * are an ink only on the slab.
 */

const IMPACT = "var(--faction-snide-font-black)"; /* Archivo Black */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARK = "var(--faction-snide-font-marker)"; /* Permanent Marker */

/** The WALL's inks; they flip. NOTHING ON A SLAB READS THEM (#2066). */
const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
/** Pink as TEXT on the wall (AA-walked), not pink as a line. */
const PINK_INK = "var(--faction-snide-note-pink-ink)";
/** The SLAB, black in both themes, and its measured ink family. */
const PLATE = "var(--snd-task-paper)";
const PLATE_TEXT = "var(--snd-task-ink)";
const PLATE_MUTED = "var(--snd-task-quiet)";
const PLATE_ACCENT = "var(--snd-task-accent)";
/** Pink as a drawn line. Invariant. */
const PINK = "var(--faction-snide-pink)";
/** Non-flipping photocopier black for borders and shadows on acid. */
const HARD = "var(--faction-snide-ink)";

/** Praxis shown before expanding; `.praxis-gallery` fits three per row (#1137). */
const GALLERY_PREVIEW = 3;

/**
 * The headline's four cuts, same as the task card's; a word's cut is indexed
 * off the task id. Cut 2 is a knockout with its own pair, since paper/ink swap
 * under dark mode and would vanish together.
 */
const CUTS: CSSProperties[] = [
  { fontFamily: IMPACT, color: INK, textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: IMPACT,
    color: "var(--faction-snide-note-cta-ink)",
    background: "var(--faction-snide-acid)",
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: BLACK,
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the 1px bleed is the cut
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: size relative to the headline
    fontSize: "0.8em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: TYPE,
    color: INK,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above
    fontSize: "0.7em",
    textTransform: "uppercase",
    borderBottom: `3px solid ${PINK}`,
    transform: "rotate(1.2deg)",
  },
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** A tiled strip of redaction blocks. `.snd-censor` owns its pigments (#1023). */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

/** The struck-out cross that flanks every call to action. */
function XMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto", transform: "rotate(-6deg)" }}
    >
      <g fill="none" stroke={PINK} strokeWidth="2.6" strokeLinecap="round">
        <path d="M3.5 3 C8 7.5 12 12 16.5 17.5" />
        <path d="M16.5 3.5 C12.5 7 8 12 3 16.5" />
      </g>
    </svg>
  );
}

export default function SnideTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
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

  const isMetatask = task.task_type === "metatask";
  const eyebrowFaction = headerFactionName(task);
  const cta = detailSignupCta(state);
  const authorName = task.created_by_display_name ?? "";
  const hasAction =
    !!cta || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

  const eyebrow: CSSProperties = {
    fontFamily: TYPE,
    fontSize: "var(--text-md)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: MUTED,
  };
  /** A slab pasted on the wall, ruled in acid. */
  const panel: CSSProperties = {
    background: PLATE,
    border: `2px solid var(--faction-snide-acid)`,
    boxShadow: "var(--faction-snide-note-shadow)",
    color: PLATE_TEXT,
    boxSizing: "border-box",
  };
  const innerBox: CSSProperties = {
    background: PLATE,
    border: `3px solid ${HARD}`,
    color: PLATE_TEXT,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };
  /**
   * The skewed EXIT ("continue", "view your praxis"), inverted so it never looks
   * like sign-up. Its shadow takes the invariant pink: it falls on the slab (#2066).
   */
  const plateButton: CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    background: HARD,
    color: "var(--faction-snide-acid)",
    fontFamily: IMPACT,
    fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    border: "3px solid var(--faction-snide-acid)",
    padding: desktop ? "var(--space-lg) var(--space-xl)" : "var(--space-md)",
    boxShadow: `7px 7px 0 ${PINK}`,
    transform: "skewX(-4deg) rotate(-0.8deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
  };
  /** Counter-skews the label so it stays readable. */
  const plateLabel: CSSProperties = { transform: "skewX(4deg)" };

  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: IMPACT,
          fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
          lineHeight: 1.02,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: INK,
        }}
      >
        {label}
      </span>
      <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
      {gloss !== undefined && <span style={eyebrow}>{gloss}</span>}
    </div>
  );

  const statBlock = (label: ReactNode, value: ReactNode, big: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
      <span style={{ ...eyebrow, letterSpacing: "0.18em" }}>{label}</span>
      <span
        style={{
          fontFamily: IMPACT,
          fontSize: big
            ? desktop
              ? "var(--text-display)"
              : "var(--text-heading)"
            : desktop
              ? "var(--text-heading)"
              : "var(--text-title)",
          lineHeight: 0.82,
          color: INK,
          transform: big ? "rotate(-1.5deg)" : "none",
        }}
      >
        {value}
      </span>
    </div>
  );

  const worth = <TaskWorthStamp state={state} />;

  // The one action slot. Nothing renders with no move to make.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2642). No `plateLabel`: the card's
              stencil is rotated, not skewed. */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={SNIDE_CARD_CTA}
          >
            <XMark size={17} />
            <span>{cta.label}</span>
            <XMark size={17} />
          </CardCtaControl>
          <div
            style={{
              fontFamily: TYPE,
              fontSize: "var(--text-md)",
              lineHeight: 1.55,
              textAlign: "center",
              color: PLATE_MUTED,
              marginTop: "var(--space-lg)",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: PLATE_ACCENT }}>
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
          <div
            style={{
              fontFamily: MARK,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 1.2,
              color: PLATE_TEXT,
              marginBottom: "var(--space-md)",
              transform: "rotate(-1.4deg)",
            }}
          >
            {t("detail.submitted.text")}
          </div>
          {/* The READ page, not `/edit`, which bounces a submitted praxis (#1397). */}
          <Link to={`/praxis/${mySubmission.id}`} style={plateButton}>
            <XMark size={17} />
            <span style={plateLabel}>{t("detail.submitted.view")}</span>
            <XMark size={17} />
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            style={{
              fontFamily: MARK,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 1.2,
              color: PLATE_TEXT,
              marginBottom: "var(--space-md)",
              transform: "rotate(-1.4deg)",
              textDecoration: `underline 3px ${PINK}`,
              textDecorationSkipInk: "none",
            }}
          >
            {t("detail.inProgress.text")}
          </div>
          <Link to={`/praxis/${inProgressPraxisId}/edit`} style={plateButton}>
            <XMark size={17} />
            <span style={plateLabel}>{t("detail.inProgress.continue")}</span>
            <XMark size={17} />
          </Link>
          <button
            onClick={handleDrop}
            style={{
              display: "block",
              width: "100%",
              cursor: "pointer",
              textAlign: "center",
              background: "none",
              border: "none",
              marginTop: "var(--space-lg)",
              padding: 0,
              fontFamily: TYPE,
              fontSize: "var(--text-md)",
              letterSpacing: "0.1em",
              // Underline, not line-through: struck text reads as unavailable (#2214).
              textDecoration: "underline",
              color: PLATE_MUTED,
            }}
          >
            {t("detail.inProgress.drop")}
          </button>
          <ErrorBanner message={signupError} />
        </div>
      )}
    </>
  );

  // The action plate: acid sheet off true, hazard tape, two punched boxes. 452px is dress.
  const actionPlate = (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        background: "var(--faction-snide-note-cta-bg)",
        border: `3px solid ${HARD}`,
        boxShadow: `10px 10px 0 ${PINK}, var(--faction-snide-note-shadow)`,
        transform: "rotate(-0.6deg)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: 14,
          background: `repeating-linear-gradient(45deg, var(--faction-snide-note-cta-bg) 0 9px, ${HARD} 9px 18px)`,
        }}
      />
      <div
        style={{
          position: "relative",
          padding: "var(--space-sm)",
          display: "flex",
          gap: "var(--space-sm)",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            ...innerBox,
            // Alone (no move, #1138) the worth sheet takes the whole width.
            flex: hasAction ? "0 0 auto" : "1 1 auto",
            minWidth: desktop ? 178 : 132,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Dot screen in the slab's quiet pigment, light in both themes.
            backgroundImage:
              `radial-gradient(${PLATE_MUTED} 22%, transparent 23%), radial-gradient(${PLATE_MUTED} 22%, transparent 23%)`,
            backgroundSize: "6px 6px, 6px 6px",
            backgroundPosition: "0 0, 3px 3px",
          }}
        >
          {/* The halftone reads through at the edges only. */}
          <span aria-hidden="true" style={{ position: "absolute", inset: 3, background: PLATE, opacity: 0.86 }} />
          <span style={{ position: "relative" }}>{worth}</span>
        </div>
        {hasAction && (
          <div
            style={{
              ...innerBox,
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: desktop ? "var(--space-xl)" : "var(--space-lg)",
            }}
          >
            {actionBody}
          </div>
        )}
      </div>
    </div>
  );

  // Header: the bar, the cut-up headline. Byline + stats are `credentials` (#2120).
  const header = (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          padding: "var(--space-sm) var(--space-md)",
          background: "var(--faction-snide-note-bar)",
        }}
      >
        <span
          style={{
            fontFamily: IMPACT,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: cut-out wordmark size
            fontSize: 20,
            letterSpacing: "0.06em",
            lineHeight: 1,
            textTransform: "uppercase",
            color: "var(--faction-snide-acid)",
          }}
        >
          {eyebrowFaction}
        </span>
        <span
          aria-hidden="true"
          style={{
            flex: 1,
            minWidth: 24,
            height: 3,
            background:
              "repeating-linear-gradient(90deg, var(--faction-snide-acid) 0 6px, transparent 6px 10px)",
          }}
        />
        {isMetatask && (
          <span
            style={{
              fontFamily: BLACK,
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "var(--space-xs) var(--space-sm)",
              transform: "rotate(-2deg)",
              whiteSpace: "nowrap",
              // na → rainbow frame; a real faction → solid hue + on-fill ink.
              ...factionFill(task.metatask_faction_slug, "pill"),
            }}
          >
            {t("detail.meta")}
          </span>
        )}
      </div>

      {/* MUST STAY ONE READABLE STRING: inline flow with real spaces, never a
          flex row (flex drops whitespace children and glues the words, #1023). */}
      <h1
        style={{
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.3,
          margin: "0 0 var(--space-lg)",
        }}
      >
        {task.title.split(/\s+/).map((word, index) => (
          <span key={`${index}-${word}`}>
            {index > 0 ? " " : ""}
            <span
              style={{
                display: "inline-block",
                maxWidth: "100%",
                overflowWrap: "anywhere",
                ...CUTS[(index + task.id) % CUTS.length],
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </h1>

      {isMetatask && (
        <p
          style={{
            ...eyebrow,
            color: PINK_INK,
            margin: "0 0 var(--space-md)",
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
                  borderRadius: "50%",
                  objectFit: "cover",
                  boxShadow: `0 0 0 2px ${INK}`,
                }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  flex: "none",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${INK}`,
                  fontFamily: TYPE,
                  fontSize: "var(--text-lg)",
                  color: INK,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: TYPE,
                fontSize: "var(--text-xl)",
                color: INK,
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
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

      {/* Deliberately no roster. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        {statBlock(t("detail.stats.level"), task.level_required, true)}
        <span
          aria-hidden="true"
          style={{
            width: 2,
            alignSelf: "stretch",
            minHeight: 34,
            background: "var(--faction-snide-note-rule)",
          }}
        />
        {statBlock(t("detail.stats.inProgress"), inProgressCount, false)}
      </div>
    </div>
  );

  // The brief, in full, NOT ONE WORD REDACTED.
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      <div style={{ ...panel, padding: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
        {task.description && (
          <p
            className="content-text"
            style={{
              fontFamily: TYPE,
              lineHeight: 1.55,
              color: PLATE_TEXT,
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {task.description}
          </p>
        )}
      </div>
    </section>
  );

  const gallery = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: IMPACT,
            fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            color: INK,
          }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
        {/* Nothing to sort until something is filed (#1704). */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              // A slab chip, so its edge is acid.
              border: `2px solid var(--faction-snide-acid)`,
              background: PLATE,
            }}
          >
            {(["score", "recent"] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSubmissionSort(sort)}
                style={{
                  cursor: "pointer",
                  border: "none",
                  fontFamily: TYPE,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  padding: "var(--space-sm) var(--space-md)",
                  background:
                    submissionSort === sort ? "var(--faction-snide-note-cta-bg)" : "transparent",
                  color:
                    submissionSort === sort
                      ? "var(--faction-snide-note-cta-ink)"
                      : PLATE_MUTED,
                }}
              >
                {sort === "score"
                  ? t("detail.gallery.sort.top")
                  : t("detail.gallery.sort.recent")}
              </button>
            ))}
          </span>
        )}
      </div>

      {sortedSubmissions.length === 0 ? (
        <p className="content-text" style={{ fontFamily: TYPE, color: MUTED, margin: 0 }}>
          {t("detail.gallery.empty")}
        </p>
      ) : (
        <>
          {/* `snd-detail-praxis` sets the card's `--snd-praxis-*` channel to black
              here only (#2177); `.praxis-gallery` is on every task-detail archetype. */}
          <div className="praxis-gallery snd-detail-praxis flex flex-wrap gap-4 items-start">
            {(showAllPraxis
              ? sortedSubmissions
              : sortedSubmissions.slice(0, GALLERY_PREVIEW)
            ).map((praxis) => (
              <PraxisCard key={praxis.id} praxis={praxis} />
            ))}
          </div>
          {submissions.length > GALLERY_PREVIEW && (
            <button
              onClick={() => setShowAllPraxis((shown) => !shown)}
              style={{
                display: "inline-block",
                marginTop: "var(--space-lg)",
                cursor: "pointer",
                border: "none",
                fontFamily: IMPACT,
                fontSize: "var(--text-content)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: "var(--faction-snide-note-cta-bg)",
                color: "var(--faction-snide-note-cta-ink)",
                padding: "var(--space-sm) var(--space-md)",
                transform: "rotate(-0.8deg)",
              }}
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
    <div
      className="py-8"
      style={{
        ...factionRoleVars("snide", "snd-task"),
        position: "relative",
        fontFamily: TYPE,
        color: INK,
      }}
    >
      {/* Site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The wall paints the column, not the viewport (owner rule, #1055). */}
      <div
        className="snd-detail-sheet"
        style={{
          ...factionBodyVars("snide"),
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: desktop ? "row" : "column",
            alignItems: desktop ? "flex-start" : "stretch",
            gap: "var(--space-xl)",
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
              ...actionColumnSize({ desktop, hasAction, width: 452 }),
              marginTop: desktop ? "var(--space-xl)" : 0,
            }}
          >
            {actionPlate}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {gallery}
          <TaskDetailComments
            state={state}
            heading={sectionHead(t("detail.comments.heading"))}
          />
        </div>
      </div>
    </div>
  );
}
