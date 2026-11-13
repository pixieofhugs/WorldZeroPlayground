import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { EverymenCog } from "../../../components/factionMarks/everymenCogs";
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
import { EVERYMEN_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/** Praxis shown before "view all"; `.praxis-gallery` fits three per row (#1137). */
const GALLERY_PREVIEW = 3;

// The sheet's palette — see the "broadsheet sheet" block in index.css.
const INK = "var(--everymen-paper-text)";
const PAPER_DEEP = "var(--everymen-paper-deep)";
/** The plate the action panel and its boxes sit on. */
const PANEL = "var(--faction-everymen-sheet-panel)";
const MUTED = "var(--everymen-muted)";
/** Red as a RULE or a FILL. For red as text, use {@link ACCENT}. */
const RED = "var(--everymen-red)";
/** Red as INK — the only red that clears AA on the panel in both themes. */
const ACCENT = "var(--faction-everymen-sheet-accent)";
const OLIVE = "var(--everymen-muted)";
/** The masthead bar, theme-INVARIANT: a bill printed at night is the same bill. */
const MAST = "var(--faction-everymen-bill-mast)";
const MAST_INK = "var(--faction-everymen-bill-mast-ink)";
/** The frame rule. NOT `--everymen-ink`, which vanishes on the dark sheet. */
const FRAME = "var(--everymen-frame)";
const HAIR = "var(--faction-everymen-sheet-hair)";
const SHADOW = "var(--faction-everymen-bill-shadow)";

const BEBAS = "var(--font-accent)";
const COURIER = "var(--faction-everymen-body-font)";

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
 * The Everymen task detail — the shared anatomy printed as a union broadsheet
 * (#1033): newsprint under a rising sun, red masthead bar flanked by cogs, Bebas
 * over Courier, dashed red rules. Contract (order #2120, no roster, raw ×mult,
 * in-place gallery, neutral `detail.*` copy) is `DefaultTaskDetail`'s.
 * One responsive component, no mobile twin (ADR-0058).
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

  const label: CSSProperties = {
    fontFamily: BEBAS,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  };
  const plateBox: CSSProperties = {
    background: PANEL,
    border: `2px solid ${FRAME}`,
    borderRadius: 2,
    padding: desktop ? "var(--space-lg)" : "var(--space-md)",
    boxSizing: "border-box",
  };
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
      <EverymenCog size={14} fill={RED} hub={PANEL} />
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

  // Header: masthead, title. Byline + stats are `credentials`, below the brief (#2120).
  const header = (
    <div>
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
        <EverymenCog size={14} fill={MAST_INK} hub={MAST} />
        <span
          style={{ ...label, fontSize: "var(--text-content)", color: MAST_INK }}
        >
          {eyebrowFaction}
        </span>
        <EverymenCog size={14} fill={MAST_INK} hub={MAST} />
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
              fontWeight: 700,
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
        // Bare `.label-caption` ink, not the issuer's hue: a fill, it fails AA (#2077).
        <p
          className="label-caption"
          style={{
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

      {/* Deliberately no roster. */}
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

  const wageBox = <TaskWorthStamp state={state} />;

  // The one action slot. Nothing renders with no move to make.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2642); `primaryBar` is for the exits below. */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={EVERYMEN_CARD_CTA}
          >
            {cta.label}
          </CardCtaControl>
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
            <EverymenCog size={13} fill={OLIVE} hub={PANEL} />
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
          {/* The READ page, not `/edit`, which bounces a submitted praxis (#1397). */}
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
            <EverymenCog size={13} fill={OLIVE} hub={PANEL} />
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
              // Underline, not line-through: struck text reads as unavailable (#2214).
              textDecoration: "underline",
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

  // The action plate: wage box + CTA. 520 on desktop is dress; collapses with
  // no CTA (`actionColumnSize`, #1138).
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

  // The brief, in full. No clamp.
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
      {/* Nothing to sort until something is filed (#1704). */}
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
      {/* Site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The sheet paints the column, not the viewport (owner rule, #1055). */}
      <div
        className="em-broadsheet"
        style={{
          ...factionBodyVars("everymen"),
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
        {/* The faction's one ornament, shared (#2195). `z-index: -1` inside the
            sheet's stacking context: above the newsprint, below the unpositioned copy. */}
        <div aria-hidden="true" className="em-burst" style={{ zIndex: -1 }} />
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
              ...actionColumnSize({ desktop, hasAction, width: 520 }),
              marginTop: desktop ? "var(--space-2xl)" : 0,
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
