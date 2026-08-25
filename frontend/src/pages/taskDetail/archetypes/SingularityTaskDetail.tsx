import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import SingularityLamps from "../../../components/factionMarks/SingularityLamps";
import SingularityProcessLight from "../../../components/factionMarks/SingularityProcessLight";
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
import { factionRoleVar } from "../../../utils/factionRoles";

/**
 * Singularity task detail (C4, #1034) — THE TERMINAL SESSION at page scale.
 *
 * The v2 shared anatomy (#1030) wearing the same window the v2 task card wears:
 * a chrome bar with three lamps, phosphor green and blue on a near-black
 * chassis, a standing raster, a scan sweep travelling down the page, and a block
 * cursor blinking on the prompt. Share Tech Mono for everything — the faction
 * has one face and this surface uses it for chrome and copy alike.
 *
 * Ported from the v2 design (#1034; project 0711d3a7, unvendored by #1039). It
 * replaces the 697-line "terminal printout" archetype wholesale: the boot-line
 * stat vocabulary (`stats.arrays` / `stats.credits` / `stats.sealed`), the
 * consensus block, the circuit corners, the fleur-de-lis "highest signal" crown
 * and the array roster are all gone.
 *
 * THE PAGE IS A WINDOW. The design draws a full-bleed chassis; the archetype
 * mounts inside the app shell under a `PageTitle`, so the chassis is capped at
 * the epic's 1200 page width and given the card's own border, radius and
 * shadow. The chrome bar is then literally a window title bar, which is what the
 * three lamps were always claiming.
 *
 * ALWAYS DARK, IN BOTH THEMES (WORLD_ZERO_STYLE §6). Note that the design
 * inverts the usual theme handling — `props.theme === 'light' ? 'light' :
 * 'dark'` defaults to DARK, and BOTH of its token sets are dark-background
 * terminals. That is intent, not a bug: this faction has no light look. It maps
 * onto the repo's cascade honestly because `--faction-singularity-term-*` is
 * already a real two-theme contract whose halves are both near-black (#1023) —
 * the cascade flips the PHOSPHOR, never the chassis. There is no ternary here;
 * both halves live in index.css, including the three halos, which the design
 * ships as `none` in its light set and lit in its dark set.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * collapses the two-column split. The chrome bar used to swap its lamps for a
 * back arrow; #2102 took the navigation out of the window entirely — the site's
 * shared breadcrumb sits above the chassis at every width — so the bar is the
 * lamps alone and no longer changes at the breakpoint. The separate Singularity
 * mobile skin and the manifest surface that held it were deleted by #1068 when
 * the ADR was accepted.
 *
 * COPY IS NEUTRAL AND SHARED (`detail.*`, ADR-0057). This is the most voiced
 * dress in the set after Albescent, and the dress is all that survives: the
 * design's `// the_observation`, `sealed logs`, `// thread`, `JOIN ARRAY`,
 * `highest signal` and `CR` are gone. What remains of that voice is punctuation
 * — the `//` heading marker, the `>` prompt and the block cursor — each drawn
 * `aria-hidden` beside a shared string rather than replacing one.
 *
 * Motion is entirely index.css's (#911 retired component-injected `<style>`):
 * `.sg-scan`, `.sg-cursor` and `.sg-pulse` already exist under the shared
 * `prefers-reduced-motion` guard, so the design's `SG_CSS` block is dropped and
 * no keyframe was added.
 */

const MONO = factionRoleVar("singularity", "face"); /* Share Tech Mono */

const BG = "var(--faction-singularity-term-bg)";
const PANEL = "var(--faction-singularity-term-panel)";
const CHROME = "var(--faction-singularity-term-chrome)";
const INK = "var(--faction-singularity-term-ink)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
const BLUE_BRIGHT = "var(--faction-singularity-term-blue-bright)";
const BORDER = "var(--faction-singularity-term-border)";
const HAIR = "var(--faction-singularity-term-hair)";
const CTA_BG = "var(--faction-singularity-term-cta-bg)";
const CTA_INK = "var(--faction-singularity-term-cta-ink)";

/**
 * Praxis cards the gallery shows before expanding in place. The row is
 * `.praxis-gallery`, which narrows `PraxisCard`'s basis to 320px (#1137), so
 * three land in a row at the 1200 cap and the row reflows on its own — the
 * design's `repeat(3,1fr)` would squeeze every card instead. The feed's own
 * 394px basis fitted only two across the content column.
 */
const GALLERY_PREVIEW = 3;

/** Terminal caption voice — every label on the chassis speaks in it. */
const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-md)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
};

/* `hexOf` rendered the task's id as a `0x131` process slug at the right end of
   the window bar. It read as ornament, but the number it drew was the task id in
   another base, and #1124 retired that id from this page — so the slug and the
   helper are gone rather than the id surviving in hex. */

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

/** A dashed terminal rule. */
function Rule({ style }: { style?: CSSProperties }) {
  return (
    <div aria-hidden style={{ height: 0, borderTop: `1px dashed ${HAIR}`, ...style }} />
  );
}

/**
 * The block cursor trailing a prompt. Stilled under reduced motion it stays
 * drawn — it is punctuation on the prompt, not an indicator.
 */
function Cursor() {
  return (
    <span
      aria-hidden
      className="sg-cursor"
      style={{
        display: "inline-block",
        width: 6,
        height: 13,
        marginLeft: "var(--space-xs)",
        background: "currentColor",
        verticalAlign: "-0.12em",
      }}
    />
  );
}

export default function SingularityTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  // The gallery expands in place. It deliberately does NOT link out to
  // `/praxis?task_id=N` — the reader stays on the task (#1030 replaced the link
  // on na). That URL does filter properly since #1050; before it, it silently
  // showed the whole feed.
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
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 5,
    padding: desktop ? "var(--space-lg)" : "var(--space-md)",
    boxSizing: "border-box",
  };
  const panelBox: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    boxSizing: "border-box",
  };
  /** The lit key: phosphor fill, chassis ink, a prompt and a cursor. */
  const primaryButton: CSSProperties = {
    display: "block",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: MONO,
    fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
    letterSpacing: "0.06em",
    color: CTA_INK,
    background: CTA_BG,
    border: `1.5px solid ${BRIGHT}`,
    borderRadius: 5,
    padding: desktop
      ? "var(--space-md) var(--space-lg)"
      : "var(--space-sm) var(--space-md)",
    boxShadow: "var(--faction-singularity-term-cta-glow)",
  };
  /** The prompt glyph. Punctuation, not copy — hidden from the a11y tree. */
  const prompt = (
    <span aria-hidden style={{ color: "inherit" }}>
      {">"}&nbsp;
    </span>
  );

  /** A commented section head: `// LABEL ------------------ gloss`. */
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
          fontFamily: MONO,
          fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
          color: BLUE_BRIGHT,
        }}
      >
        <span aria-hidden>{"// "}</span>
        {label}
      </span>
      <span aria-hidden style={{ flex: "1 1 20%", minWidth: 20, borderTop: `1px dashed ${HAIR}` }} />
      {gloss !== undefined && <span style={LABEL}>{gloss}</span>}
    </div>
  );

  // ── Window chrome: the lamps, and nothing else.
  //
  //    It carried the navigation until #2102 — a `TASKS` link on desktop, a bare
  //    `←` arrow on mobile — which made this one of the eighteen places the site
  //    drew a different breadcrumb. The trail is site chrome now and sits ABOVE
  //    the terminal, outside its frame; the lamps stay because they are the
  //    window, not the way out of it, and they are drawn at both widths for the
  //    same reason the trail is: this bar no longer changes at 768px.
  const chrome = (
    <div
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-lg)",
        background: CHROME,
        borderBottom: `1px solid ${HAIR}`,
      }}
    >
      <SingularityLamps />
    </div>
  );

  // ── Header: faction line, title ── (author + Level / In progress:
  // `credentials`, below the brief — #2120)
  const header = (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        {/* The process light — the terminal's one live thing, and the kit's own
            drawing since #2092: the composer's window bar had it in green. */}
        <SingularityProcessLight />
        <span style={{ ...LABEL, fontSize: "var(--text-base)" }}>{eyebrowFaction}</span>
        {isMetatask && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
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
          fontFamily: MONO,
          fontWeight: 400,
          fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
          lineHeight: 1.2,
          color: BRIGHT,
          margin: "0 0 var(--space-lg)",
          overflowWrap: "anywhere",
          textShadow: "var(--faction-singularity-term-halo-green)",
        }}
      >
        {task.title}
      </h1>

      {isMetatask && (
        // `LABEL`'s own `DIM` — 5.17:1 light / 5.80:1 dark on this terminal,
        // which is near-black in BOTH cascades (#2077). A light-cascade spine
        // hue on a permanently dark stage is #1792's shape exactly, and the hue
        // is a FILL besides (§3, #1932).
        <p
          style={{
            ...LABEL,
            margin: "0 0 var(--space-lg)",
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
                  border: `1px solid ${BORDER}`,
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
                  border: `1px solid ${BORDER}`,
                  fontFamily: MONO,
                  fontSize: "var(--text-lg)",
                  color: BRIGHT,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: MONO,
                fontSize: "var(--text-xl)",
                color: BRIGHT,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={LABEL}>
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Two stats. The completed count lives on the gallery heading, and there
          is deliberately NO in-progress roster on any skin — this count is the
          only place that population appears (owner ruling 2026-07-28). */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ ...LABEL, marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.level")}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
              lineHeight: 0.85,
              color: BRIGHT,
            }}
          >
            {String(task.level_required).padStart(2, "0")}
          </span>
        </div>
        <span
          aria-hidden
          style={{ width: 1, alignSelf: "stretch", minHeight: 32, background: HAIR }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ ...LABEL, marginBottom: "var(--space-xs)" }}>
            {t("detail.stats.inProgress")}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 0.85,
              color: BRIGHT,
            }}
          >
            {inProgressCount}
          </span>
        </div>
        <Rule style={{ flex: 1, minWidth: 20, marginBottom: "var(--space-sm)" }} />
      </div>
    </div>
  );

  /* THE WORTH READOUT IS THE FACTION'S OWN SCORE STAMP NOW (#2554).

     A trace line, a ×mult chip, a `Rule` and a haloed mono total stood here — a SECOND drawing of a score, beside
     the one this faction's registered `scoreStamp` surface (ADR-0049) already
     draws on every praxis card. The stamp is size-agnostic by contract, so the
     panel mounts it and the row policy, the ×1.0 gate and the total's format
     all come from the one place that owns them. */
  const scoreBody = <TaskWorthStamp state={state} />;

  // ── The one action slot. Nothing renders when the viewer has no move to make
  //    — an unusable control is worse than none.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The CARDS' control, mounted (#2554) — element and affordance from
              `CardCtaControl`, paint and geometry still this skin's, spread last. */}
          <CardCtaControl cta={cta} testId="task-signup-cta" style={primaryButton}>
            {prompt}
            {cta.label}
            <Cursor />
          </CardCtaControl>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-md)",
              lineHeight: 1.65,
              color: DIM,
              marginTop: "var(--space-sm)",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: BRIGHT }}>
                  {t("detail.signup.levelMet", { level: task.level_required })}
                </span>
              </>
            )}
          </div>
          <ErrorBanner
            message={signupError}
            style={{ fontFamily: MONO, background: PANEL, border: `1px solid ${BORDER}` }}
          />
        </div>
      )}

      {mySubmission && (
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-lg)",
              color: BRIGHT,
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
          <Link to={`/praxis/${mySubmission.id}`} style={primaryButton}>
            {prompt}
            {t("detail.submitted.view")}
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-lg)",
              color: BRIGHT,
              marginBottom: "var(--space-md)",
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
              style={{
                ...primaryButton,
                flex: 1,
                width: "auto",
                // The continue key is outlined, not lit: it is not the page's
                // one bright action once the viewer is already on the task.
                color: BRIGHT,
                background: "transparent",
                boxShadow: "none",
              }}
            >
              {prompt}
              {t("detail.inProgress.continue")}
            </Link>
            <button
              onClick={handleDrop}
              style={{
                fontFamily: MONO,
                fontSize: "var(--text-md)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: DIM,
              }}
            >
              {prompt}
              {t("detail.inProgress.drop")}
            </button>
          </div>
          <ErrorBanner
            message={signupError}
            style={{ fontFamily: MONO, background: PANEL, border: `1px solid ${BORDER}` }}
          />
        </div>
      )}
    </>
  );

  // Readout + action, two wells in one panel. 440px on desktop (dress; the other
  // designs run 420–520), full width once the column collapses — and that wide
  // only when there IS an action; see `actionColumnSize` (#1138). Alone, the
  // readout well takes the panel rather than leaving a lit-up empty half.
  const actionPanel = (
    <div
      style={{
        ...panelBox,
        padding: "var(--space-sm)",
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
          minWidth: desktop ? 160 : 118,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
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
  );

  // ── The brief, in full. No clamp, no "read more". ──
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      {task.description && (
        <div style={{ ...panelBox, padding: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
          <p
            className="content-text"
            style={{
              fontFamily: MONO,
              lineHeight: 1.7,
              color: BRIGHT,
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

  // ── Praxis gallery — live PraxisCards, expanded in place ──
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
            fontFamily: MONO,
            fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
            color: BLUE_BRIGHT,
          }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <span
          aria-hidden
          style={{ flex: "1 1 20%", minWidth: 20, borderTop: `1px dashed ${HAIR}` }}
        />
        {/* Nothing to sort until something is filed (#1704). The heading and the
            empty line below stay; only the control goes. */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              border: `1px solid ${BORDER}`,
              borderRadius: 5,
            }}
          >
            {(["score", "recent"] as const).map((sort) => {
              const on = submissionSort === sort;
              return (
                <button
                  key={sort}
                  onClick={() => setSubmissionSort(sort)}
                  style={{
                    ...LABEL,
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 4,
                    padding: "var(--space-xs) var(--space-sm)",
                    background: on ? BRIGHT : "transparent",
                    color: on ? CTA_INK : DIM,
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
          style={{ fontFamily: MONO, color: DIM, margin: 0 }}
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
                fontFamily: MONO,
                fontSize: "var(--text-lg)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: BLUE,
              }}
            >
              {prompt}
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
    <div className="py-8">
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          maxWidth: 1200,
          margin: "0 auto",
          boxSizing: "border-box",
          background: BG,
          color: INK,
          fontFamily: MONO,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: "var(--faction-singularity-term-shadow)",
        }}
      >
        {/* The standing raster — a fixed scrim over the whole session. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
            background:
              "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* The scan sweep travelling down the page. `.sg-scan` owns both the
            resting offset and the reduced-motion-guarded travel. */}
        <div
          aria-hidden
          className="sg-scan"
          style={{
            position: "absolute",
            left: "-30%",
            right: "-30%",
            height: 40,
            pointerEvents: "none",
            zIndex: 4,
            background: "var(--faction-singularity-term-sweep)",
          }}
        />

        {chrome}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: desktop
              ? "var(--space-2xl) var(--space-2xl) var(--space-3xl)"
              : "var(--space-lg) var(--space-md) var(--space-xl)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: desktop ? "row" : "column",
              alignItems: desktop ? "flex-start" : "stretch",
              gap: desktop ? "var(--space-2xl)" : "var(--space-xl)",
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
            {/* Comments — the shared slot, active-task gated (ADR-0006, #1030). */}
            <TaskDetailComments
              state={state}
              heading={sectionHead(t("detail.comments.heading"))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
