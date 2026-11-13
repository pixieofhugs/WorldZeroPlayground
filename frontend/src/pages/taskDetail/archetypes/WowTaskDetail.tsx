import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { BalloonBunch, Bunting, Zig } from "../../../components/factionMarks/wowOrnament";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionFill, factionName } from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
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
import { WOW_CARD_CTA } from "../../../components/taskCard/cardCta";
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/**
 * Warriors of Whimsy task detail (#1037): gold-and-plum parchment, bunting,
 * crossed-swords shield, wavy gold→plum rules, googly-eyed balloons;
 * MedievalSharp + Lora italic. Gold/plum is WOW, candlelight is Coven's
 * (ADR-0050) — don't reconcile. Contract is `DefaultTaskDetail`'s; one
 * responsive component (ADR-0058). Ornament lives in `factionMarks/wowOrnament`
 * (#1121); never hand-draw a copy (WORLD_ZERO_STYLE §6).
 */

/**
 * Core roles come from `factionRoleVars('wow', 'wow-task-page')` on the field,
 * not the wrapper, so the breadcrumb stays neutral (#2674). The non-role tokens
 * below are surface extras measured against this ground.
 */
const MED = "var(--wow-task-page-face)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--wow-task-page-ink)";
const MUTED = "var(--wow-task-page-quiet)";
/** Label ink: clears AA on the card AND the parchment field; `-card-muted` doesn't. */
const LABEL = "var(--faction-wow-accent-deep)";
/** Plum as INK/ornament — flips with the theme. */
const PLUM = "var(--wow-task-page-accent)";
/** Plum as a FILL — theme-invariant, 5.16:1 under `--faction-wow-on-plum`. */
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const ON_PLUM = "var(--faction-wow-on-plum)";
/** Frame + rule gold. Never an ink: 2.24:1 on the cream (§3). */
const GOLD = "var(--faction-wow-chronicle-gold)";
/** The burnt gold reserved for the total. 4.80:1 on the plaque. */
const GILT = "var(--faction-wow-stamp-total)";
const CARD = "var(--wow-task-page-paper)";
const INSET = "var(--faction-wow-detail-inset)";
const HAIR = "var(--faction-wow-chronicle-rule)";

/** Praxis shown before expanding; `.praxis-gallery` fits three per row (#1137). */
const GALLERY_PREVIEW = 3;

interface SizeSet {
  /** The action plate's width; dress. */
  plate: number;
  title: string;
  sectionHead: string;
  statBig: string;
  stat: string;
  plaqueTotal: string;
  base: string;
  cta: string;
  /** Ornament geometry, exempt from the spacing scale (§4a). */
  buntingGap: string;
  panelPad: string;
  boxPad: string;
  sectionGap: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    plate: 452,
    title: "var(--text-display)",
    sectionHead: "var(--text-heading)",
    statBig: "var(--text-heading)",
    stat: "var(--text-title)",
    plaqueTotal: "var(--text-display)",
    base: "var(--text-title)",
    cta: "var(--text-content)",
    buntingGap: "var(--space-xl)",
    panelPad: "var(--space-xl)",
    boxPad: "var(--space-lg)",
    sectionGap: "var(--space-2xl)",
  },
  mobile: {
    plate: 452,
    title: "var(--text-heading)",
    sectionHead: "var(--text-title)",
    statBig: "var(--text-title)",
    stat: "var(--text-content)",
    plaqueTotal: "var(--text-heading)",
    base: "var(--text-content)",
    cta: "var(--text-xl)",
    buntingGap: "var(--space-lg)",
    panelPad: "var(--space-lg)",
    boxPad: "var(--space-md)",
    sectionGap: "var(--space-xl)",
  },
};

const EYEBROW: CSSProperties = {
  fontFamily: MED,
  fontSize: "var(--text-base)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

const QUIET: CSSProperties = {
  fontFamily: LORA,
  fontStyle: "italic",
  lineHeight: 1.55,
};

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.8 5.6 21.1 7 14 1.7 9l7.2-.9L12 1.5z"
        fill={color}
      />
    </svg>
  );
}

function ShieldGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M4,5 H16 V11 Q16,16 10,18.5 Q4,16 4,11 Z"
        fill={PLUM_SURFACE}
        stroke={GILT}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <g stroke="var(--faction-wow-quest-blade)" strokeWidth="1.8" strokeLinecap="round">
        <line x1="3.5" y1="16.8" x2="16.5" y2="3.6" />
        <line x1="16.5" y1="16.8" x2="3.5" y2="3.6" />
      </g>
      <g fill={GILT}>
        <circle cx="3.2" cy="17.3" r="1.1" />
        <circle cx="16.8" cy="17.3" r="1.1" />
      </g>
    </svg>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function WowTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
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

  const framed: CSSProperties = {
    background: CARD,
    border: `2px solid ${GOLD}`,
    borderRadius: 10,
    boxSizing: "border-box",
    boxShadow: "var(--faction-wow-detail-shadow)",
  };
  const innerBox: CSSProperties = {
    background: INSET,
    border: `1.5px solid ${HAIR}`,
    borderRadius: 8,
    padding: size.boxPad,
    boxSizing: "border-box",
  };
  const divider = (
    <span
      aria-hidden
      style={{ width: 1, alignSelf: "stretch", minHeight: 34, background: HAIR }}
    />
  );

  const sectionHead = (id: string, label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontFamily: MED, fontSize: size.sectionHead, lineHeight: 1.08, color: INK }}>
        {label}
      </span>
      <Zig id={id} style={{ flex: 1 }} />
      {gloss !== undefined && (
        <span style={{ ...EYEBROW, color: LABEL, flex: "0 0 auto" }}>{gloss}</span>
      )}
    </div>
  );

  const worth = <TaskWorthStamp state={state} />;

  /** The ghost exit ("continue", "view your praxis"), so it never looks like sign-up. */
  const ghostCta: CSSProperties = {
    display: "flex",
    width: "100%",
    boxSizing: "border-box",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: MED,
    fontSize: size.cta,
    letterSpacing: "0.05em",
    color: PLUM,
    background: "transparent",
    border: `2px solid ${GOLD}`,
    borderRadius: 7,
    padding: desktop ? "var(--space-md) var(--space-lg)" : "var(--space-md)",
  };

  const quietNote: CSSProperties = {
    ...QUIET,
    fontSize: "var(--text-xl)",
    color: MUTED,
  };

  /** A tier below a section head: the ~240px plate column breaks a 32px line three ways. */
  const plateHeading: CSSProperties = {
    fontFamily: MED,
    fontSize: size.stat,
    lineHeight: 1.08,
    color: INK,
    marginBottom: "var(--space-md)",
  };

  // The one action slot. Nothing renders with no move to make.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The cards' control and paint (#2642). */}
          <CardCtaControl
            cta={cta}
            testId="task-signup-cta"
            size="detail"
            style={WOW_CARD_CTA}
          >
            <Star size={13} color={ON_PLUM} />
            {cta.label}
          </CardCtaControl>
          <div style={{ ...quietNote, textAlign: "center", marginTop: "var(--space-sm)" }}>
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
          <div style={plateHeading}>{t("detail.submitted.text")}</div>
          {/* The READ page, not `/edit`, which bounces a submitted praxis (#1397). */}
          <Link to={`/praxis/${mySubmission.id}`} style={ghostCta}>
            <Star size={13} color={GOLD} />
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div style={plateHeading}>{t("detail.inProgress.text")}</div>
          <Link to={`/praxis/${inProgressPraxisId}/edit`} style={ghostCta}>
            <Star size={13} color={GOLD} />
            {t("detail.inProgress.continue")}
          </Link>
          <button
            onClick={handleDrop}
            style={{
              ...quietNote,
              display: "block",
              width: "100%",
              textAlign: "center",
              marginTop: "var(--space-sm)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {t("detail.inProgress.drop")}
          </button>
          <ErrorBanner message={signupError} />
        </div>
      )}
    </>
  );

  // The action plate; 452px only with a move (#1138), else the worth cell fills it.
  const actionPlate = (
    <div style={{ ...framed, position: "relative", overflow: "hidden", borderRadius: 11 }}>
      <div aria-hidden style={{ height: 6, background: "var(--faction-wow-quest-ribbon)" }} />
      <div
        style={{
          padding: "var(--space-md)",
          display: "flex",
          gap: "var(--space-md)",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            ...innerBox,
            flex: hasAction ? "0 0 auto" : "1 1 auto",
            minWidth: desktop ? 176 : 132,
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
    </div>
  );

  // Header: shield + faction line, title. Byline + stats are `credentials` (#2120).
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
        <ShieldGlyph size={24} />
        <span style={{ ...EYEBROW, fontSize: "var(--text-md)", color: LABEL }}>
          {eyebrowFaction}
        </span>
        {isMetatask && (
          <span
            style={{
              ...EYEBROW,
              fontSize: "var(--text-md)",
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
          fontFamily: MED,
          fontSize: size.title,
          lineHeight: 1.08,
          margin: 0,
          marginBottom: "var(--space-lg)",
          color: INK,
          overflowWrap: "anywhere",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // `LABEL`, not the issuer's hue (a fill, #2077). Named explicitly because
        // `QUIET` sets no colour.
        <p
          style={{
            ...QUIET,
            fontSize: "var(--text-xl)",
            margin: 0,
            marginBottom: "var(--space-md)",
            color: LABEL,
          }}
        >
          {t("detail.metataskIssuer", { faction: factionName(task.metatask_faction_slug) })}
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
                  border: `2px solid ${GOLD}`,
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
                  fontFamily: MED,
                  fontSize: "var(--text-lg)",
                  background: CARD,
                  border: `2px solid ${GOLD}`,
                  color: PLUM,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: MED,
                fontSize: "var(--text-xl)",
                color: INK,
                borderBottom: `2px dotted ${PLUM}`,
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={{ ...EYEBROW, color: LABEL }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <span style={{ ...EYEBROW, color: LABEL }}>{t("detail.stats.level")}</span>
          <span style={{ fontFamily: MED, fontSize: size.statBig, lineHeight: 0.8, color: INK }}>
            {task.level_required}
          </span>
        </div>
        {divider}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <span style={{ ...EYEBROW, color: LABEL }}>{t("detail.stats.inProgress")}</span>
          <span style={{ fontFamily: MED, fontSize: size.stat, lineHeight: 0.8, color: INK }}>
            {inProgressCount}
          </span>
        </div>
      </div>
    </div>
  );

  // The brief, in full. No clamp.
  const brief = (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead("brief", t("detail.brief.heading"))}
      <div style={{ ...framed, padding: size.panelPad }}>
        {task.description && (
          <p
            className="content-text"
            style={{
              ...QUIET,
              lineHeight: 1.65,
              color: INK,
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {task.description}
          </p>
        )}
        <Zig id="brief-foot" style={{ marginTop: "var(--space-lg)" }} />
      </div>
    </section>
  );

  const gallery = (
    <section style={{ marginBottom: size.sectionGap }}>
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
          style={{ fontFamily: MED, fontSize: size.sectionHead, lineHeight: 1.08, color: INK }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <BalloonBunch size={34} />
        <Zig id="gallery" style={{ flex: 1 }} />
        {/* Nothing to sort until something is filed (#1704). */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              border: `2px solid ${GOLD}`,
              borderRadius: 8,
              background: CARD,
            }}
          >
            {(["score", "recent"] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSubmissionSort(sort)}
                style={{
                  ...EYEBROW,
                  fontSize: "var(--text-md)",
                  cursor: "pointer",
                  border: "none",
                  borderRadius: 6,
                  padding: "var(--space-sm) var(--space-md)",
                  color: submissionSort === sort ? ON_PLUM : LABEL,
                  background: submissionSort === sort ? PLUM_SURFACE : "transparent",
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
        <div
          style={{
            ...framed,
            padding: size.panelPad,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-lg)",
          }}
        >
          <BalloonBunch size={56} />
          <p className="content-text" style={{ ...QUIET, color: MUTED, margin: 0 }}>
            {t("detail.gallery.empty")}
          </p>
        </div>
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
                fontFamily: MED,
                fontSize: "var(--text-content)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: PLUM,
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
      {/* Site chrome, above the surface (#2102). */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The field paints the column, not the viewport (owner rule, #1055). */}
      <div
        className="wow-detail-field"
        style={{
          ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-task-page"),
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
        <Bunting style={{ marginBottom: size.buntingGap }} />

        <div
          style={{
            display: "flex",
            flexDirection: desktop ? "row" : "column",
            alignItems: desktop ? "flex-start" : "stretch",
            gap: "var(--space-xl)",
            marginBottom: size.sectionGap,
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
              marginTop: desktop ? "var(--space-sm)" : 0,
            }}
          >
            {actionPlate}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {gallery}
          <TaskDetailComments
            state={state}
            heading={sectionHead("comments", t("detail.comments.heading"))}
          />
        </div>
      </div>
    </div>
  );
}
