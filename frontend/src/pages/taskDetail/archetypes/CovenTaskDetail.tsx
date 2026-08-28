import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { CovenCat, SLIP_SHEET } from "../../../components/factionMarks/covenSlip";
import { CovenSigil } from "../../../components/sigil/CovenSigil";
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
import { COVEN_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * Cozy Coven — THE CANDLELIT WARD (task detail v2, #1031).
 *
 * The spell slip opened out to a full page: a cat watermark turns slowly behind
 * the copy, braided thread rules head every section, and the points are held on
 * a 452px action plate. Grenze Gotisch
 * carries the display, Cormorant Garamond the numerals and the brief, Caveat the
 * hand, Quicksand the chrome — the same four faces the v2 task card (#1023)
 * established for this faction.
 *
 * THE COLUMN WEARS THE SLIP (#2135), where it wore the candlelight haze and its
 * four drifting blooms. Owner ruling, 2026-08-17: the task card's sheet is the
 * iconic coven look, and the surfaces around the card should wear it. The panels
 * on top stay `ward-card` — a dark panel on a pink sheet is the intended
 * reading, and the score plate in particular has to stay a distinct object on a
 * page whose job is showing a score.
 *
 * This REPLACES the `whimsy.exe` desktop-window archetype wholesale, along with
 * every word of Coven's own detail vocabulary (`spellsHeading`, `loveHeading`,
 * `partyHeading`, `sort.mostLoved`, `sparks`, `window`). Per ADR-0057 this
 * surface carries NO faction voice: all copy comes from the shared `detail.*`
 * keys, identical to what an unaffiliated player reads. The dress is Coven's;
 * the words are the game's. The `tasks:coven.*` namespace is gone: #1039 kept it
 * on the theory the faction pages read it, #1068's per-key sweep found no reader
 * outside the dormant mobile twin it had just deleted, and the namespace went
 * with it.
 *
 * Contract points inherited from the na reference build (#1030), not re-derived:
 * - **No in-progress roster.** The header's "In progress" count is the only
 *   place that population appears (owner ruling 2026-07-28, reversing epic
 *   #1028 decision 3). The design's own header comment says the same.
 * - **The `×mult` badge renders only off the identity factor.** `era_1`
 *   neutralises every faction, so it is invisible today — correct, per ADR-0055.
 *   The factor arrives raw on the state contract; it is never reconstructed as
 *   `modifiedPoints / basePoints` (ADR-0053's dead-arithmetic trap).
 * - **The gallery expands in place.** Reading a task's proof shouldn't bounce
 *   you to the feed. (`/praxis?task_id=N` dropped its filter entirely until
 *   #1050 taught `usePraxes` to read the param; the in-place expand is the
 *   ruling either way.)
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * drops the two-column split. The separate Coven mobile skin and the manifest
 * surface that held it were deleted by #1068 when the ADR was accepted.
 *
 * All colour via `--faction-coven-slip-*` (shared with the task card) plus the
 * `--faction-coven-ward-*` family this surface adds; the braid, the wheel and
 * the aura's flicker live in index.css so the light/dark flip and the
 * reduced-motion guard run through the cascade, never a ternary. The haze went
 * with the wash it drifted (#2135).
 */

const CHROME = "var(--font-faction-rounded)"; /* Quicksand */
const READING = "var(--font-faction-serif)"; /* Cormorant Garamond */
const HAND = "var(--font-faction-script)"; /* Caveat */
const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch */

const INK = "var(--faction-coven-slip-ink)";
const DEEP = "var(--faction-coven-slip-deep)";
const SOFT = "var(--faction-coven-slip-soft)";
const LABEL = "var(--faction-coven-slip-label)";
const GOLD = "var(--faction-coven-slip-gold)";
const BORDER = "var(--faction-coven-slip-border)";
const CARD = "var(--faction-coven-ward-card)";
const PAGE = "var(--faction-coven-ward-page)";

/**
 * Praxis cards the gallery shows before the in-place expand. The row is
 * `.praxis-gallery`, which narrows `PraxisCard`'s basis to 320px (#1137), so
 * three land in one row at the 1200 cap and the row reflows itself below that —
 * the design's `repeat(3,1fr)` would squeeze every card instead of rewrapping.
 * The feed's own 394px basis fitted only two across the content column.
 */
const GALLERY_PREVIEW = 3;

interface SizeSet {
  /** Action-plate width. Coven's is 452 — dress, not a shared constant. */
  plate: number;
  /** The ward disc. Geometry (WORLD_ZERO_STYLE §4a). */
  ward: number;
  /** Left cell of the plate, wide enough to hold the ward plus its inset. */
  worthMin: number;
  titleSize: string;
  headingSize: string;
  statSize: string;
  substatSize: string;
  wardSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    plate: 452,
    ward: 120,
    worthMin: 182,
    titleSize: "var(--text-display)",
    headingSize: "var(--text-title)",
    statSize: "var(--text-heading)",
    substatSize: "var(--text-title)",
    wardSize: "var(--text-heading)",
  },
  mobile: {
    plate: 452,
    ward: 96,
    worthMin: 148,
    titleSize: "var(--text-heading)",
    headingSize: "var(--text-title)",
    statSize: "var(--text-title)",
    substatSize: "var(--text-content)",
    wardSize: "var(--text-title)",
  },
};

/** Small-caps caption voice — every label on the slip speaks in it. */
const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: LABEL,
};

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

/** The braided thread rule. `.cvn-braid` owns the strands' pigments (index.css). */
function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />;
}


export default function CovenTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[formFactor];
  // The gallery expands in place. It deliberately does NOT link out to
  // `/praxis?task_id=N` — the reader stays on the task. That URL does filter
  // properly since #1050; before it, it silently showed the whole feed.
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

  const eyebrow: CSSProperties = { ...CAPTION, fontSize: "var(--text-md)" };
  const innerBox: CSSProperties = {
    background: PAGE,
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };
  const panel: CSSProperties = {
    background: CARD,
    border: `2px solid ${BORDER}`,
    borderRadius: 16,
    boxSizing: "border-box",
    boxShadow: "var(--faction-coven-slip-shadow)",
  };
  /** The pink CTA band — the slip's own call to action, ink already measured. */
  const pinkButton: CSSProperties = {
    display: "block",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: CHROME,
    fontWeight: 700,
    fontSize: "var(--text-lg)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--faction-coven-slip-cta-ink)",
    background:
      "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))",
    border: "1.5px solid var(--faction-coven-slip-cta-to)",
    borderRadius: 12,
    padding: "var(--space-md) var(--space-lg)",
  };
  /** The candle-gold band: you already hold this task. Never the pink one. */
  const goldButton: CSSProperties = {
    ...pinkButton,
    color: "var(--faction-coven-ward-hold-ink)",
    background: `linear-gradient(180deg, ${GOLD}, var(--faction-coven-ward-hold-to))`,
    border: "1.5px solid var(--faction-coven-ward-hold-border)",
  };

  /** Display label, braided rule, optional gloss — the page's only section head. */
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
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: size.headingSize,
          lineHeight: 1.06,
          letterSpacing: "0.02em",
          color: INK,
        }}
      >
        {label}
      </span>
      <Braid style={{ flex: 1 }} />
      {gloss !== undefined && <span style={{ ...eyebrow, flex: "0 0 auto" }}>{gloss}</span>}
    </div>
  );

  /* THE WORTH READOUT IS THE FACTION'S OWN SCORE STAMP NOW (#2554).

     A base row, a gradient ×mult lozenge and the candlelit `Ward` stood here — a SECOND drawing of a score, beside
     the one this faction's registered `scoreStamp` surface (ADR-0049) already
     draws on every praxis card. The stamp is size-agnostic by contract, so the
     panel mounts it and the row policy, the ×1.0 gate and the total's format
     all come from the one place that owns them. */
  const worth = <TaskWorthStamp state={state} />;

  // ── The one action slot: sign up / continue / edit. Nothing renders when the
  //    viewer has no move to make — an unusable control is worse than none.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The CARDS' control, mounted (#2554) — and since #2642 the cards'
              PAINT too: one constant, spread by `CovenTaskCard` and by this
              page, with `size` carrying the only difference between them.
              `pinkButton` stays: `goldButton`, the "you already hold this"
              band, is composed from it. */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={COVEN_CARD_CTA}
          >
            {cta.label}
          </CardCtaControl>
          <div
            style={{
              fontFamily: READING,
              fontStyle: "italic",
              fontSize: "var(--text-content)",
              lineHeight: 1.5,
              color: SOFT,
              marginTop: "var(--space-sm)",
              textAlign: "center",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                {/* The action cell is an `innerBox`, i.e. the ward PAGE ground
                    inside the panel — so this emphasis takes INK (#1295). */}
                <span style={{ color: INK }}>
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
              fontFamily: HAND,
              fontSize: "var(--text-title)",
              lineHeight: 1,
              color: INK,
              marginBottom: "var(--space-md)",
            }}
          >
            {t("detail.submitted.text")}
          </div>
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
          <Link to={`/praxis/${mySubmission.id}`} style={goldButton}>
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            style={{
              fontFamily: HAND,
              fontSize: "var(--text-title)",
              lineHeight: 1,
              color: INK,
              marginBottom: "var(--space-md)",
            }}
          >
            {t("detail.inProgress.text")}
          </div>
          <Link to={`/praxis/${inProgressPraxisId}/edit`} style={goldButton}>
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
              textAlign: "center",
              fontFamily: READING,
              fontStyle: "italic",
              fontSize: "var(--text-content)",
              color: SOFT,
            }}
          >
            {t("detail.inProgress.drop")}
          </button>
          <ErrorBanner message={signupError} />
        </div>
      )}
    </>
  );

  // The action plate: the slip's gradient, holding two inset boxes. 452px on
  // desktop (Coven's own value; the family runs 420–520), full width once the
  // column collapses — and 452 only when the viewer has a move; see
  // `actionColumnSize` (#1138). Alone, the worth box takes the slip, so the
  // gradient is never a wide sticker with one small box on it.
  const actionPlate = (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: `2px solid ${BORDER}`,
        boxShadow: "var(--faction-coven-slip-shadow)",
        background:
          "linear-gradient(158deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 38%, var(--faction-coven-slip-lav) 76%, var(--faction-coven-slip-vio))",
        padding: "var(--space-sm)",
        display: "flex",
        gap: "var(--space-sm)",
        alignItems: "stretch",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          ...innerBox,
          flex: hasAction ? "0 0 auto" : "1 1 auto",
          minWidth: size.worthMin,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
  );

  // ── Header: breadcrumb, faction line, title ── (byline + stats: `credentials`, below the brief — #2120)
  const stat = (label: string, value: ReactNode, valueSize: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
      <span style={eyebrow}>{label}</span>
      <span style={{ fontFamily: READING, fontWeight: 600, fontSize: valueSize, lineHeight: 0.85, color: INK }}>
        {value}
      </span>
    </div>
  );

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
        <CovenSigil size={30} color={DEEP} />
        <span style={{ ...eyebrow, fontSize: "var(--text-base)" }}>{eyebrowFaction}</span>
        {isMetatask && (
          <span
            style={{
              fontFamily: CHROME,
              fontWeight: 700,
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: 20,
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
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: size.titleSize,
          lineHeight: 1.06,
          letterSpacing: "0.005em",
          margin: 0,
          marginBottom: "var(--space-lg)",
          color: INK,
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // The byline reads THIS page's label ink, not the metatask faction's
        // spine hue (#2077). `eyebrow` already carries `LABEL`, the ink every
        // other caption on this ground wears; the override was a foreign
        // faction's FILL colour (§3, #1932) landing on the ward page — eight
        // hues against eight archetype grounds, and the identity is carried by
        // the faction's NAME in the copy either way.
        <p
          style={{
            ...eyebrow,
            marginTop: 0,
            marginBottom: "var(--space-md)",
          }}
        >
          {t("detail.metataskIssuer", { faction: factionName(task.metatask_faction_slug) })}
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
                  border: `2px solid ${BORDER}`,
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
                  fontFamily: CHROME,
                  fontWeight: 700,
                  fontSize: "var(--text-md)",
                  background: CARD,
                  border: `2px solid ${BORDER}`,
                  color: LABEL,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: HAND,
                fontSize: "var(--text-content)",
                lineHeight: 1,
                color: INK,
                borderBottom: `2px solid ${BORDER}`,
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={eyebrow}>{t("detail.author", { level: task.created_by_level ?? 0 })}</span>
        </div>
      )}

      {/* Header stats. Exactly two — and deliberately no roster: this count is
          the only place the in-progress population appears. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        {stat(t("detail.stats.level"), task.level_required, size.statSize)}
        <span
          aria-hidden
          style={{
            width: 1,
            alignSelf: "stretch",
            minHeight: 34,
            background: "var(--faction-coven-ward-hair)",
          }}
        />
        {stat(t("detail.stats.inProgress"), inProgressCount, size.substatSize)}
      </div>
    </div>
  );

  // ── The brief, in full. No clamp, no "read more". ──
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      <div style={{ ...panel, padding: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
        {task.description && (
          <p
            className="content-text"
            style={{
              fontFamily: READING,
              fontStyle: "italic",
              lineHeight: 1.6,
              color: SOFT,
              whiteSpace: "pre-wrap",
              margin: 0,
              textWrap: "pretty",
            }}
          >
            {task.description}
          </p>
        )}
        <Braid style={{ marginTop: "var(--space-lg)" }} />
      </div>
    </section>
  );

  // ── Praxis gallery ──
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
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: size.headingSize,
            lineHeight: 1.06,
            letterSpacing: "0.02em",
            color: INK,
          }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <Braid style={{ flex: 1 }} />
        {/* Nothing to sort until something is filed (#1704). The heading and the
            empty line below stay; only the control goes. */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              background: CARD,
            }}
          >
            {(["score", "recent"] as const).map((sort) => {
              const on = submissionSort === sort;
              return (
                <button
                  key={sort}
                  onClick={() => setSubmissionSort(sort)}
                  style={{
                    ...CAPTION,
                    fontSize: "var(--text-md)",
                    letterSpacing: "0.14em",
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 8,
                    padding: "var(--space-xs) var(--space-sm)",
                    color: on ? "var(--faction-coven-slip-cta-ink)" : LABEL,
                    background: on
                      ? "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))"
                      : "transparent",
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
          style={{ fontFamily: READING, fontStyle: "italic", color: SOFT, margin: 0 }}
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
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: "var(--text-content)",
                // The gallery is unpanelled, so this control sits on the ward
                // PAGE and takes INK rather than DEEP (#1295).
                color: INK,
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
    <div className="py-8" style={{ position: "relative", color: INK, fontFamily: CHROME }}>
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* THE COLUMN WEARS THE SLIP (#2135). It wore `.coven-candle-backdrop`,
          the near-black ward wash with four drifting blooms, until the owner
          ruled that the sheet the task card wears is the iconic coven look and
          the surfaces around it should wear it too. `SLIP_SHEET` is `covenSlip`'s
          one copy of the four-stop ramp — the card, the praxis card and both
          detail columns now read it rather than each retyping it.

          The class STAYS in index.css: `CovenFieldDesk` grounds a whole mobile
          page on it, so this is a change of consumer, not a deletion.

          The ground still belongs to the COLUMN, not the viewport (QA on #1055,
          applied to every skin) — the site background shows around it. The clip
          below is this file's own and predates the swap; it stays because the
          numbers under it were chosen against it. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          background: SLIP_SHEET,
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 1,
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
              ...actionColumnSize({ desktop, hasAction, width: size.plate }),
              maxWidth: "100%",
              marginTop: desktop ? "var(--space-sm)" : 0,
            }}
          >
            {actionPlate}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          {gallery}
          {/* The cat watermark, turning once every two minutes (#2041 — it was a
              pentagram, and the swap is `covenSlip`'s because five Coven
              surfaces turn the same mark). `.cvn-wheel` still carries the motion
              and its reduced-motion guard (#911/#1023).

              IT COMES TO THE BOTTOM (#2135) — one placement rule on every mount,
              which is #2041's "not two different drawings" a level up. It was
              `right: 24, top: 120`.

              THE ANCHOR IS THE GALLERY REGION, which is why the discussion
              moved out into a block of its own below rather than staying in
              here: the sheet's true bottom-right is behind the comment
              composer, which paints an opaque `ward-card` panel and would
              swallow the mark. This is the lowest point on the page it is still
              visible at. `right: 24` is unchanged and is what keeps the whole
              face on the sheet at both widths. (It read BRIEF-AND-GALLERY until
              #2120 moved the brief up into the header column; the anchor is
              `bottom: 0`, so losing a block off the TOP of this wrapper leaves
              the mark exactly where it was.)

              `zIndex: -1` puts it back UNDER the copy: this wrapper IS a
              stacking context (position + z-index), so the negative index lands
              behind its in-flow blocks and still over the sheet's ground. */}
          <CovenCat
            size={desktop ? 400 : 240}
            style={{ right: 24, bottom: 0, opacity: 0.09, zIndex: -1 }}
          />
        </div>

        <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          <TaskDetailComments state={state} heading={sectionHead(t("detail.comments.heading"))} />
        </div>
      </div>
    </div>
  );
}
