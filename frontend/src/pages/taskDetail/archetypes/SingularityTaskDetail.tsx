import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import SingularityLamps from "../../../components/factionMarks/SingularityLamps";
import SingularityProcessLight from "../../../components/factionMarks/SingularityProcessLight";
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
import { CardCtaControl } from "../../../components/taskCard/CardCtaControl";
import {
  SINGULARITY_CARD_CTA,
  SINGULARITY_DETAIL_GLOW,
} from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";

/**
 * Singularity task detail (#1034) — the terminal session at page scale: a window
 * with three lamps, phosphor on a near-black chassis, raster, scan sweep, block
 * cursor. Share Tech Mono throughout.
 *
 * Always dark in both themes (WORLD_ZERO_STYLE §6): both halves of
 * `--faction-singularity-term-*` are near-black; the cascade flips the phosphor,
 * never the chassis. One responsive component (ADR-0058). Copy is the neutral
 * `detail.*` set (ADR-0057); the `//`, `>` and cursor are aria-hidden
 * punctuation. Motion lives in index.css under the reduced-motion guard (#911).
 */

const MONO = "var(--sg-task-detail-face)"; /* Share Tech Mono */

const BG = "var(--faction-singularity-term-bg)";
const PANEL = "var(--faction-singularity-term-panel)";
const CHROME = "var(--faction-singularity-term-chrome)";
const INK = "var(--faction-singularity-term-ink)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
const BLUE_BRIGHT = "var(--faction-singularity-term-blue-bright)";
const BORDER = "var(--faction-singularity-term-border)";
const HAIR = "var(--faction-singularity-term-hair)";
const CTA_BG = "var(--faction-singularity-term-cta-bg)";
const CTA_INK = "var(--faction-singularity-term-cta-ink)";

/** Praxis shown before expanding; `.praxis-gallery` fits three per row (#1137). */
const GALLERY_PREVIEW = 3;

const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-md)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Rule({ style }: { style?: CSSProperties }) {
  return (
    <div aria-hidden style={{ height: 0, borderTop: `1px dashed ${HAIR}`, ...style }} />
  );
}

/** The prompt's block cursor; stays drawn (stilled) under reduced motion. */
function Cursor() {
  return (
    <span
      aria-hidden
      className="sg-cursor"
      style={{
        display: "inline-block",
        width: 6,
        height: 13,
        marginLeft: "var(--space-xs)",
        background: "currentColor",
        verticalAlign: "-0.12em",
      }}
    />
  );
}

export default function SingularityTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
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

  const isMetatask = task.task_type === "metatask";
  const eyebrowFaction = headerFactionName(task);
  const cta = detailSignupCta(state);
  const authorName = task.created_by_display_name ?? "";
  const hasAction =
    !!cta || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

  const innerBox: CSSProperties = {
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 5,
    padding: desktop ? "var(--space-lg)" : "var(--space-md)",
    boxSizing: "border-box",
  };
  const panelBox: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    boxSizing: "border-box",
  };
  const primaryButton: CSSProperties = {
    display: "block",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: MONO,
    fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
    letterSpacing: "0.06em",
    color: CTA_INK,
    background: CTA_BG,
    border: `1.5px solid ${BRIGHT}`,
    borderRadius: 5,
    padding: desktop
      ? "var(--space-md) var(--space-lg)"
      : "var(--space-sm) var(--space-md)",
    boxShadow: "var(--faction-singularity-term-cta-glow)",
  };
  /** Punctuation, not copy — hidden from the a11y tree. */
  const prompt = (
    <span aria-hidden style={{ color: "inherit" }}>
      {">"}&nbsp;
    </span>
  );

  /** A commented section head: `// LABEL ------------------ gloss`. */
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
          fontFamily: MONO,
          fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
          color: BLUE_BRIGHT,
        }}
      >
        <span aria-hidden>{"// "}</span>
        {label}
      </span>
      <span aria-hidden style={{ flex: "1 1 20%", minWidth: 20, borderTop: `1px dashed ${HAIR}` }} />
      {gloss !== undefined && <span style={LABEL}>{gloss}</span>}
    </div>
  );

  // Window chrome: the lamps only. Navigation is the shared breadcrumb above (#2102).
  const chrome = (
    <div
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-lg)",
        background: CHROME,
        borderBottom: `1px solid ${HAIR}`,
      }}
    >
      <SingularityLamps />
    </div>
  );

  // Header: faction line, title. Byline + stats are `credentials`, below the brief (#2120).
  const header = (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <SingularityProcessLight />
        <span style={{ ...LABEL, fontSize: "var(--text-base)" }}>{eyebrowFaction}</span>
        {isMetatask && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: 4,
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
          fontFamily: MONO,
          fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
          lineHeight: 1.2,
          color: BRIGHT,
          margin: "0 0 var(--space-lg)",
          overflowWrap: "anywhere",
          textShadow: "var(--faction-singularity-term-halo-green)",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // `DIM` ink, not the issuer's hue: a fill, it fails AA here (#2077).
        <p
          style={{
            ...LABEL,
            margin: "0 0 var(--space-lg)",
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
                  borderRadius: "50%",
                  objectFit: "cover",
                  flex: "none",
                  border: `1px solid ${BORDER}`,
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
                  border: `1px solid ${BORDER}`,
                  fontFamily: MONO,
                  fontSize: "var(--text-lg)",
                  color: BRIGHT,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: MONO,
                fontSize: "var(--text-xl)",
                color: BRIGHT,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={LABEL}>
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Deliberately no roster (owner ruling). */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ ...LABEL, marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.level")}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
              lineHeight: 0.85,
              color: BRIGHT,
            }}
          >
            {String(task.level_required).padStart(2, "0")}
          </span>
        </div>
        <span
          aria-hidden
          style={{ width: 1, alignSelf: "stretch", minHeight: 32, background: HAIR }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ ...LABEL, marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.inProgress")}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 0.85,
              color: BRIGHT,
            }}
          >
            {inProgressCount}
          </span>
        </div>
        <Rule style={{ flex: 1, minWidth: 20, marginBottom: "var(--space-sm)" }} />
      </div>
    </div>
  );

  const scoreBody = <TaskWorthStamp state={state} />;

  // The one action slot. Nothing renders with no move to make.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2642); `primaryButton` is for the exits below. */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={{ ...SINGULARITY_CARD_CTA, ...SINGULARITY_DETAIL_GLOW }}
          >
            {prompt}
            {cta.label}
            <Cursor />
          </CardCtaControl>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-md)",
              lineHeight: 1.65,
              color: DIM,
              marginTop: "var(--space-sm)",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: BRIGHT }}>
                  {t("detail.signup.levelMet", { level: task.level_required })}
                </span>
              </>
            )}
          </div>
          <ErrorBanner
            message={signupError}
            style={{ fontFamily: MONO, background: PANEL, border: `1px solid ${BORDER}` }}
          />
        </div>
      )}

      {mySubmission && (
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-lg)",
              color: BRIGHT,
              marginBottom: "var(--space-md)",
            }}
          >
            {t("detail.submitted.text")}
          </div>
          {/* The READ page, not `/edit`, which bounces a submitted praxis (#1397). */}
          <Link to={`/praxis/${mySubmission.id}`} style={primaryButton}>
            {prompt}
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-lg)",
              color: BRIGHT,
              marginBottom: "var(--space-md)",
            }}
          >
            {t("detail.inProgress.text")}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              flexWrap: "wrap",
            }}
          >
            <Link
              to={`/praxis/${inProgressPraxisId}/edit`}
              style={{
                ...primaryButton,
                flex: 1,
                width: "auto",
                // Outlined, not lit: not the page's one bright action.
                color: BRIGHT,
                background: "transparent",
                boxShadow: "none",
              }}
            >
              {prompt}
              {t("detail.inProgress.continue")}
            </Link>
            <button
              onClick={handleDrop}
              style={{
                fontFamily: MONO,
                fontSize: "var(--text-md)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: DIM,
              }}
            >
              {prompt}
              {t("detail.inProgress.drop")}
            </button>
          </div>
          <ErrorBanner
            message={signupError}
            style={{ fontFamily: MONO, background: PANEL, border: `1px solid ${BORDER}` }}
          />
        </div>
      )}
    </>
  );

  // Readout + action wells. 440px is dress; collapses with no action (#1138).
  const actionPanel = (
    <div
      style={{
        ...panelBox,
        padding: "var(--space-sm)",
        display: "flex",
        flexDirection: "row",
        gap: "var(--space-sm)",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          ...innerBox,
          flex: hasAction ? "0 0 auto" : "1 1 auto",
          minWidth: desktop ? 160 : 118,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {scoreBody}
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
          }}
        >
          {actionBody}
        </div>
      )}
    </div>
  );

  // The brief, in full. No clamp.
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <div style={{ ...panelBox, padding: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
          <p
            className="content-text"
            style={{
              fontFamily: MONO,
              lineHeight: 1.7,
              color: BRIGHT,
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {task.description}
          </p>
        </div>
      )}
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
            fontFamily: MONO,
            fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
            color: BLUE_BRIGHT,
          }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <span
          aria-hidden
          style={{ flex: "1 1 20%", minWidth: 20, borderTop: `1px dashed ${HAIR}` }}
        />
        {/* Nothing to sort until something is filed (#1704). */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              border: `1px solid ${BORDER}`,
              borderRadius: 5,
            }}
          >
            {(["score", "recent"] as const).map((sort) => {
              const on = submissionSort === sort;
              return (
                <button
                  key={sort}
                  onClick={() => setSubmissionSort(sort)}
                  style={{
                    ...LABEL,
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 4,
                    padding: "var(--space-xs) var(--space-sm)",
                    background: on ? BRIGHT : "transparent",
                    color: on ? CTA_INK : DIM,
                  }}
                >
                  {sort === "score"
                    ? t("detail.gallery.sort.top")
                    : t("detail.gallery.sort.recent")}
                </button>
              );
            })}
          </span>
        )}
      </div>

      {sortedSubmissions.length === 0 ? (
        <p
          className="content-text"
          style={{ fontFamily: MONO, color: DIM, margin: 0 }}
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
                fontFamily: MONO,
                fontSize: "var(--text-lg)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: BLUE,
              }}
            >
              {prompt}
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

      <div
        style={{
          /* Roles on the session, not the wrapper: keep them off the neutral breadcrumb (#2675). */
          ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-task-detail"),
          position: "relative",
          overflow: "hidden",
          maxWidth: 1200,
          margin: "0 auto",
          boxSizing: "border-box",
          background: BG,
          color: INK,
          fontFamily: MONO,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: "var(--faction-singularity-term-shadow)",
        }}
      >
        {/* The standing raster. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
            background:
              "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* Scan sweep; `.sg-scan` owns offset and reduced-motion-guarded travel. */}
        <div
          aria-hidden
          className="sg-scan"
          style={{
            position: "absolute",
            left: "-30%",
            right: "-30%",
            height: 40,
            pointerEvents: "none",
            zIndex: 4,
            background: "var(--faction-singularity-term-sweep)",
          }}
        />

        {chrome}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: desktop
              ? "var(--space-2xl) var(--space-2xl) var(--space-3xl)"
              : "var(--space-lg) var(--space-md) var(--space-xl)",
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
                ...actionColumnSize({ desktop, hasAction, width: 440 }),
                marginTop: desktop ? "var(--space-sm)" : 0,
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
        </div>
      </div>
    </div>
  );
}
