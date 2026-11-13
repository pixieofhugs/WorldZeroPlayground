import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import { Lotus } from "../../../components/factionMarks";
import { UaSigil } from "../../../components/sigil/UaSigil";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  uaShade,
} from "../../../components/factionMarks/uaAtoms";
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
import { UA_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * UA task detail — the vellum leaf, page-sized (#1036): mesa-sand vellum, a
 * lotus off the left edge, sienna rules, Cormorant/EB Garamond. Contract is
 * `DefaultTaskDetail`'s; one responsive component (ADR-0058).
 *
 * The ensō is reserved for the SCORE and the FACTION MARK (WORLD_ZERO_STYLE §6);
 * no seal on buttons. Marks are token-tinted, so no `filter:` hacks or theme
 * ternaries. No gilt: that family is deleted (#853); rules fade into the hairline.
 */

/** Praxis shown before expanding; `.praxis-gallery` fits three per row (#1137). */
const GALLERY_PREVIEW = 3;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface SizeSet {
  /** Action-panel width; dress (§4a). */
  panel: number;
  /** Ornament geometry, so raw px. */
  enso: number;
  lotus: number;
  lotusLeft: number;
  lotusTop: number;
  title: string;
  level: string;
  count: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    panel: 460,
    enso: 124,
    lotus: 880,
    lotusLeft: -230,
    lotusTop: -110,
    title: "var(--text-display)",
    level: "var(--text-heading)",
    count: "var(--text-title)",
  },
  mobile: {
    panel: 0,
    enso: 104,
    lotus: 560,
    lotusLeft: -200,
    lotusTop: 40,
    title: "var(--text-heading)",
    level: "var(--text-title)",
    count: "var(--text-content)",
  },
};

export default function UaTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[formFactor];
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
    background: "var(--leaf-task-detail-paper)",
    border: "1px solid var(--faction-ua-rule)",
    borderRadius: 5,
    padding: desktop ? "var(--space-lg)" : "var(--space-md)",
    boxSizing: "border-box",
  };
  /** The practice's one saturated note. Fill + on-fill: 4.59:1 / 5.59:1. */
  const primaryAction: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: UA_DISPLAY,
    fontWeight: 600,
    fontSize: desktop ? "var(--text-content)" : "var(--text-xl)",
    letterSpacing: "0.02em",
    color: "var(--leaf-task-detail-on-fill)",
    background: "var(--leaf-task-detail-fill)",
    border: "1.5px solid var(--faction-ua-card-frame)",
    borderRadius: 5,
    padding: desktop
      ? "var(--space-md) var(--space-xl)"
      : "var(--space-sm) var(--space-lg)",
  };
  const aside: CSSProperties = {
    fontFamily: UA_TEXT,
    fontSize: "var(--text-xl)",
    lineHeight: 1.6,
    color: "var(--leaf-task-detail-quiet)",
  };

  /** The rule running out from a label: sienna → hairline → transparent. */
  const rule = (opacity: number) => (
    <span
      aria-hidden
      style={{
        flex: "1 1 20%",
        minWidth: 20,
        height: 1,
        opacity,
        background:
          "linear-gradient(90deg, var(--faction-ua-card-frame), var(--faction-ua-rule) 55%, transparent)",
      }}
    />
  );

  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ ...UA_EYEBROW, color: "var(--leaf-task-detail-ink)" }}>
        {label}
      </span>
      {rule(0.7)}
      {gloss}
    </div>
  );

  const worth = <TaskWorthStamp state={state} />;

  // The one action slot. Nothing renders with no move to make.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2642); `primaryAction` is for the exits below. */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={UA_CARD_CTA}
          >
            {cta.label}
          </CardCtaControl>
          <div style={{ ...aside, marginTop: "var(--space-sm)" }}>
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: "var(--leaf-task-detail-accent)" }}>
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
          <div style={{ ...aside, marginBottom: "var(--space-sm)" }}>
            {t("detail.submitted.text")}
          </div>
          {/* The READ page, not `/edit`, which bounces a submitted praxis (#1397). */}
          <Link to={`/praxis/${mySubmission.id}`} style={primaryAction}>
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
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                flex: "none",
                borderRadius: "50%",
                background: "var(--faction-ua-glow)",
              }}
            />
            <span style={{ ...aside, fontStyle: "italic" }}>
              {t("detail.inProgress.text")}
            </span>
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
              style={{ ...primaryAction, flex: 1, width: "auto" }}
            >
              {t("detail.inProgress.continue")}
            </Link>
            <button
              onClick={handleDrop}
              style={{
                fontFamily: UA_TEXT,
                fontStyle: "italic",
                fontSize: "var(--text-lg)",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--faction-ua-rule)",
                cursor: "pointer",
                padding: 0,
                color: "var(--leaf-task-detail-quiet)",
              }}
            >
              {t("detail.inProgress.drop")}
            </button>
          </div>
          <ErrorBanner message={signupError} />
        </div>
      )}
    </>
  );

  // Worth + action in one sienna-bound leaf; 460px only with a move (#1138).
  const actionPanel = (
    <div
      style={{
        position: "relative",
        background: "var(--faction-ua-lift)",
        border: "2px solid var(--faction-ua-card-frame)",
        borderRadius: 7,
        padding: "var(--space-xs)",
        boxSizing: "border-box",
        color: "var(--leaf-task-detail-ink)",
        boxShadow: `0 16px 44px -30px ${uaShade(52)}`,
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
            ...innerBox,
            flex: hasAction ? "0 0 auto" : "1 1 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: desktop ? 176 : undefined,
          }}
        >
          {worth}
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
    </div>
  );

  // Header: faction line, title. Byline + stats are `credentials`, below the brief (#2120).
  const header = (
    <div>
      {/* Faction name from the catalog by slug (ADR-0057), never the design's caption. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <UaSigil width={16} height={16} />
        <span style={{ ...UA_EYEBROW, fontSize: "var(--text-base)" }}>
          {eyebrowFaction}
        </span>
        {isMetatask && (
          <span
            style={{
              fontFamily: UA_TEXT,
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: 4,
              // The pinned faction's own fill, never UA's — that is the seal.
              ...factionFill(task.metatask_faction_slug, "pill"),
            }}
          >
            {t("detail.meta")}
          </span>
        )}
      </div>

      <h1
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 700,
          fontSize: size.title,
          lineHeight: 1.08,
          letterSpacing: "-0.015em",
          margin: 0,
          marginBottom: "var(--space-md)",
          color: "var(--leaf-task-detail-ink)",
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // `UA_EYEBROW`'s ink, not the issuer's hue: a fill, it fails AA (#2077).
        <p
          style={{
            ...UA_EYEBROW,
            marginTop: 0,
            marginBottom: "var(--space-md)",
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
            gap: "var(--space-sm)",
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
                  boxShadow: "0 0 0 1.5px var(--faction-ua-card-frame)",
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
                  fontFamily: UA_DISPLAY,
                  fontWeight: 700,
                  fontSize: "var(--text-lg)",
                  background: "var(--faction-ua-panel)",
                  color: "var(--leaf-task-detail-ink)",
                  boxShadow: "0 0 0 1.5px var(--faction-ua-card-frame)",
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: UA_TEXT,
                fontSize: "var(--text-xl)",
                color: "var(--leaf-task-detail-ink)",
                borderBottom: "1px solid var(--faction-ua-rule)",
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={UA_EYEBROW}>
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Deliberately no roster. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ ...UA_EYEBROW, marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.level")}
          </span>
          <span
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 700,
              fontSize: size.level,
              lineHeight: 0.9,
              color: "var(--leaf-task-detail-ink)",
            }}
          >
            {task.level_required}
          </span>
        </div>
        <span
          aria-hidden
          style={{
            width: 1,
            alignSelf: "stretch",
            minHeight: 34,
            background: "var(--faction-ua-rule)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ ...UA_EYEBROW, marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.inProgress")}
          </span>
          <span
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 700,
              fontSize: size.count,
              lineHeight: 0.9,
              color: "var(--leaf-task-detail-ink)",
            }}
          >
            {inProgressCount}
          </span>
        </div>
      </div>
    </div>
  );

  // The brief, in full. No clamp.
  const brief = (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <div
          style={{
            background: "var(--faction-ua-lift)",
            border: "1px solid var(--faction-ua-hair)",
            borderRadius: 6,
            padding: desktop ? "var(--space-xl)" : "var(--space-lg)",
          }}
        >
          <p
            className="content-text"
            style={{
              fontFamily: UA_TEXT,
              lineHeight: 1.72,
              color: "var(--faction-ua-card-body)",
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
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ ...UA_EYEBROW, color: "var(--leaf-task-detail-ink)" }}>
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        {rule(0.7)}
        {/* Nothing to sort until something is filed (#1704). */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              border: "1px solid var(--faction-ua-rule)",
              borderRadius: 6,
            }}
          >
            {(["score", "recent"] as const).map((sort) => {
              const on = submissionSort === sort;
              return (
                <button
                  key={sort}
                  onClick={() => setSubmissionSort(sort)}
                  style={{
                    ...UA_EYEBROW,
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 4,
                    padding: "var(--space-xs) var(--space-sm)",
                    background: on ? "var(--leaf-task-detail-fill)" : "transparent",
                    color: on
                      ? "var(--leaf-task-detail-on-fill)"
                      : "var(--leaf-task-detail-quiet)",
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
          style={{
            fontFamily: UA_TEXT,
            color: "var(--leaf-task-detail-quiet)",
            margin: 0,
          }}
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
                fontFamily: UA_TEXT,
                fontStyle: "italic",
                fontSize: "var(--text-xl)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--leaf-task-detail-accent)",
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
        position: "relative",
        fontFamily: UA_TEXT,
        color: "var(--faction-ua-page-text)",
      }}
    >
      {/* Site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The vellum paints the column, not the viewport. */}
      <div
        style={{
          /* Roles on the column, not the wrapper: keep them off the neutral breadcrumb (#2673). */
          ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-task-detail"),
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          background: "var(--faction-ua-page)",
          border: "1px solid var(--faction-ua-rule)",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Clipped by the column's overflow. `zIndex: -1` inside the column's
            stacking context: above its background, beneath the static copy. */}
        <Lotus
          size={size.lotus}
          color="var(--faction-ua-card-lotus)"
          style={{
            position: "absolute",
            left: size.lotusLeft,
            top: size.lotusTop,
            zIndex: -1,
            opacity: "var(--faction-ua-card-lotus-opacity)",
            pointerEvents: "none",
          }}
        />
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
              ...actionColumnSize({ desktop, hasAction, width: size.panel }),
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
  );
}
