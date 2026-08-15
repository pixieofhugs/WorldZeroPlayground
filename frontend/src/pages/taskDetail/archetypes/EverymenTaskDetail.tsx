import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionCssVar, factionFill, factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import {
  actionColumnSize,
  ErrorBanner,
  LevelJumpBanner,
  showWorthBreakdown,
  TaskDetailComments,
} from "./shared";
import { signupCtaKey } from "../signupCta";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * How many praxis the gallery prints before the "view all" line. The row is
 * `.praxis-gallery`, which narrows `PraxisCard`'s basis to 320px (#1137), so
 * three land in a row at the 1200 cap and the row rewraps on its own below that
 * — the design's `repeat(3,1fr)` grid would squeeze every card instead (same
 * call as the na reference, #1030). The feed's own 394px basis fitted two.
 */
const GALLERY_PREVIEW = 3;

// ── The sheet's palette. Every value is a token; see the "broadsheet sheet"
//    block in index.css for which of these are new and which the Everymen
//    family already owned.
/** The sheet's text ink — flips with the theme (`#221a12` → `#f3e7ce`). */
const INK = "var(--everymen-paper-text)";
/** The newsprint the whole page is printed on. */
const PAPER_DEEP = "var(--everymen-paper-deep)";
/** The pasted-on sheet: the plate the action panel and its boxes sit on. */
const PANEL = "var(--faction-everymen-sheet-panel)";
const MUTED = "var(--everymen-muted)";
/** Red as a RULE or a FILL. For red as text, use {@link ACCENT}. */
const RED = "var(--everymen-red)";
/** Red as INK — the only red that clears AA on the panel in both themes. */
const ACCENT = "var(--faction-everymen-sheet-accent)";
const OLIVE = "var(--everymen-olive)";
const GOLD = "var(--everymen-gold)";
/** Gold walked down until the modifier badge's figures clear the paper. */
const MULT_INK = "var(--faction-everymen-bill-mult-ink)";
/** The masthead bar, theme-INVARIANT: a bill printed at night is the same bill. */
const MAST = "var(--faction-everymen-bill-mast)";
const MAST_INK = "var(--faction-everymen-bill-mast-ink)";
/** The frame rule. NOT `--everymen-ink`, which vanishes on the dark sheet. */
const FRAME = "var(--everymen-frame)";
const HAIR = "var(--faction-everymen-sheet-hair)";
const SHADOW = "var(--faction-everymen-bill-shadow)";

const BEBAS = "var(--font-accent)";
const COURIER = "var(--font-body)";

// ── The cog, the union's one glyph. Eight teeth around a hub, generated once at
//    module load rather than per render: it is a constant, and the arithmetic is
//    the design's own (a hand-written path would drift from it silently).
const GEAR_TEETH = 8;
const GEAR_RADIUS = 9.5;
const GEAR_TIP_LENGTH = 5;
const GEAR_TIP_HALF = 1.6;
const GEAR_ROOT_HALF = 2.6;

function buildGearPath(): string {
  const point = (radius: number, angle: number): string =>
    `${12 + radius * Math.cos(angle)},${12 + radius * Math.sin(angle)}`;
  const step = (Math.PI * 2) / GEAR_TEETH;
  const tipRadius = GEAR_RADIUS + GEAR_TIP_LENGTH;
  let path = "";
  for (let tooth = 0; tooth < GEAR_TEETH; tooth++) {
    const start = tooth * step;
    const rootBefore = point(GEAR_RADIUS, start - GEAR_ROOT_HALF / GEAR_RADIUS);
    const tipBefore = point(tipRadius, start - GEAR_TIP_HALF / tipRadius);
    const tipAfter = point(tipRadius, start + GEAR_TIP_HALF / tipRadius);
    const rootAfter = point(GEAR_RADIUS, start + GEAR_ROOT_HALF / GEAR_RADIUS);
    const nextRoot = point(
      GEAR_RADIUS,
      start + step - GEAR_ROOT_HALF / GEAR_RADIUS,
    );
    path += `${tooth === 0 ? "M" : "L"}${rootBefore}L${tipBefore}L${tipAfter}L${rootAfter}`;
    path += `A${GEAR_RADIUS},${GEAR_RADIUS} 0 0 1 ${nextRoot}`;
  }
  return `${path}Z`;
}

const GEAR_PATH = buildGearPath();

/** The union cog. Ornament only — every caller marks it aria-hidden. */
function Gear({
  size,
  fill,
  hole,
}: {
  size: number;
  fill: string;
  hole: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path d={GEAR_PATH} fill={fill} />
      <circle cx="12" cy="12" r="3" fill={hole} />
    </svg>
  );
}

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

/**
 * The Everymen task detail — the v2 shared anatomy printed as a UNION
 * BROADSHEET (#1033; design project 0711d3a7, unvendored by #1039).
 *
 * Newsprint with rising-sun rays fanning up from the bottom edge; a red masthead
 * bar flanked by cogs; Bebas Neue headlines over a Courier Prime dispatch;
 * dashed red rules between everything; the points struck as a rubber stamp.
 *
 * Anatomy is #1030's contract, unchanged and in its order — breadcrumb ·
 * masthead · title · author byline · Level / In-progress stats · action plate
 * (base + the usually-absent `×mult` badge + the stamped total, sign-up /
 * in-progress / submitted, slots, level-met, {@link LevelJumpBanner},
 * {@link ErrorBanner}) · the brief in full · the praxis gallery with its sort
 * toggle · comments. Only the dress is the Everymen's.
 *
 * Four contract points worth not re-deriving:
 * - **No in-progress roster.** The header's count is the only place that number
 *   appears (owner ruling 2026-07-28, reversing epic #1028 decision 3). The
 *   design's own header comment already said "No roster section."
 * - **The `×mult` badge renders only off a non-identity factor** (ADR-0055),
 *   taken raw from the state contract — never reconstructed as
 *   `modifiedPoints / basePoints`, which is ADR-0053's dead-arithmetic trap.
 *   `era_1` neutralises every faction, so it is invisible today.
 * - **The gallery expands in place.** It does NOT link out to
 *   `/praxis?task_id=N` — the reader stays on the task. The old Everymen build
 *   carried that link back when the feed read no such param and silently showed
 *   everything; the URL filters properly since #1050.
 * - **Copy is the shared neutral `detail.*` set** (ADR-0057). The union voice
 *   this page used to speak — "The Order", "Hands On The Job", "The Hall's
 *   Verdict", "Report for duty ▸", "Best in Hall" — is retired from this
 *   surface. #1039 kept `tasks:everymen.*` alive on the theory that the faction
 *   pages read it; #1068's per-key sweep found no such reader (the faction pages
 *   speak `factions:`) once the dormant mobile twin was gone, so the whole
 *   namespace is deleted and this page's copy is the neutral set only.
 *
 * One responsive component, no mobile twin (ADR-0058): `useFormFactor()` picks
 * the size set and collapses the two-column split. The separate Everymen mobile
 * skin was deleted by #1068 when the ADR was accepted.
 */
export default function EverymenTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
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
  const showBreakdown = showWorthBreakdown(factionMultiplier);
  const authorName = task.created_by_display_name ?? "";
  const hasAction =
    canSignUp || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

  // ── Shared dress ──
  /** Bebas, tracked out and struck in caps — every label on the sheet. */
  const label: CSSProperties = {
    fontFamily: BEBAS,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  };
  /** A pasted-on sheet: panel stock inside the printed frame rule. */
  const plateBox: CSSProperties = {
    background: PANEL,
    border: `2px solid ${FRAME}`,
    borderRadius: 2,
    padding: desktop ? "var(--space-lg)" : "var(--space-md)",
    boxSizing: "border-box",
  };
  /** The dashed red rule the broadsheet separates everything with. */
  const dashRule = (marginBottom?: string) => (
    <div
      aria-hidden
      style={{ borderTop: `2px dashed ${RED}`, marginBottom }}
    />
  );
  const primaryBar: CSSProperties = {
    display: "block",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    background: MAST,
    color: MAST_INK,
    border: `2px solid ${MAST}`,
    borderRadius: 2,
    ...label,
    fontSize: desktop ? "var(--text-content)" : "var(--text-xl)",
    letterSpacing: "0.16em",
    padding: desktop
      ? "var(--space-md) var(--space-lg)"
      : "var(--space-sm) var(--space-md)",
  };

  /** Cog · label · dashed rule running out to an optional gloss. */
  const sectionHead = (heading: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <Gear size={14} fill={RED} hole={PANEL} />
      <span
        style={{
          ...label,
          fontSize: "var(--text-xl)",
          letterSpacing: "0.2em",
          color: INK,
        }}
      >
        {heading}
      </span>
      <span
        aria-hidden
        style={{
          flex: "1 1 20%",
          minWidth: 20,
          height: 0,
          borderTop: `2px dashed ${RED}`,
        }}
      />
      {gloss}
    </div>
  );

  // ── Header: breadcrumb, masthead, title, byline, stats ──
  //
  // One crumb, not two: the trail read `TASKS / Task №{id}` until #1124 retired
  // the task id, and the id WAS the second crumb, so the separator went with it
  // rather than dangling.
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
        <Link
          to="/tasks"
          className="label-caption"
          style={{
            color: ACCENT,
            textDecoration: "none",
          }}
        >
          {t("detail.breadcrumb.tasks")}
        </Link>
      </nav>

      {/* The masthead — the faction line, set as the paper's nameplate. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-lg)",
          marginBottom: "var(--space-lg)",
          background: MAST,
          border: `2px solid ${FRAME}`,
          boxShadow: `inset 0 -6px 0 -4px ${PAPER_DEEP}`,
        }}
      >
        <Gear size={14} fill={MAST_INK} hole={MAST} />
        <span
          style={{ ...label, fontSize: "var(--text-content)", color: MAST_INK }}
        >
          {factionName(slug)}
        </span>
        <Gear size={14} fill={MAST_INK} hole={MAST} />
      </div>

      {isMetatask && (
        <div style={{ marginBottom: "var(--space-md)" }}>
          <span
            className="font-body"
            style={{
              display: "inline-block",
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: 2,
              fontWeight: 600,
              ...factionFill(task.metatask_faction_slug, "pill"),
            }}
          >
            {t("detail.meta")}
          </span>
        </div>
      )}

      <h1
        style={{
          fontFamily: BEBAS,
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 0.94,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: INK,
          margin: 0,
          marginBottom: "var(--space-sm)",
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        <p
          className="label-caption"
          style={{
            marginTop: 0,
            marginBottom: "var(--space-md)",
            color: factionCssVar(task.metatask_faction_slug),
          }}
        >
          {t("detail.metataskFor", {
            faction: factionName(task.metatask_faction_slug),
          })}
        </p>
      )}

      {/* Byline — the character who proposed the job (#1029). */}
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
                  border: `2px solid ${FRAME}`,
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
                  background: PANEL,
                  border: `2px solid ${FRAME}`,
                  fontFamily: BEBAS,
                  fontSize: "var(--text-lg)",
                  color: ACCENT,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: BEBAS,
                fontSize: "var(--text-content)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: INK,
                borderBottom: `2px solid ${RED}`,
              }}
            >
              {authorName}
            </span>
          </Link>
          <span className="label-caption" style={{ color: MUTED }}>
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {dashRule("var(--space-md)")}

      {/* Header stats. Level and the in-progress count — the completed figure
          heads the gallery, and there is deliberately no roster. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              ...label,
              fontSize: "var(--text-base)",
              color: OLIVE,
              marginBottom: "var(--space-xs)",
            }}
          >
            {t("detail.stats.level")}
          </span>
          <span
            style={{
              fontFamily: BEBAS,
              fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
              lineHeight: 0.86,
              color: INK,
            }}
          >
            {task.level_required}
          </span>
        </div>
        <span
          aria-hidden
          style={{
            width: 2,
            alignSelf: "stretch",
            minHeight: 32,
            background: HAIR,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              ...label,
              fontSize: "var(--text-base)",
              color: OLIVE,
              marginBottom: "var(--space-xs)",
            }}
          >
            {t("detail.stats.inProgress")}
          </span>
          <span
            style={{
              fontFamily: BEBAS,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 0.86,
              color: INK,
            }}
          >
            {inProgressCount}
          </span>
        </div>
      </div>
    </div>
  );

  // ── The wage box: base, the (usually absent) ×mult badge, the stamped total ──
  const wageBox = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
      }}
    >
      {/* The docket line and its perforation go together (#1704): with no
          modifier to itemise it only restated the stamped total below. */}
      {showBreakdown && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}
          >
            <span className="label-caption" style={{ color: MUTED }}>
              {t("detail.points.base")}
            </span>
            <span
              style={{
                fontFamily: BEBAS,
                fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
                lineHeight: 0.8,
                color: INK,
              }}
            >
              {basePoints}
            </span>
            <span
              style={{
                marginLeft: "auto",
                ...label,
                fontSize: desktop ? "var(--text-content)" : "var(--text-xl)",
                letterSpacing: "0.04em",
                color: MULT_INK,
                border: `2px solid ${GOLD}`,
                borderRadius: 2,
                padding: "var(--space-xs) var(--space-sm)",
                whiteSpace: "nowrap",
              }}
            >
              {t("detail.points.multiplier", {
                multiplier: factionMultiplier.toFixed(2),
              })}
            </span>
          </div>
          {dashRule()}
        </>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
        }}
      >
        {/* The rubber stamp: the figure struck through a double-ringed roundel,
            landed slightly off-square the way a hand stamp does. */}
        <div
          style={{
            position: "relative",
            flex: "0 0 auto",
            width: desktop ? 74 : 64,
            height: desktop ? 74 : 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-4deg)",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${RED}`,
              boxShadow: `inset 0 0 0 3px ${PANEL}, inset 0 0 0 4px ${RED}`,
            }}
          />
          <span
            style={{
              fontFamily: BEBAS,
              fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
              lineHeight: 0.8,
              color: ACCENT,
            }}
          >
            {modifiedPoints}
          </span>
          <span
            style={{
              ...label,
              fontSize: "var(--text-md)",
              letterSpacing: "0.22em",
              color: ACCENT,
              marginTop: "var(--space-xs)",
            }}
          >
            {t("detail.points.total")}
          </span>
        </div>
      </div>
    </div>
  );

  // ── The one action slot. Nothing renders when the viewer has no move to make:
  //    an unusable control is worse than none.
  const actionBody = (
    <>
      {canSignUp && (
        <div>
          <LevelJumpBanner state={state} />
          <button onClick={handleSignup} style={primaryBar}>
            {t(signupCtaKey(task.signup_reason))}
          </button>
          <div
            style={{
              fontFamily: COURIER,
              fontSize: "var(--text-md)",
              lineHeight: 1.6,
              color: MUTED,
              marginTop: "var(--space-sm)",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: OLIVE }}>
                  {t("detail.signup.levelMet", { level: task.level_required })}
                </span>
              </>
            )}
          </div>
          <ErrorBanner
            message={signupError}
            style={{
              background: "var(--everymen-red-light)",
              border: `2px solid ${RED}`,
              color: ACCENT,
            }}
          />
        </div>
      )}

      {mySubmission && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              marginBottom: "var(--space-sm)",
            }}
          >
            <Gear size={13} fill={OLIVE} hole={PANEL} />
            <span
              style={{
                fontFamily: COURIER,
                fontSize: "var(--text-lg)",
                color: MUTED,
              }}
            >
              {t("detail.submitted.text")}
            </span>
          </div>
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
          <Link to={`/praxis/${mySubmission.id}`} style={primaryBar}>
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              marginBottom: "var(--space-sm)",
            }}
          >
            <Gear size={13} fill={OLIVE} hole={PANEL} />
            <span
              style={{
                fontFamily: COURIER,
                fontSize: "var(--text-lg)",
                color: MUTED,
              }}
            >
              {t("detail.inProgress.text")}
            </span>
          </div>
          <Link to={`/praxis/${inProgressPraxisId}/edit`} style={primaryBar}>
            {t("detail.inProgress.continue")}
          </Link>
          <button
            onClick={handleDrop}
            style={{
              display: "block",
              width: "100%",
              marginTop: "var(--space-sm)",
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: COURIER,
              fontSize: "var(--text-md)",
              color: MUTED,
              textAlign: "center",
              textDecoration: "line-through",
            }}
          >
            {t("detail.inProgress.drop")}
          </button>
          <ErrorBanner
            message={signupError}
            style={{
              background: "var(--everymen-red-light)",
              border: `2px solid ${RED}`,
              color: ACCENT,
            }}
          />
        </div>
      )}
    </>
  );

  // The action plate — a sheet pasted onto the newsprint, holding the wage box
  // and the CTA side by side. 520 on desktop: the widest panel in the set, which
  // is dress (the others run 420–460) — and it is only that wide when there IS a
  // CTA beside the wage; see `actionColumnSize` (#1138). Alone, the wage box
  // takes the sheet, which is also what it already did on the phone.
  const actionPlate = (
    <div
      style={{
        background: PAPER_DEEP,
        border: `2px solid ${FRAME}`,
        borderRadius: 2,
        padding: "var(--space-xs)",
        boxShadow: SHADOW,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: desktop ? "row" : "column",
          gap: "var(--space-xs)",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            ...plateBox,
            flex: desktop && hasAction ? "0 0 auto" : "1 1 auto",
            minWidth: desktop ? 156 : 0,
          }}
        >
          {wageBox}
        </div>
        {hasAction && (
          <div
            style={{
              ...plateBox,
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {actionBody}
          </div>
        )}
      </div>
    </div>
  );

  // ── The brief, in full. No clamp, no "read more". ──
  const brief = (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <p
          className="content-text"
          style={{
            fontFamily: COURIER,
            lineHeight: 1.78,
            color: INK,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {task.description}
        </p>
      )}
    </section>
  );

  // ── The filed praxis ──
  const sortToggle = (
    <span
      style={{
        display: "flex",
        gap: "var(--space-xs)",
        padding: "var(--space-xs)",
        border: `2px solid ${FRAME}`,
        background: PANEL,
      }}
    >
      {(["score", "recent"] as const).map((sort) => {
        const on = submissionSort === sort;
        return (
          <button
            key={sort}
            onClick={() => setSubmissionSort(sort)}
            style={{
              cursor: "pointer",
              border: "none",
              ...label,
              fontSize: "var(--text-md)",
              letterSpacing: "0.14em",
              padding: "var(--space-xs) var(--space-sm)",
              background: on ? RED : "transparent",
              color: on ? MAST_INK : MUTED,
            }}
          >
            {sort === "score"
              ? t("detail.gallery.sort.top")
              : t("detail.gallery.sort.recent")}
          </button>
        );
      })}
    </span>
  );

  const gallery = (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {/* Nothing to sort until something is filed (#1704) — the heading keeps
          its rule and the empty line below stays; only the control goes. */}
      {sectionHead(
        t("detail.gallery.heading", { count: submissions.length }),
        sortedSubmissions.length > 0 ? sortToggle : undefined,
      )}

      {sortedSubmissions.length === 0 ? (
        <p
          className="content-text"
          style={{ fontFamily: COURIER, color: MUTED }}
        >
          {t("detail.gallery.empty")}
        </p>
      ) : (
        <>
          <div className="praxis-gallery flex flex-wrap gap-4 items-start">
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
                marginTop: "var(--space-md)",
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: COURIER,
                fontSize: "var(--text-lg)",
                color: ACCENT,
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
    <div className="py-8" style={{ position: "relative", color: INK }}>
      {/* The sheet itself — newsprint under a rising sun (index.css). It paints
          the detail COLUMN, not the viewport: the owner's rule for this surface
          is that the site background still shows around the component (QA on
          #1055, applied to every skin). Was `position: fixed; inset: 0`. */}
      <div
        className="em-broadsheet"
        style={{
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
          <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
          <div
            style={{
              ...actionColumnSize({ desktop, hasAction, width: 520 }),
              marginTop: desktop ? "var(--space-2xl)" : 0,
            }}
          >
            {actionPlate}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {brief}
          {gallery}
          {/* Comments — the shared slot, active-task gated (ADR-0006, #1030),
              under the sheet's own dressed section head. */}
          <TaskDetailComments
            state={state}
            heading={sectionHead(t("detail.comments.heading"))}
          />
        </div>
      </div>
    </div>
  );
}
