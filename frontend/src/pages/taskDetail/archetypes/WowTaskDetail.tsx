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
 * Warriors of Whimsy — the task-detail page, NET-NEW (#1037).
 *
 * WOW had no desktop `taskDetail` archetype at all: `factions/wow.ts` registered
 * only the phone twin (a surface since retired by ADR-0058), so until this file
 * a WOW task rendered the **na dossier** on desktop. That is one of the four
 * bullets in #951; the other three (`praxisDetail`, `factionCard`,
 * `factionBody`) stay open.
 *
 * The dress, ported from the v2 design (#1037; project 0711d3a7):
 * gold-and-plum parchment under a fine dot texture, bunting strung across the
 * head of the page, a crossed-swords shield beside the faction line, a points
 * plaque struck two degrees off true, wavy gold→plum rules dividing the
 * sections, and a bundle of googly-eyed balloons whose pupils wiggle.
 * MedievalSharp carries the display, Lora italic the quiet register — WOW's two
 * faces (§3).
 *
 * ADR-0050 fixes this identity and the vendored design agrees with it for once:
 * gold/plum/bunting/balloons is WOW; the pink candlelight and the pentagram ward
 * are Coven's. Do not reconcile the two.
 *
 * Four contract points that are NOT this skin's to re-decide:
 * - **No in-progress roster.** The header's "In progress" count is the only
 *   place that population appears (owner ruling 2026-07-28, reversing epic
 *   #1028 decision 3). The design's own header comment already says so.
 * - **The `×mult` badge renders only off the identity factor.** `era_1`
 *   neutralises every faction, so it is invisible today — correct (ADR-0055).
 *   The factor arrives raw on the state contract; it is never reconstructed as
 *   `modifiedPoints / basePoints` (ADR-0053's dead-arithmetic trap).
 * - **Copy is the shared neutral `detail.*` catalog** (ADR-0057). The design
 *   says "quest", "submissions", "highest scored"; every one of those is faction
 *   voice and none of them ships. Dress is ours, words are not.
 * - **The gallery mounts the live `<PraxisCard>`** in the shared
 *   `flex flex-wrap gap-4`, not the design's `repeat(3,1fr)` grid of mock cards
 *   (PraxisCard carries its own `flex: 1 1 394px` basis). The balloons therefore
 *   live in this page's section dress, not inside thumbnails we do not own.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * drops the two-column split. The separate WOW mobile skin (#901's field
 * pavilion detail) and the manifest surface that held it were deleted by #1068
 * when the ADR was accepted.
 *
 * Every colour is a shipped `--faction-wow-*` token; #1023's quest decree minted
 * most of them and this page reuses them rather than growing a parallel set. The
 * five it adds (the page field, its dot, the inner plate, the plum's edge and
 * the page shadow) are delimited in `index.css` under the same heading as this
 * file.
 */

const MED = "var(--faction-wow-card-font)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--faction-wow-card-text)";
const MUTED = "var(--faction-wow-card-muted)";
/** Label ink. Olive-gold, the one measured to clear AA on BOTH grounds — the
 *  cream card (5.32:1) and, unlike `--faction-wow-card-muted` (4.20:1), the
 *  darker parchment field this page lays its headers straight onto. */
const LABEL = "var(--faction-wow-accent-deep)";
/** Plum as INK/ornament — flips with the theme. */
const PLUM = "var(--faction-wow-card-accent)";
/** Plum as a FILL — theme-invariant, 5.16:1 under `--faction-wow-on-plum`. */
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const PLUM_EDGE = "var(--faction-wow-plum-edge)";
const ON_PLUM = "var(--faction-wow-on-plum)";
/** Frame + rule gold. Never an ink: 2.24:1 on the cream (§3). */
const GOLD = "var(--faction-wow-chronicle-gold)";
/** The burnt gold reserved for the total. 4.80:1 on the plaque. */
const GILT = "var(--faction-wow-stamp-total)";
const CARD = "var(--faction-wow-card-bg)";
const PANEL = "var(--faction-wow-chronicle-panel)";
const INSET = "var(--faction-wow-detail-inset)";
const HAIR = "var(--faction-wow-chronicle-rule)";

/**
 * Praxis cards shown before the gallery expands. `PraxisCard` carries
 * `flex: 1 1 394px`, so three land in a row at the 1200 cap and the row reflows
 * on its own below that.
 */
const GALLERY_PREVIEW = 3;

/** Pennants in the bunting strung across the head of the page. */
const BUNTING_PENNANTS = 30;

interface SizeSet {
  /** The action plate's width. WOW's is 452 — dress, and deliberate. */
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

/** The decree's label voice — MedievalSharp small caps. */
const EYEBROW: CSSProperties = {
  fontFamily: MED,
  fontSize: "var(--text-base)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

/** Lora italic, the faction's quiet register. */
const QUIET: CSSProperties = {
  fontFamily: LORA,
  fontStyle: "italic",
  lineHeight: 1.55,
};

/**
 * The wavy gold→plum rule, stretched to whatever the flex row gives it. Built
 * rather than written out: a `T`-chained quadratic of twenty segments is not a
 * string anyone should maintain by hand, and `vectorEffect: non-scaling-stroke`
 * is what keeps the line one weight however far it is stretched.
 */
const ZIG_PATH = (() => {
  let path = "M0,4 Q3,1 6,4";
  for (let x = 12; x <= 120; x += 6) path += ` T${x},4`;
  return path;
})();

function Zig({ id, style }: { id: string; style?: CSSProperties }) {
  const gradientId = `wow-detail-zig-${id}`;
  return (
    <span aria-hidden="true" style={{ display: "block", minWidth: 24, ...style }}>
      <svg
        width="100%"
        height={8}
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={GOLD} />
            <stop offset="1" stopColor={PLUM} />
          </linearGradient>
        </defs>
        <path
          d={ZIG_PATH}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}

/** The star that leads every call to action. */
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

/** The crossed-swords shield that marks the faction line. */
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

/**
 * One googly balloon on its string. The pupils travel on `.wow-balloon-eye`,
 * the faction's existing reduced-motion-guarded wiggle, staggered per eye via
 * `--wow-eye-delay` so no two in the bunch move together.
 */
function Balloon({
  cx,
  cy,
  fill,
  delay,
}: {
  cx: number;
  cy: number;
  fill: string;
  delay: number;
}) {
  const eye = (offset: number, eyeDelay: number) => (
    <>
      <circle
        cx={cx + offset}
        cy={cy - 1}
        r={2.4}
        fill="var(--faction-wow-balloon-eye-white)"
        stroke="var(--faction-wow-balloon-eye-ring)"
        strokeWidth={0.8}
      />
      <circle
        className="wow-balloon-eye"
        cx={cx + offset}
        cy={cy - 0.2}
        r={1}
        fill="var(--faction-wow-balloon-eye)"
        style={{ "--wow-eye-delay": `${eyeDelay}s` } as CSSProperties}
      />
    </>
  );
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={9}
        ry={11}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.2}
      />
      <path
        d={`M${cx - 2},${cy + 10.3} L${cx + 2},${cy + 10.3} L${cx},${cy + 13.3} Z`}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      {eye(-3, delay)}
      {eye(3, delay + 0.3)}
    </g>
  );
}

/**
 * The bunch. The whole span bobs on `.wow-balloon-bunch`, which — like every
 * other faction motion in the house — is a CLASS gated on
 * `prefers-reduced-motion: no-preference`, never an inline `animation:` that
 * would bypass the gate.
 */
function Balloons({ size }: { size: number }) {
  return (
    <span
      className="wow-balloon-bunch"
      aria-hidden="true"
      style={{ display: "inline-block", flex: "0 0 auto", width: size, height: size * 1.25 }}
    >
      <svg width={size} height={size * 1.25} viewBox="0 0 44 56" style={{ display: "block" }}>
        <g fill="none" stroke="var(--faction-wow-balloon-string)" strokeWidth={1}>
          <path d="M12,28 Q16,41 22,51" />
          <path d="M31,25 Q28,41 22,51" />
          <path d="M22,36 Q23,44 22,51" />
        </g>
        <Balloon cx={12} cy={15} fill="var(--faction-wow-balloon-5)" delay={0} />
        <Balloon cx={31} cy={12} fill="var(--faction-wow-balloon-5)" delay={0.2} />
        <Balloon cx={22} cy={27} fill="var(--faction-wow-balloon-1)" delay={0.4} />
        <circle cx={22} cy={51} r={1.6} fill={GILT} />
      </svg>
    </span>
  );
}

/** Bunting strung across the head of the page. */
function Bunting({ gap }: { gap: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-xs)",
        height: 22,
        overflow: "hidden",
        opacity: 0.9,
        marginBottom: gap,
      }}
    >
      {Array.from({ length: BUNTING_PENNANTS }).map((_, index) => (
        <span
          key={index}
          style={{
            flex: 1,
            minWidth: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: `18px solid ${index % 2 ? PLUM : GOLD}`,
            transform: `translateY(${index % 2 ? 2 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}

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

export default function WowTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
  // The gallery expands IN PLACE. It deliberately does not link to
  // `/praxes?task_id=N`: the praxis feed reads no such param, so that link has
  // always dropped the filter and shown the whole feed (#1030 found it dead on
  // every archetype).
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

  /** MedievalSharp label, a wavy rule running out of it, an optional gloss. */
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

  // ── The worth: base, the (usually absent) ×mult chip, and the struck plaque ──
  const worth = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ ...EYEBROW, color: LABEL }}>{t("detail.points.base")}</span>
        <span style={{ fontFamily: MED, fontSize: size.base, lineHeight: 1, color: INK }}>
          {basePoints}
        </span>
        {showMultiplier && (
          <span
            style={{
              fontFamily: MED,
              fontSize: "var(--text-lg)",
              lineHeight: 1.3,
              color: ON_PLUM,
              background: PLUM_SURFACE,
              border: `1.5px solid ${PLUM_EDGE}`,
              borderRadius: 5,
              padding: "var(--space-xs) var(--space-sm)",
              whiteSpace: "nowrap",
            }}
          >
            {t("detail.points.multiplier", { multiplier: factionMultiplier.toFixed(2) })}
          </span>
        )}
      </div>

      {/* The plaque, struck two degrees off true. */}
      <div
        style={{
          position: "relative",
          transform: "rotate(-2deg)",
          background: PANEL,
          border: `2px solid ${GOLD}`,
          borderRadius: 6,
          boxShadow: "2px 3px 0 var(--faction-wow-stamp-shadow)",
          padding: "var(--space-md) var(--space-lg)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "var(--space-xs)",
          }}
        >
          <span
            style={{ fontFamily: MED, fontSize: size.plaqueTotal, lineHeight: 0.8, color: GILT }}
          >
            {modifiedPoints}
          </span>
          {/* The ✦ is a dingbat, not text (§4) — the only reason it may be
              painted in the gold, at 2.00:1 on the panel. */}
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the faction glyph, sized to the numeral it trails. */}
          <span aria-hidden="true" style={{ fontFamily: MED, fontSize: 15, color: GOLD }}>
            ✦
          </span>
        </div>
        <div
          style={{
            ...QUIET,
            fontSize: "var(--text-md)",
            color: PLUM,
            marginTop: "var(--space-xs)",
          }}
        >
          {t("detail.points.total")}
        </div>
      </div>
    </div>
  );

  const ctaStyle = (ghost: boolean): CSSProperties => ({
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
    color: ghost ? PLUM : ON_PLUM,
    background: ghost ? "transparent" : PLUM_SURFACE,
    border: `2px solid ${ghost ? GOLD : PLUM_EDGE}`,
    borderRadius: 7,
    padding: desktop ? "var(--space-md) var(--space-lg)" : "var(--space-md)",
  });

  const quietNote: CSSProperties = {
    ...QUIET,
    fontSize: "var(--text-xl)",
    color: MUTED,
  };

  /** The line above a CTA inside the plate. A tier below a section head — the
   *  plate's text column is ~240px wide and a 32px MedievalSharp line breaks
   *  three ways in it (the design sets this one at 24 for the same reason). */
  const plateHeading: CSSProperties = {
    fontFamily: MED,
    fontSize: size.stat,
    lineHeight: 1.08,
    color: INK,
    marginBottom: "var(--space-md)",
  };

  // ── The one action slot. Nothing renders when the viewer has no move to make —
  //    an unusable control is worse than none.
  const actionBody = (
    <>
      {canSignUp && (
        <div>
          <LevelJumpBanner state={state} />
          <button onClick={handleSignup} style={ctaStyle(false)}>
            <Star size={13} color={ON_PLUM} />
            {t("detail.signup.cta")}
          </button>
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
          <Link to={`/praxes/${mySubmission.id}/edit`} style={ctaStyle(true)}>
            <Star size={13} color={GOLD} />
            {t("detail.submitted.edit")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div style={plateHeading}>{t("detail.inProgress.text")}</div>
          <Link to={`/praxes/${inProgressPraxisId}/edit`} style={ctaStyle(true)}>
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

  // The action plate: 452px on desktop (WOW's own value; the set runs 420–520),
  // full width once the column collapses.
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
            flex: "0 0 auto",
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

  // ── Header: breadcrumb · shield + faction line · title · author · stats ──
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
        <Link to="/tasks" style={{ ...EYEBROW, color: PLUM, textDecoration: "none" }}>
          {t("detail.breadcrumb.tasks")}
        </Link>
        <span aria-hidden style={{ ...EYEBROW, color: LABEL }}>
          /
        </span>
        <span style={{ ...EYEBROW, color: LABEL }}>
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
        <ShieldGlyph size={24} />
        <span style={{ ...EYEBROW, fontSize: "var(--text-md)", color: LABEL }}>
          {factionName(slug)}
        </span>
        {isMetatask && (
          <span
            style={{
              ...EYEBROW,
              fontSize: "var(--text-xs)",
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
          fontWeight: 400,
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
        <p
          style={{
            ...QUIET,
            fontSize: "var(--text-xl)",
            margin: 0,
            marginBottom: "var(--space-md)",
            color: factionCssVar(task.metatask_faction_slug),
          }}
        >
          {t("detail.metataskFor", { faction: factionName(task.metatask_faction_slug) })}
        </p>
      )}

      {/* Author row — the proposing character's byline (#1029). */}
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

      {/* Two stats. The completed count lives on the gallery heading, and there
          is deliberately NO roster — the design's own header comment says the
          in-progress count covers it. */}
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

  // ── The brief, in full. No clamp, no "read more". ──
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

  // ── The gallery. Live PraxisCards; the balloons are the section's dress. ──
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
        <Balloons size={34} />
        <Zig id="gallery" style={{ flex: 1 }} />
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
                fontSize: "var(--text-sm)",
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
          <Balloons size={56} />
          <p className="content-text" style={{ ...QUIET, color: MUTED, margin: 0 }}>
            {t("detail.gallery.empty")}
          </p>
        </div>
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
      {/* The parchment field with its fine dot texture (index.css). It paints
          the detail COLUMN, not the viewport: the owner's rule for this surface
          is that the site background still shows around the component (QA on
          #1055, applied to every skin). Was `position: fixed; inset: 0`. */}
      <div
        className="wow-detail-field"
        style={{
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
        <Bunting gap={size.buntingGap} />

        <div
          style={{
            display: "flex",
            flexDirection: desktop ? "row" : "column",
            alignItems: desktop ? "flex-start" : "stretch",
            gap: "var(--space-xl)",
            marginBottom: size.sectionGap,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
          <div
            style={{
              flex: desktop ? `0 0 ${size.plate}px` : "1 1 auto",
              width: desktop ? size.plate : "100%",
              marginTop: desktop ? "var(--space-sm)" : 0,
            }}
          >
            {actionPlate}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {brief}
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
