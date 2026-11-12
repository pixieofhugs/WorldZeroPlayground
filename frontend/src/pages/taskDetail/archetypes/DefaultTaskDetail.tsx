import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import {
  factionFill,
  factionName,
  factionSheet,
} from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
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
import { DEFAULT_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * Praxis cards shown before "view all". `.praxis-gallery` narrows the card basis
 * to 320px (#1137) so three fit at the 1200 cap and the row reflows below that;
 * no fixed grid (`repeat(3,1fr)` would squeeze instead of rewrap).
 */
const GALLERY_PREVIEW = 3;

/* The na spectrum ornament is `.spectrum-rule` in index.css (#2497); each mount
   keeps its own geometry. */

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
 * Default / na task detail: the REFERENCE implementation of the task-detail
 * contract (#1030). Other skins copy this structure and change only the dress.
 *
 * - No in-progress roster: the header count is the only place it appears
 *   (owner ruling 2026-07-28).
 * - The `×mult`/base rows show only when the factor is not 1.0 (ADR-0055); the
 *   factor comes raw off state, never `modifiedPoints / basePoints`. Selection
 *   lives in `scoreBreakdown` via {@link TaskWorthStamp} (#2554).
 *
 * One responsive component, no mobile twin (ADR-0058). Copy is shared `detail.*`
 * (ADR-0057). Dress is `--faction-default-*` via token / `factionFill`, NOT
 * `factionCssVar` (neutral grey for na).
 *
 * `worthSlot` (#1038): Albescent wraps this (ADR-0048) and swaps only the score
 * readout's arrangement. A slot, not a data channel (ADR-0016): the caller builds
 * it from the same state, so the readouts cannot disagree.
 *
 * `sheetOverlay` (#2549): ornament that must trace the sheet has to be its CHILD;
 * a sibling layer sits in `.py-8`, which also holds the Breadcrumb. Rendered
 * first; layers are absolute with their own z-index. Ornament only: no focus, no
 * copy; caller marks it `aria-hidden`.
 */
export default function DefaultTaskDetail({
  state,
  worthSlot,
  sheetOverlay,
}: {
  state: TaskDetailState;
  /** Replaces the base/`×mult`/total readout with the caller's arrangement. */
  worthSlot?: ReactNode;
  /** Absolutely-positioned ornament mounted INSIDE the sheet, so it traces it. */
  sheetOverlay?: ReactNode;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  // Expands in place; deliberately does not link out to `/praxis?task_id=N`.
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

  if (!task) return null;

  const isMetatask = task.task_type === "metatask";
  // Null on a generic metatask; the issuer line is then the faction statement (#2282).
  const eyebrowFaction = headerFactionName(task);
  const authorName = task.created_by_display_name ?? "";
  // The cards' resolver (#2554); also the action slot's existence test.
  const cta = detailSignupCta(state);
  const hasAction =
    !!cta || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

  const sheet: CSSProperties = {
    background: "var(--na-task-detail-paper)",
    color: "var(--na-task-detail-ink)",
  };
  const innerBox: CSSProperties = {
    background: "var(--color-bg-page)",
    border: "1px solid var(--faction-default-border)",
    borderRadius: 11,
    padding: desktop ? "var(--space-lg)" : "var(--space-md)",
    boxSizing: "border-box",
  };
  const primaryButton: CSSProperties = {
    display: "block",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: desktop ? "var(--text-content)" : "var(--text-xl)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--color-bg-page)",
    background: "var(--color-text-primary)",
    border: "1px solid var(--color-text-primary)",
    borderRadius: 10,
    padding: desktop
      ? "var(--space-lg) var(--space-xl)"
      : "var(--space-md) var(--space-lg)",
  };

  /** A spectrum hairline that runs out from a label — the page's only rule. */
  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span
        className="label-heading"
        style={{ letterSpacing: "0.22em", color: "var(--color-text-primary)" }}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="spectrum-rule"
        style={{
          flex: "1 1 20%",
          minWidth: 20,
          height: 2,
          borderRadius: 1,
          opacity: 0.55,
        }}
      />
      {gloss !== undefined && <span className="label-caption">{gloss}</span>}
    </div>
  );

  // The faction's own score stamp (ADR-0049, #2554); `worthSlot` overrides.
  const scoreBody = <TaskWorthStamp state={state} />;

  // Sign up / continue / edit. Nothing renders when the viewer has no move.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2554, #2642); `size` is the only
              difference. `primaryButton` is for the two exits below. */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={DEFAULT_CARD_CTA}
          >
            {cta.label}
          </CardCtaControl>
          <div
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-sm)",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: "var(--color-success)" }}>
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
            className="font-body"
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-sm)",
            }}
          >
            {t("detail.submitted.text")}
          </div>
          {/* The read page, not `/edit` (#1397): `/edit` redirects a submitted
              praxis back to `/praxis/:id` (#1164). */}
          <Link to={`/praxis/${mySubmission.id}`} style={primaryButton}>
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            className="font-body"
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-sm)",
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
              style={{ ...primaryButton, flex: 1, width: "auto" }}
            >
              {t("detail.inProgress.continue")}
            </Link>
            <button
              onClick={handleDrop}
              className="font-body"
              style={{
                fontSize: "var(--text-md)",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--color-border)",
                cursor: "pointer",
                padding: 0,
                color: "var(--color-text-secondary)",
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

  // Width rules in `actionColumnSize` (#1138). With no action the worth cell
  // fills the panel so the frame never surrounds a hole.
  const actionPanel = (
    <div
      className="spectrum-rule"
      style={{
        padding: "var(--space-xs)",
        borderRadius: 18,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          ...sheet,
          borderRadius: 14,
          padding: "var(--space-sm)",
          boxSizing: "border-box",
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
            minWidth: desktop ? 168 : 122,
          }}
        >
          {worthSlot ?? scoreBody}
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

  // Faction line + title; byline/stats are `credentials`, below the brief (#2120).
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
        {/* Swatch and word stand down together; a lone chip reads as a bullet. */}
        {eyebrowFaction && (
          <>
            <span
              aria-hidden
              className="spectrum-rule"
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                flex: "none",
              }}
            />
            <span className="label-caption">{eyebrowFaction}</span>
          </>
        )}
        {isMetatask && (
          <span
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: 4,
              fontWeight: 600,
              // na → rainbow frame; a real faction → solid hue + on-fill ink.
              ...factionFill(task.metatask_faction_slug, "pill"),
            }}
          >
            {t("detail.meta")}
          </span>
        )}
      </div>

      <h1
        className="font-display italic"
        style={{
          fontWeight: 600,
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.12,
          letterSpacing: "-0.01em",
          margin: 0,
          marginBottom: "var(--space-md)",
          color: "var(--color-text-primary)",
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // Bare `--label-ink` (#2077): a faction spine hue is a fill colour and
        // fails contrast on this neutral page (#1932).
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

  // Byline, level, headcount. Order (#2120, every skin): title · description ·
  // credentials · panel — "what is this", "can I", "do I". Set by DOM order so
  // both widths share one sequence.
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
                // Player media: skins keep their wash off it (#1646). The
                // monogram below is site furniture and deliberately has none.
                className="user-media"
                src={mediaUrl(task.created_by_avatar_url)}
                alt={authorName}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flex: "none",
                  boxShadow: "0 0 0 2px var(--color-border)",
                }}
              />
            ) : (
              <span
                aria-hidden
                className="font-display"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  flex: "none",
                  borderRadius: "50%",
                  overflow: "hidden",
                  fontWeight: 600,
                  fontSize: "var(--text-lg)",
                  background: "var(--color-bg-page)",
                  color: "var(--color-text-primary)",
                  boxShadow: "0 0 0 2px var(--color-border)",
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              className="font-display"
              style={{
                fontWeight: 600,
                fontSize: "var(--text-xl)",
                color: "var(--color-text-primary)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {authorName}
            </span>
          </Link>
          <span className="label-caption">
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Exactly two stats; the completed count is on the gallery heading. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span className="label-caption" style={{ marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.level")}
          </span>
          <span
            className="font-display"
            style={{
              fontWeight: 600,
              fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
              lineHeight: 0.9,
              color: "var(--color-text-primary)",
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
            background: "var(--color-border)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span className="label-caption" style={{ marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.inProgress")}
          </span>
          <span
            className="font-display"
            style={{
              fontWeight: 600,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 0.9,
              color: "var(--color-text-primary)",
            }}
          >
            {inProgressCount}
          </span>
        </div>
      </div>
    </div>
  );

  // The brief in full: no clamp.
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <p
          className="font-body content-text"
          style={{
            lineHeight: 1.75,
            color: "var(--color-text-primary)",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {task.description}
        </p>
      )}
    </section>
  );

  const gallery = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        <span
          className="label-heading"
          style={{ letterSpacing: "0.22em", color: "var(--color-text-primary)" }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <span
          aria-hidden
          className="spectrum-rule"
          style={{
            flex: "1 1 20%",
            minWidth: 20,
            height: 2,
            borderRadius: 1,
            opacity: 0.55,
          }}
        />
        {/* No sort control until something is filed (#1704). */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          >
            {(["score", "recent"] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSubmissionSort(sort)}
                className="label-caption"
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderRadius: 6,
                  padding: "var(--space-xs) var(--space-sm)",
                  background:
                    submissionSort === sort ? "var(--color-text-primary)" : "transparent",
                  color:
                    submissionSort === sort
                      ? "var(--color-bg-page)"
                      : "var(--color-text-tertiary)",
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
        <p className="font-body content-text" style={{ color: "var(--color-text-tertiary)" }}>
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
              className="font-body"
              style={{
                display: "inline-block",
                marginTop: "var(--space-md)",
                padding: 0,
                fontSize: "var(--text-lg)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--na-task-detail-accent)",
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
    <div className="py-8" style={{ position: "relative" }}>
      {/* Shared site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      <div
        // z-index lives in the class, not inline, so Albescent's selector can
        // beat it (#1942); see `.alb-detail .task-detail-sheet`.
        className="task-detail-sheet"
        style={{
          // Role map on the sheet, not `.py-8`, which also holds the neutral
          // Breadcrumb (#2672). Pinned to na: `factionSheet()` takes no slug
          // (#2361).
          ...factionRoleVars("na", "na-task-detail"),
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          // Surface on the column, not the viewport: the site background shows
          // around it (owner rule).
          ...factionSheet(),
          color: "var(--na-task-detail-ink)",
          border: "1px solid var(--faction-default-border)",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          boxSizing: "border-box",
        }}
      >
        {/* See `sheetOverlay` in the docstring. */}
        {sheetOverlay}

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
  );
}
