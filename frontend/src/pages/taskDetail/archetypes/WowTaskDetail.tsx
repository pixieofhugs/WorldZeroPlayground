import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { BalloonBunch, Bunting, Zig } from "../../../components/factionMarks/wowOrnament";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { factionFill, factionName } from "../../../utils/factions";
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
import type { TaskDetailState } from "../useTaskDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";

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
 *   (PraxisCard carries its own basis, narrowed to 320px by `.praxis-gallery`,
 *   #1137). The balloons therefore
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
 *
 * The wavy rule, the balloon bunch and the bunting moved OUT of this file into
 * `components/factionMarks/wowOrnament.tsx` (#1121), where the praxis-detail skin reads
 * the same three primitives. They were drawn here and, separately, in
 * `WowTaskCard`; a third hand-drawn copy is what WORLD_ZERO_STYLE §6 (#849)
 * forbids. Nothing about how they render changed.
 */

/**
 * THE FIVE CORE ROLES ARE ASKED FOR BY NAME (#2674). The parchment field below
 * (`.wow-detail-field`) spreads `factionRoleVars('wow', 'wow-task-page')`, and
 * the prefix is declared THERE rather than on the outer wrapper: the wrapper
 * also holds `Breadcrumb`, which is neutral site chrome above the surface
 * (#2102) and has no business inheriting a faction's roles.
 *
 * Every read carries today's token as its fallback. The nine names that are NOT
 * roles below — the olive label ink, the plum fill and its edge, the gilt, the
 * inset, the hairline — stay exactly as they are: decision 07 leaves a surface's
 * extras to the surface, and several of them exist precisely because they were
 * measured against a ground the core map does not describe.
 */
const MED = "var(--wow-task-page-face)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--wow-task-page-ink)";
const MUTED = "var(--wow-task-page-quiet)";
/** Label ink. Olive-gold, the one measured to clear AA on BOTH grounds — the
 *  cream card (5.32:1) and, unlike `--faction-wow-card-muted` (4.20:1), the
 *  darker parchment field this page lays its headers straight onto. */
const LABEL = "var(--faction-wow-accent-deep)";
/** Plum as INK/ornament — flips with the theme. */
const PLUM = "var(--wow-task-page-accent)";
/** Plum as a FILL — theme-invariant, 5.16:1 under `--faction-wow-on-plum`. */
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const PLUM_EDGE = "var(--faction-wow-plum-edge)";
const ON_PLUM = "var(--faction-wow-on-plum)";
/** Frame + rule gold. Never an ink: 2.24:1 on the cream (§3). */
const GOLD = "var(--faction-wow-chronicle-gold)";
/** The burnt gold reserved for the total. 4.80:1 on the plaque. */
const GILT = "var(--faction-wow-stamp-total)";
const CARD = "var(--wow-task-page-paper)";
const INSET = "var(--faction-wow-detail-inset)";
const HAIR = "var(--faction-wow-chronicle-rule)";

/**
 * Praxis cards shown before the gallery expands. The row is `.praxis-gallery`,
 * which narrows `PraxisCard`'s basis from the feed's 394px to 320px (#1137), so
 * three land in a row at the 1200 cap instead of two, and the row reflows on its
 * own below that.
 */
const GALLERY_PREVIEW = 3;

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
  // The gallery expands IN PLACE. It deliberately does not link out to
  // `/praxis?task_id=N` — the reader stays on the task. #1030 found that link
  // dead on every archetype (the feed read no such param and showed everything);
  // #1050 made the URL filter, and the in-place expand still stands.
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

  /* THE WORTH READOUT IS THE FACTION'S OWN SCORE STAMP NOW (#2554).

     A base row, a ×mult chip and a struck plaque stood here — a SECOND drawing of a score, beside
     the one this faction's registered `scoreStamp` surface (ADR-0049) already
     draws on every praxis card. The stamp is size-agnostic by contract, so the
     panel mounts it and the row policy, the ×1.0 gate and the total's format
     all come from the one place that owns them. */
  const worth = <TaskWorthStamp state={state} />;

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
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The CARDS' control, mounted (#2554) — element and affordance from
              `CardCtaControl`, paint and geometry still this skin's, spread last. */}
          <CardCtaControl cta={cta} testId="task-signup-cta" style={ctaStyle(false)}>
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
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
          <Link to={`/praxis/${mySubmission.id}`} style={ctaStyle(true)}>
            <Star size={13} color={GOLD} />
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div style={plateHeading}>{t("detail.inProgress.text")}</div>
          <Link to={`/praxis/${inProgressPraxisId}/edit`} style={ctaStyle(true)}>
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
  // full width once the column collapses — and 452 only when there IS a move to
  // make; see `actionColumnSize` (#1138). With the summons cell absent the worth
  // cell takes the plate, so the gold frame never encloses empty parchment.
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

  // ── Header: breadcrumb · shield + faction line · title ── (byline + stats: `credentials`, below the brief — #2120)
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
        // `LABEL` and not the metatask faction's spine hue (#2077) — a hue is a
        // FILL (§3, #1932). This is the one of the eight bylines that names an
        // ink rather than dropping the override: `QUIET` is type only and sets
        // no colour, so deleting the line would leave the paragraph inheriting
        // whatever ancestor last spoke. `LABEL` is what the faction-name span
        // three blocks up already paints on this same header ground, and it is
        // the ink measured to clear BOTH the cream card (5.32:1 light / 8.83:1
        // dark) and the darker parchment field the headers lie straight on,
        // which `--faction-wow-card-muted` does not (4.20:1) — see its
        // declaration.
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
        <BalloonBunch size={34} />
        <Zig id="gallery" style={{ flex: 1 }} />
        {/* Nothing to sort until something is filed (#1704). The heading and the
            balloon-framed empty panel below stay; only the control goes. */}
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
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The parchment field with its fine dot texture (index.css). It paints
          the detail COLUMN, not the viewport: the owner's rule for this surface
          is that the site background still shows around the component (QA on
          #1055, applied to every skin). Was `position: fixed; inset: 0`. */}
      <div
        className="wow-detail-field"
        style={{
          ...factionRoleVars("wow", "wow-task-page"),
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
