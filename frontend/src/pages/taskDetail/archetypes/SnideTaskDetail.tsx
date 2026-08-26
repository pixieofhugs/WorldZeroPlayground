import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
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
 * S.N.I.D.E. — THE RANSOM DOSSIER (task detail v2, #1035).
 *
 * The shared task-detail anatomy (#1030) in SNIDE's dress: a ransom-note dossier
 * photocopied one too many times. A near-black header bar with a broken acid
 * rule, a headline cut from four faces word by word, redaction rules ruling off
 * every section, the points circled in pink pen inside an acid action plate that
 * sits half a degree off true, and hard offset shadows with no blur — it is
 * printed, not floating. Anton, Archivo Black, Special Elite and Permanent
 * Marker all appear, because a ransom note mixes faces by definition.
 *
 * Replaces the 794-line "case file" archetype (`caseFile`, `jobFile`,
 * `openCase`, `casesClosed`, `accomplices`, `evidence.*`, `topMarks`,
 * `verdict.*`). Those `tasks:snide.*` keys are gone: #1039 kept them on the
 * theory the faction pages shared the namespace, #1068's per-key sweep found no
 * reader outside the dormant mobile twin it had just deleted, and the whole
 * namespace went with it.
 *
 * THE CENSOR REDACTS ORNAMENT, NEVER CONTENT. The design blacks out two words of
 * every brief paragraph (`background: ink, color: transparent`) — over the task's
 * real instructions. That is the same word-level strike #1023 already ruled out
 * of the task card, and the ruling holds harder here, where the brief is the
 * only place a player learns what to actually do. What carries the metaphor
 * instead is `.snd-censor`, a decorative strip of redaction blocks used as a
 * rule, plus the cut-up headline, which RESTYLES words rather than destroying
 * them. Do not reintroduce the strike.
 *
 * Contract points inherited from the na reference build, not re-derived:
 * - **No in-progress roster.** The header's "In progress" count is the only
 *   place that population appears (owner ruling 2026-07-28, reversing epic
 *   #1028 decision 3 — and this design flagged the omission first).
 * - **The `×mult` badge renders only off the identity factor**, read raw from
 *   the state contract, never reconstructed as `modifiedPoints / basePoints`
 *   (ADR-0053's dead-arithmetic trap, ADR-0055's rule). `era_1` neutralises
 *   every faction, so it is correctly invisible today.
 * - **Copy is shared and neutral** (`detail.*`, ADR-0057). The design's words —
 *   "The task", "submissions", "highest scored", "Comments", "take the job" —
 *   are dress notes, not authority.
 * - **Comments mount the shared `TaskDetailComments` slot**, which owns the
 *   `status === "active"` gate and suppresses the thread's own heading so this
 *   page carries one dressed section head, not two (ADR-0006).
 * - The gallery expands **in place**. It deliberately does not link out to
 *   `/praxis?task_id=N` — the reader stays on the task. That URL does filter
 *   properly since #1050; before it, it silently showed the whole feed.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0058): `useFormFactor()` picks the size set and
 * drops the two-column split. The separate Snide mobile skin and the manifest
 * surface that held it were deleted by #1068 when the ADR was accepted.
 *
 * ## TWO GROUNDS, and only one of them flips (#2066)
 *
 * The WALL is `.snd-detail-sheet`, the flyposted xerox column shared with the
 * praxis-detail page so the two cannot drift. It flips under
 * `[data-theme="dark"]`, and the type printed straight onto it flips with it:
 * that is what the `--faction-snide-note-*` inks are for, and all they are for.
 *
 * Every SHEET pasted on that wall — the brief, and the two boxes punched into
 * the action plate — is a black slab instead, `--faction-snide-card-*`: the
 * photocopier ink S.N.I.D.E.'s praxis card and praxis-detail page already print
 * on. The owner's ruling is that a clipping cut from the same stock as the wall
 * stops reading as a thing pasted ON something.
 *
 * **The move is a PAIRING, not a repaint.** `-note-ink` is `#14110b` by day and
 * `#f4f1e8` by night, so pinning a ground black and leaving that ink on it is
 * black type on a black sheet in light mode — the WOW-masthead failure shape at
 * 1.08:1. `-card-text` is cream in BOTH themes on a ground that is black in
 * both, measured as a pair. So nothing on a slab may read a token that flips,
 * and the two families do not mix: `PLATE_*` on a slab, `INK`/`MUTED`/`PINK_INK`
 * on the wall. The `-note-*` CTA, knockout and masthead-bar pairs are unaffected
 * — all three were already black-grounded and already invariant in the pair.
 *
 * The theme-invariant `--faction-snide-*` pigments still draw every LINE (the
 * pen circle, the X marks, the hazard tape, printed borders and shadows), which
 * is the faction's standing rule: acid and pink are a ring, a rule or a fill,
 * never an ink on paper. On the slab acid IS an ink — that is what a black
 * ground buys — and there it is spelt `--faction-snide-card-accent`.
 */

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARK = "var(--faction-snide-font-marker)"; /* Permanent Marker */

/**
 * The WALL's inks, which SWAP under the dark cascade because the wall does.
 * They belong to type printed straight on it — the headline cuts, breadcrumb,
 * byline, section heads, header stats. NOTHING ON A SLAB READS THEM (#2066).
 */
const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
/** The pink that is TEXT on the wall (AA-walked), not the pink that is a line. */
const PINK_INK = "var(--faction-snide-note-pink-ink)";
/**
 * The SLAB — every sheet pasted on the wall, black in BOTH themes, with the ink
 * family it was measured against. Acid carries type only here.
 */
const PLATE = "var(--snd-task-paper)";
const PLATE_TEXT = "var(--snd-task-ink)";
const PLATE_MUTED = "var(--snd-task-quiet)";
const PLATE_ACCENT = "var(--snd-task-accent)";
/** The pink that is a DRAWN LINE — pen circle, strike-out cross. Invariant. */
const PINK = "var(--faction-snide-pink)";
/** Photocopier black that does NOT flip: borders and shadows printed on acid. */
const HARD = "var(--faction-snide-ink)";

/**
 * Praxis cards shown before the gallery expands. The row is `.praxis-gallery`,
 * which narrows `PraxisCard`'s basis from the feed's 394px to 320px (#1137), so
 * three land in a row at the 1200 cap instead of two.
 */
const GALLERY_PREVIEW = 3;

/**
 * The four sources the headline is cut from — the same four the task card uses,
 * so one title cuts identically wherever it appears. A word takes its cut by
 * index off the task's own id, so no two neighbours share a face.
 *
 * Cut 2 is a knockout and names its own pair rather than reusing paper/ink:
 * those two swap under the dark cascade, and a knockout that swaps with its
 * ground is an invisible word.
 */
const CUTS: CSSProperties[] = [
  { fontFamily: IMPACT, color: INK, textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: IMPACT,
    color: "var(--faction-snide-note-cta-ink)",
    background: "var(--faction-snide-acid)",
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: BLACK,
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the knockout's 1px bleed IS the drawn cut; a 4px rung fattens it into a label chip.
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: a cut's size is RELATIVE to the headline it was pasted into, not a tier of the type scale.
    fontSize: "0.8em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: TYPE,
    color: INK,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above; the smallest cut, clipped from body copy rather than a headline.
    fontSize: "0.7em",
    textTransform: "uppercase",
    borderBottom: `3px solid ${PINK}`,
    transform: "rotate(1.2deg)",
  },
];

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

/** A tiled strip of redaction blocks. `.snd-censor` owns its pigments (#1023). */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

/** The struck-out cross that flanks every call to action. */
function XMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto", transform: "rotate(-6deg)" }}
    >
      <g fill="none" stroke={PINK} strokeWidth="2.6" strokeLinecap="round">
        <path d="M3.5 3 C8 7.5 12 12 16.5 17.5" />
        <path d="M16.5 3.5 C12.5 7 8 12 3 16.5" />
      </g>
    </svg>
  );
}

export default function SnideTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
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

  /** Special Elite, uppercase, wide — every micro-label on the sheet. */
  const eyebrow: CSSProperties = {
    fontFamily: TYPE,
    fontSize: "var(--text-md)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: MUTED,
  };
  /**
   * A sheet pasted on the wall: the black slab, ruled in acid, with the same
   * hard printed shadow. The raster grain went with the stock (#2066) — it was
   * a translucent BLACK in light, which the black ground swallows whole, and a
   * screen that only prints in one theme is dress that disagrees with itself.
   */
  const panel: CSSProperties = {
    background: PLATE,
    border: `2px solid var(--faction-snide-acid)`,
    boxShadow: "var(--faction-snide-note-shadow)",
    color: PLATE_TEXT,
    boxSizing: "border-box",
  };
  /** A box punched into the acid plate. Its border is printed, so invariant. */
  const innerBox: CSSProperties = {
    background: PLATE,
    border: `3px solid ${HARD}`,
    color: PLATE_TEXT,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };
  /**
   * The skewed, hard-shadowed call to action. `done` inverts it — near-black
   * plate, acid rule, pink shadow — so "continue" never looks like "sign up".
   *
   * The done shadow takes the INVARIANT pink now (#2066): it is a drawn block
   * that falls on the slab, and the slab does not flip, so the walked
   * `-note-pink-ink` it used to wear would have been the one value on this sheet
   * that changed character between themes. The `done` FILL is deliberately left
   * as printed photocopier black, which is `-card-bg`'s own light value — see
   * the note on the base chip in `worth`.
   */
  const plateButton = (done: boolean): CSSProperties => ({
    position: "relative",
    boxSizing: "border-box",
    width: "100%",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    background: done ? HARD : "var(--faction-snide-note-cta-bg)",
    color: done ? "var(--faction-snide-acid)" : "var(--faction-snide-note-cta-ink)",
    fontFamily: IMPACT,
    fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    border: `3px solid ${done ? "var(--faction-snide-acid)" : HARD}`,
    padding: desktop ? "var(--space-lg) var(--space-xl)" : "var(--space-md)",
    boxShadow: `7px 7px 0 ${done ? PINK : HARD}`,
    transform: "skewX(-4deg) rotate(-0.8deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
  });
  /** The label rides back out of the button's skew so it stays readable. */
  const plateLabel: CSSProperties = { transform: "skewX(4deg)" };

  /** A slab headline with a redaction rule running out of it. */
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
          fontFamily: IMPACT,
          fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
          lineHeight: 1.02,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: INK,
        }}
      >
        {label}
      </span>
      <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
      {gloss !== undefined && <span style={eyebrow}>{gloss}</span>}
    </div>
  );

  /** A caption over a slab numeral — level, in progress. */
  const statBlock = (label: ReactNode, value: ReactNode, big: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
      <span style={{ ...eyebrow, letterSpacing: "0.18em" }}>{label}</span>
      <span
        style={{
          fontFamily: IMPACT,
          fontSize: big
            ? desktop
              ? "var(--text-display)"
              : "var(--text-heading)"
            : desktop
              ? "var(--text-heading)"
              : "var(--text-title)",
          lineHeight: 0.82,
          color: INK,
          transform: big ? "rotate(-1.5deg)" : "none",
        }}
      >
        {value}
      </span>
    </div>
  );

  /* THE WORTH READOUT IS THE FACTION'S OWN SCORE STAMP NOW (#2554).

     A base chip, a ×mult annotation and the shared `PenCircle` loop stood here — a SECOND drawing of a score, beside
     the one this faction's registered `scoreStamp` surface (ADR-0049) already
     draws on every praxis card. The stamp is size-agnostic by contract, so the
     panel mounts it and the row policy, the ×1.0 gate and the total's format
     all come from the one place that owns them. */
  const worth = <TaskWorthStamp state={state} />;

  // ── The one action slot. Nothing renders when the viewer has no move: an
  //    unusable control is worse than none.
  const actionBody = (
    <>
      {cta && (
        <div>
          <LevelJumpBanner state={state} />
          {/* The CARDS' control, mounted (#2554) — element and affordance from
              `CardCtaControl`, paint and geometry still this skin's, spread last. */}
          <CardCtaControl cta={cta} testId="task-signup-cta" style={plateButton(false)}>
            <XMark size={17} />
            <span style={plateLabel}>{cta.label}</span>
            <XMark size={17} />
          </CardCtaControl>
          <div
            style={{
              fontFamily: TYPE,
              fontSize: "var(--text-md)",
              lineHeight: 1.55,
              textAlign: "center",
              color: PLATE_MUTED,
              marginTop: "var(--space-lg)",
            }}
          >
            {t("detail.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
            {!levelJumpSignup && (
              <>
                {" · "}
                <span style={{ color: PLATE_ACCENT }}>
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
              fontFamily: MARK,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 1.2,
              color: PLATE_TEXT,
              marginBottom: "var(--space-md)",
              transform: "rotate(-1.4deg)",
            }}
          >
            {t("detail.submitted.text")}
          </div>
          {/* The READ page, not `/edit` (#1397). `mySubmission` comes out of
              the submitted-only gallery fetch, and `/edit` redirects a
              submitted praxis straight back to `/praxis/:id` (#1164) — so this
              button used to change nothing at all. Reopening for editing lives
              on the praxis page, one honest hop away. */}
          <Link to={`/praxis/${mySubmission.id}`} style={plateButton(true)}>
            <XMark size={17} />
            <span style={plateLabel}>{t("detail.submitted.view")}</span>
            <XMark size={17} />
          </Link>
        </div>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <div>
          <div
            style={{
              fontFamily: MARK,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 1.2,
              color: PLATE_TEXT,
              marginBottom: "var(--space-md)",
              transform: "rotate(-1.4deg)",
              textDecoration: `underline 3px ${PINK}`,
              textDecorationSkipInk: "none",
            }}
          >
            {t("detail.inProgress.text")}
          </div>
          <Link to={`/praxis/${inProgressPraxisId}/edit`} style={plateButton(true)}>
            <XMark size={17} />
            <span style={plateLabel}>{t("detail.inProgress.continue")}</span>
            <XMark size={17} />
          </Link>
          <button
            onClick={handleDrop}
            style={{
              display: "block",
              width: "100%",
              cursor: "pointer",
              textAlign: "center",
              background: "none",
              border: "none",
              marginTop: "var(--space-lg)",
              padding: 0,
              fontFamily: TYPE,
              fontSize: "var(--text-md)",
              letterSpacing: "0.1em",
              // UNDERLINE, NOT LINE-THROUGH (#2214). A struck-through word
              // is the universal mark for something that no longer applies, so
              // both this skin and S.N.I.D.E.'s drew the one control on the
              // panel that IS available as the one that is not. The quiet
              // affordance the design wanted is a rule under the word, which is
              // what the other seven archetypes already draw.
              textDecoration: "underline",
              color: PLATE_MUTED,
            }}
          >
            {t("detail.inProgress.drop")}
          </button>
          <ErrorBanner message={signupError} />
        </div>
      )}
    </>
  );

  // The action plate: an acid sheet stapled half a degree off true, hazard tape
  // along its head, two punched boxes inside. 452px on desktop (dress; the other
  // skins run 420–520), full width once the column collapses.
  const actionPlate = (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        background: "var(--faction-snide-note-cta-bg)",
        border: `3px solid ${HARD}`,
        boxShadow: `10px 10px 0 ${PINK}, var(--faction-snide-note-shadow)`,
        transform: "rotate(-0.6deg)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: 14,
          background: `repeating-linear-gradient(45deg, var(--faction-snide-note-cta-bg) 0 9px, ${HARD} 9px 18px)`,
        }}
      />
      <div
        style={{
          position: "relative",
          padding: "var(--space-sm)",
          display: "flex",
          gap: "var(--space-sm)",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            ...innerBox,
            // Alone in the plate (no move for this viewer, #1138) the worth
            // sheet takes the whole width rather than sitting beside a gap.
            flex: hasAction ? "0 0 auto" : "1 1 auto",
            minWidth: desktop ? 178 : 132,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // The dot screen inverts with the sheet: it was photocopier black on
            // cream, which on the slab prints black-on-black in light. Newsprint
            // grey is the slab's own quiet pigment and is light in both themes.
            backgroundImage:
              `radial-gradient(${PLATE_MUTED} 22%, transparent 23%), radial-gradient(${PLATE_MUTED} 22%, transparent 23%)`,
            backgroundSize: "6px 6px, 6px 6px",
            backgroundPosition: "0 0, 3px 3px",
          }}
        >
          {/* The halftone reads through at the edges only — the sheet is a
              photocopy of a photocopy, not a dot-screen illustration. */}
          <span aria-hidden="true" style={{ position: "absolute", inset: 3, background: PLATE, opacity: 0.86 }} />
          <span style={{ position: "relative" }}>{worth}</span>
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
              padding: desktop ? "var(--space-xl)" : "var(--space-lg)",
            }}
          >
            {actionBody}
          </div>
        )}
      </div>
    </div>
  );

  // ── Header: breadcrumb, the bar, the cut-up headline ── (byline + stats: `credentials`, below the brief — #2120)
  const header = (
    <div>
      {/* The masthead bar — the faction line, a broken acid rule, and (only on
          a metatask) the classification stamp. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
          padding: "var(--space-sm) var(--space-md)",
          background: "var(--faction-snide-note-bar)",
        }}
      >
        <span
          style={{
            fontFamily: IMPACT,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: cut-out wordmark; Anton at a label-ramp size stops reading as a masthead.
            fontSize: 20,
            letterSpacing: "0.06em",
            lineHeight: 1,
            textTransform: "uppercase",
            color: "var(--faction-snide-acid)",
          }}
        >
          {eyebrowFaction}
        </span>
        <span
          aria-hidden="true"
          style={{
            flex: 1,
            minWidth: 24,
            height: 3,
            background:
              "repeating-linear-gradient(90deg, var(--faction-snide-acid) 0 6px, transparent 6px 10px)",
          }}
        />
        {isMetatask && (
          <span
            style={{
              fontFamily: BLACK,
              fontSize: "var(--text-md)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              padding: "var(--space-xs) var(--space-sm)",
              transform: "rotate(-2deg)",
              whiteSpace: "nowrap",
              // na → rainbow frame; a real faction → solid hue + on-fill ink.
              ...factionFill(task.metatask_faction_slug, "pill"),
            }}
          >
            {t("detail.meta")}
          </span>
        )}
      </div>

      {/* The headline, cut from four sources word by word.
          IT MUST STAY ONE READABLE STRING. The design lays the cuts out as a
          wrapping FLEX row spaced with `gap`, which is a purely visual space: a
          flex container discards whitespace-only children, so the heading's text
          content came out as "Namethethingeveryone…". Ordinary inline flow
          instead — the cuts are `inline-block`, separated by REAL spaces, and
          they still wrap, still share a baseline, still carry their grounds
          (the same fix #1023 made on the task card). */}
      <h1
        style={{
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.3,
          margin: "0 0 var(--space-lg)",
        }}
      >
        {task.title.split(/\s+/).map((word, index) => (
          <span key={`${index}-${word}`}>
            {index > 0 ? " " : ""}
            <span
              style={{
                display: "inline-block",
                maxWidth: "100%",
                overflowWrap: "anywhere",
                ...CUTS[(index + task.id) % CUTS.length],
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </h1>

      {isMetatask && (
        <p
          style={{
            ...eyebrow,
            color: PINK_INK,
            margin: "0 0 var(--space-md)",
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
                  flex: "none",
                  borderRadius: "50%",
                  objectFit: "cover",
                  boxShadow: `0 0 0 2px ${INK}`,
                }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  flex: "none",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${INK}`,
                  fontFamily: TYPE,
                  fontSize: "var(--text-lg)",
                  color: INK,
                }}
              >
                {initialsOf(authorName)}
              </span>
            )}
            <span
              style={{
                fontFamily: TYPE,
                fontSize: "var(--text-xl)",
                color: INK,
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
              }}
            >
              {authorName}
            </span>
          </Link>
          <span style={eyebrow}>
            {t("detail.author", { level: task.created_by_level ?? 0 })}
          </span>
        </div>
      )}

      {/* Header stats. Exactly two — the completed count lives on the gallery
          heading, and there is deliberately no roster. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: desktop ? "var(--space-xl)" : "var(--space-lg)",
          flexWrap: "wrap",
        }}
      >
        {statBlock(t("detail.stats.level"), task.level_required, true)}
        <span
          aria-hidden="true"
          style={{
            width: 2,
            alignSelf: "stretch",
            minHeight: 34,
            background: "var(--faction-snide-note-rule)",
          }}
        />
        {statBlock(t("detail.stats.inProgress"), inProgressCount, false)}
      </div>
    </div>
  );

  // ── The brief, in full. No clamp, no "read more", and NOT ONE WORD REDACTED:
  //    the censor rules the section off, it does not eat the instructions.
  const brief = (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.brief.heading"))}
      <div style={{ ...panel, padding: desktop ? "var(--space-xl)" : "var(--space-lg)" }}>
        {task.description && (
          <p
            className="content-text"
            style={{
              fontFamily: TYPE,
              lineHeight: 1.55,
              color: PLATE_TEXT,
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {task.description}
          </p>
        )}
      </div>
    </section>
  );

  // ── The praxis gallery: live PraxisCards, expanded in place ──
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
            fontFamily: IMPACT,
            fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            color: INK,
          }}
        >
          {t("detail.gallery.heading", { count: submissions.length })}
        </span>
        <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
        {/* Nothing to sort until something is filed (#1704). The heading and the
            empty line below stay; only the control goes. */}
        {sortedSubmissions.length > 0 && (
          <span
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              // A chip of the same slab, so its edge is drawn in acid rather
              // than in an ink that would print black-on-black in light.
              border: `2px solid var(--faction-snide-acid)`,
              background: PLATE,
            }}
          >
            {(["score", "recent"] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSubmissionSort(sort)}
                style={{
                  cursor: "pointer",
                  border: "none",
                  fontFamily: TYPE,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  padding: "var(--space-sm) var(--space-md)",
                  background:
                    submissionSort === sort ? "var(--faction-snide-note-cta-bg)" : "transparent",
                  color:
                    submissionSort === sort
                      ? "var(--faction-snide-note-cta-ink)"
                      : PLATE_MUTED,
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
        <p className="content-text" style={{ fontFamily: TYPE, color: MUTED, margin: 0 }}>
          {t("detail.gallery.empty")}
        </p>
      ) : (
        <>
          {/* `snd-detail-praxis` is the ONE surface where the praxis card is
              black rather than the wall (#2177). It is this row's own class, not
              `.praxis-gallery`: that one is mounted by `WowFactionBody` too, and
              a Snide-task praxis lands there. The class carries no paint — it
              sets the `--snd-praxis-*` channel the card reads (index.css). */}
          <div className="praxis-gallery snd-detail-praxis flex flex-wrap gap-4 items-start">
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
                marginTop: "var(--space-lg)",
                cursor: "pointer",
                border: "none",
                fontFamily: IMPACT,
                fontSize: "var(--text-content)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: "var(--faction-snide-note-cta-bg)",
                color: "var(--faction-snide-note-cta-ink)",
                padding: "var(--space-sm) var(--space-md)",
                transform: "rotate(-0.8deg)",
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
        ...factionRoleVars("snide", "snd-task"),
        position: "relative",
        fontFamily: TYPE,
        color: INK,
      }}
    >
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail on every page — see components/nav/Breadcrumb. */}
      <Breadcrumb taskId={task.id} taskTitle={task.title} />

      {/* The flyposted xerox wall, painted on the detail COLUMN rather than the
          viewport: the owner's rule for this surface is that the site background
          still shows around the component (QA on #1055, then #1057). This used
          to mount `.snide-backdrop`, which is `position: fixed` because the
          faction-context pages that share it DO want the whole page. index.css
          now splits that rule — one paint, two mounts — so the wall cannot drift
          between them. */}
      <div
        className="snd-detail-sheet"
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
              ...actionColumnSize({ desktop, hasAction, width: 452 }),
              marginTop: desktop ? "var(--space-xl)" : 0,
            }}
          >
            {actionPlate}
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
