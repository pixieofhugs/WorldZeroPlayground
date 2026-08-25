import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { factionRoleVars } from "../../../utils/factionRoles";
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
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * UA (University of Asthmatics) task detail — THE VELLUM LEAF, page-sized
 * (#1036; design project 0711d3a7, unvendored by #1039).
 *
 * The shared v2 anatomy (#1030) in UA's language: a sheet of mesa-sand vellum
 * with a lotus bleeding off the left edge, sienna rules running out from every
 * label, Cormorant Garamond on the title and the numerals, EB Garamond on
 * everything read. Title, then the brief in full, then the byline and the two
 * counts, all beside one 460px action panel that holds the base value, the
 * (usually absent) ×mult badge and the total inside an ensō (#2120). Then the
 * praxis gallery, the discussion.
 *
 * WHAT THIS REPLACES: the 681-line "sheet" archetype built on `ua.*` voice keys
 * (`salonWallHeading`, `critiqueHeading`, `commissionHeading`,
 * `matriculatedHeading`, `finestHand`, `stats.anno/honoraria/onView`). Those
 * `tasks:ua.*` keys are gone: #1039 kept them on the theory the faction pages
 * shared the namespace, #1068's per-key sweep found no reader outside the
 * dormant mobile twin it had just deleted, and the whole namespace went with it.
 * ADR-0057: task detail carries NO faction voice, only the shared neutral
 * `detail.*` copy. Dress is UA's; words are not.
 *
 * THREE CONTRACT POINTS WORTH NOT RE-DERIVING:
 * - **No in-progress roster.** The header's "In progress" count is the only
 *   place that population appears (owner ruling 2026-07-28, reversing epic
 *   #1028 decision 3). The old `HandsRow` of signup portraits is deleted, not
 *   restyled.
 * - **The ×mult badge renders only off the identity factor.** `era_1`
 *   neutralises every faction, so it is invisible today (ADR-0055), and the
 *   factor comes raw off the state contract — never `modifiedPoints /
 *   basePoints` (ADR-0053's dead arithmetic).
 * - **The gallery expands in place.** "View all" is a show-more/show-fewer
 *   toggle, as on na — the reader stays on the task. The old link went to
 *   `/praxis?task_id=N`, which showed the whole feed until #1050 taught it to
 *   filter.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * drops the two-column split. The separate UA mobile skin and the manifest
 * surface that held it were deleted by #1068 when the ADR was accepted;
 * re-adding a dispatcher branch would be drift, not a revert.
 *
 * TWO MARKS, AND THE RESTRAINT IS THE POINT (WORLD_ZERO_STYLE §6). The design
 * draws the ensō five times — the faction line, the points ring, a seal on the
 * sign-up button, a badge on the best-judged praxis, and again in the header.
 * The ensō is reserved for the SCORE and the FACTION MARK, so only those two
 * survive: the 16px mark on the faction line and the ring around the total. A
 * seal on a button is neither. `UaTaskCard` made the same cut for the same
 * reason. The lotus is a different device with its own scope — a ground wash —
 * and it is drawn as the design draws it.
 *
 * Both marks are token-tinted components ({@link Lotus} inline,
 * {@link UaSigil} through a CSS mask), so the design's five `filter:` recolour
 * hacks — including the sign-up seal's `brightness(0) invert(1)` / `brightness(0)`
 * theme flip — have no translation and are simply gone. That is what ADR-0049's
 * "tintable from a token" buys, and it is why there is no ternary anywhere here:
 * both themes arrive through the `[data-theme="dark"]` cascade.
 *
 * NO NEW TOKENS. Every colour is an already-shipped `--faction-ua-*`. The
 * design's `gilt:#A98246` rule-stop is the one value with no home, and that is
 * correct: #853 deleted the legacy gilt-salon family outright and UA's gold went
 * to WOW (#838). The rules run sienna → neutral hairline → transparent instead,
 * which is the same gesture without resurrecting the palette that was killed.
 */

/**
 * Praxis shown before the gallery expands. The row is `.praxis-gallery`, which
 * narrows `PraxisCard`'s basis from the feed's 394px to 320px (#1137), so three
 * land in a row at the 1200 cap instead of two.
 */
const GALLERY_PREVIEW = 3;

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

interface SizeSet {
  /** Action-panel width. UA runs the widest bar but Everymen; dress (§4a). */
  panel: number;
  /** The points ensō, and the lotus wash. Ornament geometry, so raw px. */
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
  // Null on a metatask carrying the generic sentinel (#2282, headerFactionName).
  const eyebrowFaction = headerFactionName(task);
  // The cards' own resolver, narrowed to this page's policy (#2554). It is the
  // slot's whole existence test now — `canSignUp` alone could not see the one
  // refusal that is a door.
  const cta = detailSignupCta(state);
  const authorName = task.created_by_display_name ?? "";
  const hasAction =
    !!cta || !!mySubmission || (isInProgress && inProgressPraxisId !== null);

  const innerBox: CSSProperties = {
    background: "var(--task-detail-paper, var(--faction-ua-card-bg))",
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
    color: "var(--task-detail-on-fill, var(--faction-ua-on-fill))",
    background: "var(--task-detail-fill, var(--faction-ua))",
    border: "1.5px solid var(--faction-ua-card-frame)",
    borderRadius: 5,
    padding: desktop
      ? "var(--space-md) var(--space-xl)"
      : "var(--space-sm) var(--space-lg)",
  };
  /** The quiet note under an action — slots, level, "you're on this task". */
  const aside: CSSProperties = {
    fontFamily: UA_TEXT,
    fontSize: "var(--text-xl)",
    lineHeight: 1.6,
    color: "var(--task-detail-quiet, var(--faction-ua-card-muted))",
  };

  /**
   * The rule that runs out from a label. The design fades sienna → gilt →
   * transparent; UA has no gilt token any more (#853), so it fades into the
   * neutral hairline instead.
   */
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
      <span style={{ ...UA_EYEBROW, color: "var(--task-detail-ink, var(--faction-ua-card-text))" }}>
        {label}
      </span>
      {rule(0.7)}
      {gloss}
    </div>
  );

  /* THE WORTH READOUT IS THE FACTION'S OWN SCORE STAMP NOW (#2554).

     A base row, a ×mult chip, a rule and the `UaEnsoScore` stood here — a SECOND drawing of a score, beside
     the one this faction's registered `scoreStamp` surface (ADR-0049) already
     draws on every praxis card. The stamp is size-agnostic by contract, so the
     panel mounts it and the row policy, the ×1.0 gate and the total's format
     all come from the one place that owns them. */
  const worth = <TaskWorthStamp state={state} />;

  // ── The one action slot. Nothing renders when the viewer has no move to make:
  //    an unusable control is worse than none.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The CARDS' control, mounted (#2554) — element and affordance from
              `CardCtaControl`, paint and geometry still this skin's, spread last. */}
          <CardCtaControl cta={cta} testId="task-signup-cta" style={primaryAction}>
            {cta.label}
          </CardCtaControl>
          <div style={{ ...aside, marginTop: "var(--space-sm)" }}>
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: "var(--task-detail-accent, var(--faction-ua-card-accent))" }}>
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
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
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
                color: "var(--task-detail-quiet, var(--faction-ua-card-muted))",
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

  // The bar: worth + action inside one sienna-bound leaf. 460px on desktop
  // (UA's own value; the family runs 420–520) and only when the viewer has a
  // move — see `actionColumnSize` (#1138). The leaf binds what is there.
  const actionPanel = (
    <div
      style={{
        position: "relative",
        background: "var(--faction-ua-lift)",
        border: "2px solid var(--faction-ua-card-frame)",
        borderRadius: 7,
        padding: "var(--space-xs)",
        boxSizing: "border-box",
        color: "var(--task-detail-ink, var(--faction-ua-card-text))",
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

  // ── Header: breadcrumb, faction line, title ── (byline + the two counts:
  // `credentials`, below the brief — #2120)
  const header = (
    <div>
      {/* The faction line — the mark, then the name resolved from the catalog by
          slug (ADR-0057). The design captions it 'Unbroken Ascension', which is
          not this faction's name and not any faction's name; a shared-copy build
          never reads it. ADR-0050 is the precedent for why that matters. */}
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
          color: "var(--task-detail-ink, var(--faction-ua-card-text))",
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // `UA_EYEBROW`'s own `--faction-ua-card-muted` — 5.45:1 light / 5.64:1
        // dark on this parchment (#2077). The override was the metatask
        // faction's spine hue, a FILL (§3, #1932).
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

  // ── Who and at what level: the byline, the level, the headcount ──
  //
  // Split out of `header` by #2120 so the DESCRIPTION reads between them. See
  // `DefaultTaskDetail` for the whole sequence and why it is this one.
  const credentials = (
    <div>
      {/* The proposing character's byline (#1029). */}
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
                  color: "var(--task-detail-ink, var(--faction-ua-card-text))",
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
                color: "var(--task-detail-ink, var(--faction-ua-card-text))",
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

      {/* Exactly two counts. The completed total lives on the gallery heading,
          and there is deliberately no roster — this is the only place the
          in-progress population appears. */}
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
              color: "var(--task-detail-ink, var(--faction-ua-card-text))",
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
              color: "var(--task-detail-ink, var(--faction-ua-card-text))",
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

  // ── The praxis gallery ──
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
        <span style={{ ...UA_EYEBROW, color: "var(--task-detail-ink, var(--faction-ua-card-text))" }}>
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        {rule(0.7)}
        {/* Nothing to sort until something is filed (#1704). The heading and the
            empty line below stay; only the control goes. */}
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
                    background: on ? "var(--task-detail-fill, var(--faction-ua))" : "transparent",
                    color: on
                      ? "var(--task-detail-on-fill, var(--faction-ua-on-fill))"
                      : "var(--task-detail-quiet, var(--faction-ua-card-muted))",
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
            color: "var(--task-detail-quiet, var(--faction-ua-card-muted))",
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
                color: "var(--task-detail-accent, var(--faction-ua-card-accent))",
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
        /* The nine roles under this surface's prefix (#2659/#2673). The whole
           page is inside this element, including the four style objects built
           above, so every read below resolves against it. */
        ...factionRoleVars("ua", "task-detail"),
        position: "relative",
        fontFamily: UA_TEXT,
        color: "var(--faction-ua-page-text)",
      }}
    >
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The vellum ground belongs to the DETAIL COMPONENT, not the viewport.
          This used to be a `position: fixed; inset: 0` span, which painted UA's
          sand over the whole site — including behind the chrome — and left the
          column itself unpadded, so every line of copy ran to the edge. The
          column now carries its own surface, its own padding and its own lotus,
          and the site background shows around it. */}
      <div
        style={{
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
        {/* The lotus, bleeding off the leaf's own left edge — clipped by the
            column's `overflow: hidden` rather than by the viewport. `zIndex: -1`
            paints it above this column's background but beneath its copy: the
            column is positioned, so it owns the stacking context, and a
            positioned `zIndex: 0` sibling would have sat ON TOP of the static
            text. Ornament geometry stays in raw px (§4a); its opacity is a
            token, so dark mode lifts it through the cascade. */}
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
          {/* Comments — the shared slot, active-task gated (ADR-0006, #1030),
              under UA's own section head so the thread draws no second one. */}
          <TaskDetailComments
            state={state}
            heading={sectionHead(t("detail.comments.heading"))}
          />
        </div>
      </div>
    </div>
  );
}
