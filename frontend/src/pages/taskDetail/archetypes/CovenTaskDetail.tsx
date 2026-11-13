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
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * Cozy Coven task detail (#1031): the spell slip opened out to a page. The column
 * wears the card's slip sheet (#2135, owner ruling); panels stay `ward-card` so
 * the score plate reads as a distinct object.
 *
 * Copy is shared `detail.*` only, no faction voice (ADR-0057). Contract points
 * as in `DefaultTaskDetail` (#1030). One responsive component (ADR-0058).
 * Colour via `--faction-coven-slip-*` + `--faction-coven-ward-*`; braid and wheel
 * motion live in index.css (cascade, not ternaries).
 */

const CHROME = "var(--font-faction-script)";
const READING = "var(--font-faction-spectral)";
const HAND = "var(--font-faction-script)";
const DISPLAY = "var(--font-faction-witch)";

const INK = "var(--faction-coven-slip-ink)";
const DEEP = "var(--faction-coven-slip-deep)";
const SOFT = "var(--faction-coven-slip-soft)";
const LABEL = "var(--faction-coven-slip-label)";
const GOLD = "var(--faction-coven-slip-gold)";
const BORDER = "var(--faction-coven-slip-border)";
const CARD = "var(--faction-coven-ward-card)";
const PAGE = "var(--faction-coven-ward-page)";

/** Cards before the in-place expand; see `GALLERY_PREVIEW` in DefaultTaskDetail. */
const GALLERY_PREVIEW = 3;

interface SizeSet {
  /** Action-plate width: Coven dress, not a shared constant. */
  plate: number;
  /** Ward disc (WORLD_ZERO_STYLE §4a). */
  ward: number;
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

const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: LABEL,
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

/** `.cvn-braid` (index.css) owns the pigments. */
function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />;
}


export default function CovenTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[formFactor];
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
  // Null on a generic metatask (#2282).
  const eyebrowFaction = headerFactionName(task);
  // The cards' resolver (#2554); also the action slot's existence test.
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
  /** Gold = you already hold this task. Never the pink one. */
  const goldButton: CSSProperties = {
    ...pinkButton,
    color: "var(--faction-coven-ward-hold-ink)",
    background: `linear-gradient(180deg, ${GOLD}, var(--faction-coven-ward-hold-to))`,
    border: "1.5px solid var(--faction-coven-ward-hold-border)",
  };

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

  // The faction's own score stamp (ADR-0049, #2554).
  const worth = <TaskWorthStamp state={state} />;

  // Sign up / continue / edit. Nothing renders when the viewer has no move.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2554, #2642). `pinkButton` stays as
              `goldButton`'s base. */}
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
                {/* On the ward PAGE ground, so INK (#1295). */}
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
          {/* The read page, not `/edit` (#1397, #1164). */}
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

  // Width via `actionColumnSize` (#1138); with no action the worth box fills it.
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

  const stat = (label: string, value: ReactNode, valueSize: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
      <span style={eyebrow}>{label}</span>
      <span style={{ fontFamily: READING, fontSize: valueSize, lineHeight: 0.85, color: INK }}>
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
        // This page's label ink, not the metatask faction's fill hue (#2077).
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

  // Byline/level/headcount, below the brief (#2120; see DefaultTaskDetail).
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

      {/* Exactly two stats; no roster. */}
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
        {/* No sort control until something is filed (#1704). */}
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
                // Unpanelled, on the ward PAGE: INK, not DEEP (#1295).
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
      {/* Shared site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The column wears the slip (#2135); `SLIP_SHEET` is the one copy of the
          ramp. Ground on the column, not the viewport (#1055). */}
      <div
        style={{
          ...factionBodyVars("coven"),
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
          {/* Cat watermark (#2041), bottom placement on every mount (#2135).
              Anchored to the gallery: the sheet's true bottom is behind the
              opaque comment composer. This wrapper is a stacking context, so
              `zIndex: -1` sits under the copy but over the sheet's ground. */}
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
