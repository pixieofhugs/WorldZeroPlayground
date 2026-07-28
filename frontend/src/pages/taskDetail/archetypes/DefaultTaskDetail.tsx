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
 * Praxis cards the gallery shows before handing off to the full praxis list.
 * `PraxisCard` carries `flex: 1 1 394px`, so at the 1200 page cap three land in
 * one row and the row reflows on its own below that — no fixed column grid
 * (a `repeat(3,1fr)` would squeeze every card instead of rewrapping).
 */
const GALLERY_PREVIEW = 3;

/** The na spectrum, the one ornament this whole page is built out of. */
const SPECTRUM = "var(--faction-default-rainbow)";

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
 * Default / na (Unaffiliated) task detail — the v2 shared anatomy, dressed in
 * the spectrum (design `.design-sync/task-details-v2/default-task-detail.jsx`).
 *
 * This is the REFERENCE implementation of the task-detail contract (#1030):
 * breadcrumb · faction line · title · author row · Level / In progress stats ·
 * action panel (base points + `×mult` badge + total, sign-up / in-progress /
 * submitted state, slots, level-met, {@link LevelJumpBanner},
 * {@link ErrorBanner}) · the full brief with no clamp · the praxis gallery with
 * its sort toggle and view-all · comments. C1–C8 (#1031–#1038) copy this
 * structure and change only the dress.
 *
 * Two contract points worth not re-deriving:
 * - **No in-progress roster.** The header's "In progress" count is the only
 *   place that number appears (owner ruling 2026-07-28, reversing epic #1028
 *   decision 3). The design builds a roster const and never mounts it; that is
 *   dead code, deliberately not ported.
 * - **The `×mult` badge only renders when the factor is not 1.0** — `era_1`
 *   neutralises every faction, so it is invisible today across every skin. That
 *   is correct (ADR-0055), and the factor comes raw off the state contract,
 *   never reconstructed as `modifiedPoints / basePoints`.
 *
 * One responsive component, no mobile twin (ADR-0058): `useFormFactor()` picks
 * the size set and drops the two-column split, and `pages/taskDetail/
 * mobileArchetypes/DefaultTaskDetail.tsx` is dormant, not deleted.
 *
 * Copy is neutral and shared (`detail.*`, ADR-0057) — no na voice, no faction
 * voice. Dress is na's alone: `--faction-default-*` (rainbow, ring, card sheet)
 * reached via the token / `factionFill`, NOT `factionCssVar`, which is neutral
 * grey for na. The full-page `.na-backdrop` wash lives in index.css.
 */
export default function DefaultTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  // The gallery expands in place (the design's own "View all N praxis →" /
  // "Show fewer ↑"). It deliberately does NOT link to `/praxes?task_id=N`: the
  // praxis feed reads no such param, so that link has always dropped the filter
  // and shown the whole feed.
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

  const sheet: CSSProperties = {
    background: "var(--faction-default-card-bg)",
    color: "var(--faction-default-card-text)",
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
        className="eyebrow"
        style={{ letterSpacing: "0.22em", color: "var(--color-text-primary)" }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{
          flex: "1 1 20%",
          minWidth: 20,
          height: 2,
          borderRadius: 1,
          backgroundImage: SPECTRUM,
          opacity: 0.55,
        }}
      />
      {gloss !== undefined && <span className="eyebrow">{gloss}</span>}
    </div>
  );

  // ── Score readout: base, the (usually absent) ×mult badge, and the total ──
  const scoreBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <span className="eyebrow" style={{ letterSpacing: "0.16em" }}>
          {t("detail.points.base")}
        </span>
        <span
          style={{
            fontFamily: "var(--font-accent)",
            fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
            lineHeight: 0.8,
            color: "var(--faction-default-card-text)",
          }}
        >
          {basePoints}
        </span>
        {showMultiplier && (
          <span
            style={{
              marginLeft: "auto",
              display: "block",
              padding: "var(--space-xs)",
              borderRadius: 7,
              backgroundImage: SPECTRUM,
            }}
          >
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-accent)",
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                lineHeight: 0.95,
                letterSpacing: "0.02em",
                color: "var(--faction-default-card-text)",
                background: "var(--color-bg-page)",
                borderRadius: 5,
                padding: "var(--space-xs) var(--space-sm)",
                whiteSpace: "nowrap",
              }}
            >
              {t("detail.points.multiplier", {
                multiplier: factionMultiplier.toFixed(2),
              })}
            </span>
          </span>
        )}
      </div>
      <div aria-hidden style={{ height: 1, backgroundImage: SPECTRUM }} />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-xs)",
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-accent)",
            fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
            lineHeight: 1.02,
            color: "var(--faction-default-card-text)",
          }}
        >
          {modifiedPoints}
        </span>
        <span
          style={{
            fontFamily: "var(--font-accent)",
            fontSize: "var(--text-lg)",
            letterSpacing: "0.06em",
            color: "var(--faction-default-gold)",
          }}
        >
          {t("detail.points.total")}
        </span>
      </div>
    </div>
  );

  // ── The one action slot: sign up / continue / edit. Nothing renders when the
  //    viewer has no move to make — an unusable control is worse than none.
  const actionBody = (
    <>
      {canSignUp && (
        <div>
          <LevelJumpBanner state={state} />
          <button onClick={handleSignup} style={primaryButton}>
            {t("detail.signup.cta")}
          </button>
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
          <Link to={`/praxes/${mySubmission.id}/edit`} style={primaryButton}>
            {t("detail.submitted.edit")}
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
              to={`/praxes/${inProgressPraxisId}/edit`}
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

  // Score + action, one spectrum-framed panel. 440px on desktop (dress; other
  // factions run 420–520), full width once the column collapses.
  const actionPanel = (
    <div
      style={{
        padding: "var(--space-xs)",
        borderRadius: 18,
        backgroundImage: SPECTRUM,
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
        <div style={{ ...innerBox, flex: "0 0 auto", minWidth: desktop ? 168 : 122 }}>
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
    </div>
  );

  // ── Header: breadcrumb, faction line, title, author, stats ──
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
          className="eyebrow"
          style={{
            letterSpacing: "0.2em",
            color: "var(--faction-default-card-accent)",
            textDecoration: "none",
          }}
        >
          {t("detail.breadcrumb.tasks")}
        </Link>
        <span aria-hidden className="eyebrow">
          /
        </span>
        <span className="eyebrow" style={{ letterSpacing: "0.2em" }}>
          {t("detail.breadcrumb.current", { number: task.id })}
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
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            flex: "none",
            backgroundImage: SPECTRUM,
          }}
        />
        <span
          className="eyebrow"
          style={{ fontSize: "var(--text-base)", letterSpacing: "0.2em" }}
        >
          {factionName(slug)}
        </span>
        {isMetatask && (
          <span
            className="font-body"
            style={{
              fontSize: "var(--text-xs)",
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
        <p
          className="eyebrow"
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

      {/* Author row — the proposing character's byline (#1029). */}
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
          <span className="eyebrow">
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Header stats. The design draws exactly two — the completed count lives
          on the gallery heading, and there is deliberately no roster. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span className="eyebrow" style={{ marginBottom: "var(--space-xs)" }}>
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
          <span className="eyebrow" style={{ marginBottom: "var(--space-xs)" }}>
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

  // ── The brief, in full. No clamp, no "read more". ──
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

  // ── Praxis gallery ──
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
          className="eyebrow"
          style={{ letterSpacing: "0.22em", color: "var(--color-text-primary)" }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <span
          aria-hidden
          style={{
            flex: "1 1 20%",
            minWidth: 20,
            height: 2,
            borderRadius: 1,
            backgroundImage: SPECTRUM,
            opacity: 0.55,
          }}
        />
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
              className="eyebrow"
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
      </div>

      {sortedSubmissions.length === 0 ? (
        <p className="font-body content-text" style={{ color: "var(--color-text-tertiary)" }}>
          {t("detail.gallery.empty")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 items-start">
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
                color: "var(--faction-default-card-accent)",
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
      {/* Full-page spectrum wash — the na "all paths open" backdrop (index.css,
          shared with DefaultProfile #969). */}
      <div className="na-backdrop" aria-hidden />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
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
              flex: desktop ? "0 0 440px" : "1 1 auto",
              width: desktop ? 440 : "100%",
              marginTop: desktop ? "var(--space-sm)" : 0,
            }}
          >
            {actionPanel}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {brief}
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
