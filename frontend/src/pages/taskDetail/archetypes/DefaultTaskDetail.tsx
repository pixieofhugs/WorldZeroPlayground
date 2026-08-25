import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionFill, factionName, factionSheet } from "../../../utils/factions";
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
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * Praxis cards the gallery shows before handing off to the full praxis list.
 * The row is `.praxis-gallery`, which narrows `PraxisCard`'s basis to 320px
 * (#1137), so at the 1200 page cap three land in one row and the row reflows on
 * its own below that — no fixed column grid (a `repeat(3,1fr)` would squeeze
 * every card instead of rewrapping). The feed's own 394px basis fitted only two
 * across the ~1136px content column, which is what made this read as a
 * transplanted feed.
 */
const GALLERY_PREVIEW = 3;

/* The na spectrum — the one ornament this whole page is built out of — is now
   `.spectrum-rule` in index.css (#2497). It was this file's own `SPECTRUM`
   const at five mounts, which is a shared value said privately: nothing outside
   could dress it, so Albescent's kit had to walk the DOM to find it. The class
   carries the ramp and each mount keeps its own geometry. */

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
 * the spectrum (task detail v2, #1030; design project 0711d3a7, unvendored
 * by #1039).
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
 *   never reconstructed as `modifiedPoints / basePoints`. The `base` row it sits
 *   in shares that one gate and goes with it, so a neutral task shows the total
 *   alone rather than the same number twice. Since #2554 that selection is
 *   `scoreBreakdown`'s, made inside {@link TaskWorthStamp} off the same raw
 *   factor — the panel no longer owns a second copy of the rule.
 *
 * One responsive component, no mobile twin (ADR-0058): `useFormFactor()` picks
 * the size set and drops the two-column split. The separate mobile skin this
 * replaced was deleted by #1068 when the ADR was accepted.
 *
 * Copy is neutral and shared (`detail.*`, ADR-0057) — no na voice, no faction
 * voice. Dress is na's alone: `--faction-default-*` (rainbow, ring, card sheet)
 * reached via the token / `factionFill`, NOT `factionCssVar`, which is neutral
 * grey for na. The content column carries the page surface itself
 * (`--faction-default-card-bg`); there is no separate backdrop element.
 *
 * ### `worthSlot` — the one presentation seam (#1038)
 *
 * Albescent's task detail is a WRAPPER over this component, not a ninth skin
 * (ADR-0048: `Default` plus a flourish). Its design's single structural delta is
 * that the score readout becomes a turning prism ring. A wrapper cannot
 * restructure what it wraps, so this optional prop lets a caller substitute the
 * ARRANGEMENT of the score readout while everything else stays inherited.
 *
 * It is a slot, not a data channel (ADR-0016): the caller receives no raw slot
 * values — it builds its node from the SAME `TaskDetailState` it forwards here,
 * so the two readouts can never disagree about what a task is worth. Absent, na
 * renders exactly as before; that is why it is optional and why the default
 * {@link scoreBody} stays the only implementation in this file.
 *
 * ### `sheetOverlay` — ornament that has to trace the SHEET (#2549)
 *
 * The second seam, and it exists for a positioning reason rather than an
 * arrangement one. A wrapper can only mount its layers as siblings of this
 * whole component, which puts them in `.py-8`'s box — and that box holds the
 * shared `Breadcrumb` (#2102) as well as the sheet. Albescent's spectrum ring
 * was inset by `--space-2xl` on the assumption that the page band and the sheet
 * began at the same line; once the breadcrumb went in above the sheet they no
 * longer did, and the ring's top corner landed across the trail.
 *
 * So a layer that must trace the sheet has to be a CHILD of the sheet, and only
 * this file can put it there. Rendered first, before any content: the layers are
 * absolutely positioned and carry their own `z-index`, so document order among
 * them does not decide what paints over what — being first simply keeps them out
 * of the content flow and makes the containment assertable.
 *
 * Ornament only. Nothing in this slot may take focus or carry copy; the caller
 * marks it `aria-hidden`.
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
  // The gallery expands in place (the design's own "View all N praxis →" /
  // "Show fewer ↑"). It deliberately does NOT link out to `/praxis?task_id=N`:
  // the reader stays on the task. That URL does filter properly since #1050;
  // before it, the feed read no such param and showed everything.
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
  // Null on a metatask carrying the generic sentinel — the issuer line below the
  // title is that page's one faction statement (#2282). See `headerFactionName`.
  const eyebrowFaction = headerFactionName(task);
  const authorName = task.created_by_display_name ?? "";
  // The cards' own resolver, narrowed to this page's policy (#2554). It is the
  // slot's whole existence test now — `canSignUp` alone could not see the one
  // refusal that is a door.
  const cta = detailSignupCta(state);
  const hasAction =
    !!cta || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

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

  /* THE SCORE READOUT IS THE FACTION'S OWN STAMP NOW (#2554).

     ~80 lines of base row, spectrum-ruled ×mult chip and rainbow total stood
     here — na's SECOND drawing of a score, beside the one
     `DefaultScoreStamp` already draws on every praxis card. The stamp is a
     registered surface (ADR-0049) and size-agnostic by contract, so the panel
     mounts it and the row policy, the ×1.0 gate and the total's format all
     come from the one place that owns them.

     `worthSlot` still wins where a caller passes one: Albescent's prism ring is
     the recorded exception and this seam is how it stays one. */
  const scoreBody = <TaskWorthStamp state={state} />;

  // ── The one action slot: sign up / continue / edit. Nothing renders when the
  //    viewer has no move to make — an unusable control is worse than none.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The CARDS' control, mounted (#2554) — element and affordance from
              `CardCtaControl`, paint and geometry still na's, spread last. */}
          <CardCtaControl cta={cta} testId="task-signup-cta" style={primaryButton}>
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
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
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

  // Score + action, one spectrum-framed panel. 440px on desktop (dress; other
  // factions run 420–520), full width once the column collapses — and only that
  // wide when there IS an action; see `actionColumnSize` (#1138). With the action
  // cell absent the worth cell takes the panel, so the frame never surrounds a
  // hole: on desktop the column has already shrunk to it, on the phone the panel
  // is still the column's width and the cell fills it.
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
        {/* Swatch and word are one statement, so they stand down together —
            a lone spectrum chip before the META pill reads as a stray bullet. */}
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
        // `.label-caption` bare, i.e. `--label-ink` — the same seam every other
        // caption on this page reads (#2077). It printed the metatask faction's
        // spine hue, a FILL colour (§3, #1932), which on this neutral page runs
        // 2.19:1 for the Ephemerists brass and 2.47 / 2.87 for the S.N.I.D.E.
        // acid and Coven pink in light, against the seam's own 7.83:1.
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

  // ── Who and at what level: the byline, the level, the headcount ──
  //
  // Split out of `header` by #2120, which re-sequenced this page in every skin:
  //
  //     breadcrumb · title · description · author/level/headcount · panel
  //
  // Owner's reasoning: the page groups by the question the reader is asking.
  // Title and description answer *what is this*; byline, level and headcount
  // answer *can I, and who else*; the panel answers *do I*. The old order
  // interleaved the first and third and put the second at the top, stating a
  // level requirement before the reader knew what the task was.
  //
  // It was never a content decision — the header and the action column are flex
  // siblings under `flexDirection: desktop ? "row" : "column"`, so on mobile the
  // column stacked the WHOLE panel between the title and the description. The
  // fix is DOM order, which is why desktop's left column re-sequences too: one
  // sequence at both widths, not a page that reorders itself at a breakpoint.
  const credentials = (
    <div>
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
                // `.user-media` marks the region that is the PLAYER's, not the
                // site's, so a faction skin can hold its wash off it (#1646 /
                // #1942). Inert on the other eight — only the Albescent
                // wrappers scope a rule to it. The `initialsOf` monogram below
                // is the site's own furniture and deliberately carries none.
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
        {/* Nothing to sort until something is filed (#1704). The heading and the
            empty line below stay; only the control goes. */}
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
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      <div
        // THE SHEET'S LIFT IS A CLASS, NOT AN INLINE NUMBER (#1942). It still
        // computes to `z-index: 1` for every skin that renders this column —
        // index.css `.task-detail-sheet` says so — but an inline z-index cannot
        // be beaten by a selector, and Albescent needs to clear it: the integer
        // makes this a stacking context, which capped the byline photo and the
        // whole submissions gallery below `.alb-detail-aurora`'s wash. See the
        // `.alb-detail .task-detail-sheet` rule for the whole reasoning.
        className="task-detail-sheet"
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          // The page surface the design puts everything on, carried by the
          // COLUMN rather than the viewport — the owner's rule for this surface
          // is that the site background still shows around the component.
          //
          // This replaced a `<div className="na-backdrop">` full-page wash.
          // NOTE, correcting #1056's commit message and PR body: that PR claimed
          // `.na-backdrop` had no rule behind it. It does — index.css defines it
          // with a dark-mode variant. The claim came from grepping a stale
          // worktree that predated #1049. The change itself was still right (a
          // full-bleed faction wash is not wanted here, and the column needed a
          // surface and padding), but the stated reason was false; do not cite
          // it as precedent for "a class with no CSS".
          ...factionSheet(),
          color: "var(--faction-default-card-text)",
          border: "1px solid var(--faction-default-border)",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          boxSizing: "border-box",
        }}
      >
        {/* Ornament that has to trace THIS box — see `sheetOverlay` in the
            docstring. First child, and inert for every skin that passes none. */}
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
