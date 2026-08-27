/**
 * The waiting surface (#1080, ADR-0059) — what the composer becomes once you
 * have approved a multi-party praxis and it is waiting on somebody else.
 *
 * Approving a live proposal, or sealing a duel side, no longer navigates.
 * `publish()` holds, the faction's archetype swaps this in for its own composer
 * regions, and the player stays somewhere that can still let them back into
 * their own text. The public read view could show roster state but offers no
 * authoring exit, and putting author-only controls on a public page is exactly
 * what #646 undid.
 *
 * **It is a reading, not a lock** (ADR-0079, #1811). #1745 froze the document
 * while a collab's window ran, so this surface was also the *reason* the text
 * could not be edited; the freeze is retired, the room takes writes in every
 * status a member can reach, and the re-entry below is the deliberate door
 * ADR-0059 wanted rather than the only one there is. What it costs is the whole
 * proposal — the countdown stops and every approval clears — which is why it
 * still asks first.
 *
 * ## Dressed, not neutral (#1189, closing #1071 decision 7)
 *
 * #1071 shipped this as one shared TOKEN-THEMED surface and deferred the frames
 * by name — "per-faction frames are a follow-up wave if it reads flat once
 * live". It read flat. This is the wave, and the seam it takes is the one
 * ADR-0065 §2 describes for the whole composer: **one shared layout, dressed per
 * faction.**
 *
 * So the LOGIC below is still one file for every faction — which reading to
 * draw, which exits apply, who may be nudged, whether a clock has anything to
 * count. What changed is that the ORNAMENT arrives as a {@link ComposerDress}
 * from the archetype that is already mounted, and the surface assembles itself
 * from the same `shared.tsx` blocks the composer does: the same page, the same
 * sheet, the same masthead, the same ground, the same section rule, the same
 * status mark. The design draws this as `edit-praxis.jsx` with `stage="awaiting"`
 * for exactly this reason — pressing Submit must not change the page's dress.
 *
 * The `masthead`, `ground` and `rule` in a dress are the SAME ELEMENTS the
 * composer mounts, named once in the archetype and handed to both, so there is
 * no second copy of a faction's ornament to drift. See the dress's own note in
 * `archetypes/shared.tsx` for why this is a prop rather than a registry.
 *
 * The breadcrumb comes with the dress too. It used to be drawn by
 * `EditPraxis.tsx`, gated on `waiting`, because this surface painted none of its
 * own; now it draws one exactly as every archetype does, and the dispatcher
 * draws none. Exactly one, in every state and at every width.
 *
 * ## Copy is neutral, and already was
 *
 * Every key this surface reads resolves to the shared `editPraxis.collab.*`
 * block: no faction overrides a single `awaiting*`, `completed*` or `duel*` key.
 * `collabCopy(slug, …)` is kept rather than swapped for a bare `t()` because the
 * resolver is the contract the roster and the footer share — the neutrality is a
 * fact about the catalog, not a thing this file enforces. ADR-0065 §3 is
 * therefore already satisfied here, and the stage words the status row gained
 * (`Submitted` / `Sealed`) are neutral `editPraxis.composer.*` keys, sitting
 * beside `Draft` in the same slot the composer's status row uses.
 *
 * Nudge (#1083) landed after this surface and is drawn here now — but not as the
 * design drew it. The design's `setNudged({...})` was local React state: the
 * button flipped to "Nudged" and nothing left the browser, so it read as sent
 * when it wasn't, a reload un-nudged it, and you could poke forever. This one
 * writes, is rate-limited to one per person per praxis per 24h on the server,
 * lands in the recipient's activity feed, and reads its disabled state from
 * `nudged_at` on the wire. It appears only where the rule allows: on a collab
 * member who has not cast (and only once YOU have), and on a duel rival while
 * the duel is `active`.
 *
 * The design's footer button — **Nudge the crew** — arrives with #1418 and sits
 * beside the authoring re-entry. It is one request, not a fan-out: the server
 * derives the crew from the roster and applies the same per-person 24h window,
 * which is what keeps the cooldown from being re-implemented here. The
 * consequence the design did not draw is that a press is routinely PART
 * refused, so the footer reports what it did rather than going quiet — and the
 * report outlives the button, which disappears the moment the last nudgeable
 * member has been nudged.
 *
 * Two things the design draws that are still deliberately absent:
 *  - **A duel countdown.** Nothing backs one (see `waitingClock.ts`). The duel
 *    gets a plain elapsed line; the ring is the collab's.
 *  - **"Forfeit the duel".** The design offers it at `active` and hides it at
 *    `settled`, which is backwards: forfeit begins only once a duel is settled
 *    (ADR-0011 §Forfeit). Before that, taking your entry back costs nothing, so
 *    that is what the footer says.
 *
 * COMPLETED READING (#1164). Once everybody is in, this same surface takes the
 * `phase === "completed"` reading instead: the roster with every member
 * submitted, a confirmation beat that says so, the write-up still read-only, and
 * a **Read the praxis** link out. It replaces what `/edit` used to draw for a
 * published multi-party praxis — a LOCKED COMPOSER, a third read-only rendering
 * of a praxis beside the detail page and this one. Owner ruling: no locked
 * composer, and no redirect either, because a crew is worth confirming to. A
 * published *solo* praxis has no roster and nothing to confirm, so that one does
 * redirect; `deriveEditPraxisPhase` calls it `handoff`.
 *
 * The completed reading draws no exits. Every control the waiting reading offers
 * — re-open my part, leave, delete, nudge, kick — either no longer applies or is
 * refused by the backend once the praxis is `submitted`, and the one thing left
 * to do with a published praxis is read it.
 *
 * TESTABILITY. The harness is `renderToStaticMarkup`: no DOM, no effects, so a
 * component that fetches its own data cannot be asserted on. Everything here
 * renders from `EditPraxisState` plus two injectable scalars (`autoSubmitDays`,
 * `now`), and the clock arithmetic lives in `waitingClock.ts` as a pure
 * function. `useGameConfig` is still the production source of the window
 * length; the prop only overrides it.
 */
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { DuelSideOut } from "../../../api/duel";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { collabCopy } from "../../../components/collab/collabCopy";
import { RosterAvatar } from "../../../components/collab/RosterAvatar";
import { waitingOnHeading } from "../../../components/collab/waitingHeading";
import { duelSides } from "../../../components/duel/shared";
import { useGameConfig } from "../../../hooks/useGameConfig";
import { factionCssVar } from "../../../utils/factions";
import { relativeTime } from "../../../utils/dates";
import MarkdownPreview from "../blocks/MarkdownPreview";
import {
  ComposerFooter,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ComposerStatusRow,
  ErrorBanner,
  TaskSlip,
  composerLabelStyle,
  composerStageWord,
  useComposerSizes,
  type ComposerDress,
} from "../archetypes/shared";
import type { EditPraxisState } from "../useEditPraxis";
import { collabPublishWindow } from "./waitingClock";
import Breadcrumb from "../../../components/nav/Breadcrumb";

/* -------------------------------------------------------------------------- */
/* The publish ring — collab only                                             */
/* -------------------------------------------------------------------------- */

// Ornament geometry, not spacing: these are the drawn dimensions of one dial,
// which WORLD_ZERO_STYLE §4a leaves in raw pixels on purpose.
const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The ADR-0012 pending-publish countdown, drawn as the design's dial.
 *
 * Renders nothing at all when the window is unknowable — no `submit_proposed_at`
 * on the praxis, or `/game-config` not yet in hand. The duration is an
 * `EraConfig` value and is never assumed; a blank slot beats a wrong number.
 *
 * The dial is the one countdown on this surface with real data behind it, so it
 * takes the skin's accent and panel rather than the page's neutral chrome. Both
 * fall back to the token defaults when a dress leaves them out.
 */
export function CollabPublishClock({
  submitProposedAt,
  autoSubmitDays,
  factionSlug,
  now,
  accent,
  panelStyle,
  labelStyle,
  bodyStyle,
}: {
  submitProposedAt: string | null | undefined;
  autoSubmitDays: number | null | undefined;
  factionSlug: string | null | undefined;
  now?: number;
  accent?: string;
  panelStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  bodyStyle?: CSSProperties;
}) {
  const publishWindow = collabPublishWindow(submitProposedAt, autoSubmitDays, now);
  if (!publishWindow) return null;
  const ink = accent ?? factionCssVar(factionSlug, "card-accent");

  return (
    <section
      className="flex items-center gap-4"
      style={{
        border: `1px solid var(--color-border-strong)`,
        borderRadius: 8,
        padding: "var(--space-md) var(--space-lg)",
        background: "var(--color-bg-surface)",
        ...panelStyle,
      }}
    >
      <div
        role="img"
        aria-label={collabCopy(factionSlug, "awaitingClockAria", {
          days: publishWindow.daysLeft,
          hours: publishWindow.hoursLeft,
        })}
        style={{
          position: "relative",
          width: RING_SIZE,
          height: RING_SIZE,
          flexShrink: 0,
        }}
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          aria-hidden
          style={{ transform: "rotate(-90deg)", display: "block" }}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            style={{ stroke: "var(--color-border-strong)" }}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - publishWindow.fraction)}
            style={{ stroke: ink }}
          />
        </svg>
        <span
          className="flex flex-col items-center justify-center"
          style={{ position: "absolute", inset: 0, lineHeight: 1.1 }}
        >
          <span
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: ink,
              ...bodyStyle,
            }}
          >
            {publishWindow.lapsed
              ? collabCopy(factionSlug, "awaitingClockLapsed")
              : collabCopy(factionSlug, "awaitingClockDays", {
                  days: publishWindow.daysLeft,
                })}
          </span>
          {!publishWindow.lapsed && (
            <span style={composerLabelStyle(labelStyle)}>
              {collabCopy(factionSlug, "awaitingClockHours", {
                hours: publishWindow.hoursLeft,
              })}
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span style={composerLabelStyle({ color: ink, ...labelStyle })}>
          {collabCopy(factionSlug, "awaitingClockLabel")}
        </span>
        {/* The rule the dial is counting down to, said in words — a ring alone
            never explains that nobody has to do anything for it to fire. */}
        <p
          className="content-text"
          style={{ color: "var(--color-text-secondary)", ...bodyStyle }}
        >
          {collabCopy(factionSlug, "awaitingClockCaption", {
            days: autoSubmitDays ?? 0,
          })}
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Duel: the two sides                                                        */
/* -------------------------------------------------------------------------- */

function SideAvatar({ side }: { side: DuelSideOut }) {
  return (
    <RosterAvatar
      name={side.display_name}
      // The portrait, with the monogram as the fallback (#2128) — the same read
      // the composer's duel pair makes at 52, through the same leaf.
      avatarUrl={side.avatar_url}
      size={28}
      // The SIDE's own faction, never the page's: a duel is the one place two
      // factions share a surface, and the avatar is who is speaking.
      background={factionCssVar(side.faction_slug, "light")}
      borderColor={factionCssVar(side.faction_slug, "border")}
    />
  );
}

/**
 * One side of the duel.
 *
 * The rival's panel carries a placeholder rather than a body because the body is
 * genuinely not on the wire: `_duel_side_hidden_condition` (#999) hides a duel
 * side from everyone but its author while the duel is live and incomplete,
 * through the one helper both visibility doors share. This labels that rule; it
 * does not implement it.
 */
function DuelSidePanel({
  side,
  mine,
  factionSlug,
  dress,
  title,
  body,
  completed,
  onNudge,
}: {
  side: DuelSideOut;
  mine: boolean;
  factionSlug: string | null | undefined;
  dress: ComposerDress;
  title?: string;
  body?: string;
  /**
   * The duel is over (#1164), so "sealed until they submit" is no longer the
   * reason the rival's entry is missing. It is still missing — reading the two
   * entries side by side was deliberately cut from the composer and lives on
   * #1084 — so the placeholder points at the page that does hold both.
   */
  completed?: boolean;
  /**
   * Poke the rival (#1083). Passed only for the rival's panel, and only while
   * the duel is `active` — the caller owns that condition because it is the one
   * holding the duel status. Never passed for your own side.
   */
  onNudge?: () => void | Promise<void>;
}) {
  const accent = dress.accent;
  const nudged = side.nudged_at != null;
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        flex: "1 1 260px",
        minWidth: 0,
        borderRadius: 8,
        background: "var(--color-bg-surface)",
        ...dress.panelStyle,
        // Your own side is the one the skin's accent claims; the rival's stays
        // dashed and un-owned, which is the whole read of a sealed duel.
        border: mine
          ? `1.5px solid ${accent}`
          : "1.5px dashed var(--color-border-strong)",
        padding: "var(--space-md)",
      }}
    >
      <div className="flex items-center gap-2">
        <SideAvatar side={side} />
        <span className="content-text" style={{ flex: 1, minWidth: 0 }}>
          {side.display_name}
          {mine && (
            <span style={dress.quietStyle ?? { color: "var(--color-text-tertiary)" }}>
              {" · "}
              {collabCopy(factionSlug, "you")}
            </span>
          )}
        </span>
        <span
          style={composerLabelStyle({
            ...dress.labelStyle,
            color: side.is_submitted
              ? accent
              : (dress.quietStyle?.color ?? "var(--color-text-tertiary)"),
          })}
        >
          {side.is_submitted
            ? collabCopy(factionSlug, "duelPillSubmitted")
            : collabCopy(factionSlug, "duelPillWriting")}
        </span>
      </div>
      {onNudge && (
        <button
          type="button"
          disabled={nudged}
          onClick={() => void onNudge()}
          aria-label={collabCopy(
            factionSlug,
            nudged ? "nudgeSentAria" : "duelNudgeAria",
            { name: side.display_name },
          )}
          className="self-start px-2 py-1"
          style={composerLabelStyle({
            ...dress.quietButtonStyle,
            borderRadius: 4,
            border: `1px solid ${nudged ? "var(--color-border)" : accent}`,
            background: "transparent",
            color: nudged
              ? (dress.quietStyle?.color ?? "var(--color-text-tertiary)")
              : accent,
            cursor: nudged ? "default" : "pointer",
          })}
        >
          {collabCopy(factionSlug, nudged ? "nudgeSentAction" : "nudgeAction")}
        </button>
      )}
      {/* What the poke costs the rival, in visible text (#1952). It was a
          `title`, and a duel has no roster to say it once for the page. */}
      {onNudge && (
        <span className="label-caption" style={dress.quietStyle}>
          {collabCopy(factionSlug, "nudgeDescription")}
        </span>
      )}
      {mine ? (
        <>
          <span
            className="content-title"
            style={{ fontWeight: 700, ...dress.headingStyle }}
          >
            {title}
          </span>
          {body?.trim() ? (
            <MarkdownPreview
              source={body}
              className="content-text markdown-preview"
            />
          ) : (
            <p className="content-text" style={dress.quietStyle}>
              {collabCopy(factionSlug, "awaitingWriteUpEmpty")}
            </p>
          )}
        </>
      ) : (
        <p
          className="content-text"
          style={{ fontStyle: "italic", ...dress.quietStyle }}
        >
          {collabCopy(
            factionSlug,
            completed ? "duelCompletedPlaceholder" : "duelHiddenPlaceholder",
          )}
        </p>
      )}
    </div>
  );
}

/**
 * One footer act: the control, and underneath it what pressing it costs (#1952).
 *
 * Three of the four explanations on this page were `title` attributes, which a
 * touch user never sees and a keyboard user reaches only by hovering — so the
 * one control that already stated its cost in body text (`awaitingEdit`, which
 * ADR-0012 makes non-negotiable) read as the only one with consequences. This
 * is that one rule applied to all of them, which is why it is a block rather
 * than three hand-built columns.
 *
 * `maxWidth` is the measure the edit control already used: a description that
 * runs the width of the sheet stops reading as a caption on its button.
 */
function FooterAct({
  children,
  description,
  align = "start",
  quietStyle,
}: {
  children: ReactNode;
  description: string;
  /** `end` mirrors it for the affirmative side of the footer (#646). */
  align?: "start" | "end";
  quietStyle?: CSSProperties;
}) {
  const end = align === "end";
  return (
    <div
      className="flex flex-col gap-1"
      style={{ alignItems: end ? "flex-end" : "flex-start" }}
    >
      {children}
      <span
        className="label-caption"
        style={{
          textAlign: end ? "right" : "left",
          maxWidth: 420,
          ...quietStyle,
        }}
      >
        {description}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The surface                                                                */
/* -------------------------------------------------------------------------- */

export interface PraxisWaitingSurfaceProps {
  state: EditPraxisState;
  /**
   * The mounted archetype's ornament. Required: there is no undressed caller —
   * every path here goes through a faction's own composer, which is what stops
   * the page changing dress at the moment you submit.
   */
  dress: ComposerDress;
  /**
   * The ADR-0012 window length, in days. Production leaves this undefined and
   * the game config supplies it; the prop exists so the clock is renderable in
   * a harness where effects never run.
   */
  autoSubmitDays?: number | null;
  /** Injectable clock, same reason. */
  now?: number;
}

export default function PraxisWaitingSurface({
  state,
  dress,
  autoSubmitDays,
  now,
}: PraxisWaitingSurfaceProps) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const config = useGameConfig();
  const praxis = state.praxis;
  const duel = state.duel;
  if (!praxis) return null;

  const slug = praxis.task_faction_slug;
  const accent = dress.accent;
  // A duel side is `type='solo'` + a duel_id (ADR-0011) — never `type`.
  const isDuel = praxis.duel_id != null && duel != null;
  const sides = isDuel && duel ? duelSides(duel, state.currentCharacterId) : null;
  // The only two shapes that ever reach this surface (ADR-0059). Naming the
  // collab positively rather than as "not a duel" keeps a solo praxis — which
  // `deriveEditPraxisPhase` never holds — from drawing collab exits if it ever
  // did arrive here.
  const isCollab = !isDuel && praxis.type === "collab";
  const windowDays = autoSubmitDays ?? config?.collab_auto_submit_days ?? null;
  // The completed reading (#1164): everybody is in. Read off the phase rather
  // than off `status === 'submitted'` so the one authority on "which face is
  // this" stays `deriveEditPraxisPhase` — a submitted DUEL side is the waiting
  // reading, not this one, for as long as the duel is still live.
  const completed = state.phase === "completed";

  // Deleting destroys the praxis with every member's part in it, so it stays the
  // creator's alone — the backend's `delete_praxis` is the authority and this
  // only declines to draw a control the viewer could never use. Leaving is
  // everyone's, the creator included (ADR-0013, #1074).
  const isCreator = praxis.created_by_id === state.currentCharacterId;
  const busy = state.submitting;
  /** The skin's divider, one instance per place it is drawn. */
  const rule = (key: string): ReactNode => dress.rule?.(key) ?? <ComposerRule />;

  // The stamp, and nothing else. `awaitingStatusMeta` — "Approved by you" —
  // stood here restating the heading directly below it, and #1952 retired it:
  // the heading names who is BLOCKING now, which is the question this page
  // exists to answer and the one no line on it used to.
  const stamped = relativeTime(praxis.submitted_at ?? praxis.updated_at);

  /**
   * The one heading (#1952). It names whoever still owes an approval, in four
   * written forms — and three outstanding still lists all three names, the
   * count form starting at four. `waitingOnHeading` owns that boundary.
   *
   * `awaitingHeading` remains the fallback for an empty list, which the gate
   * makes unreachable: a collab only takes this reading while somebody is
   * outstanding.
   */
  const outstanding = praxis.members
    .filter((member) => !member.has_submitted)
    .map((member) => member.character_display_name);
  const crewHeading = waitingOnHeading(slug, outstanding);
  const heading = completed
    ? collabCopy(slug, isDuel ? "duelCompletedHeading" : "completedHeading")
    : isDuel
      ? collabCopy(slug, "duelAwaitingHeading")
      : (crewHeading ?? collabCopy(slug, "awaitingHeading"));

  // The crew press and its receipt are the ROSTER's now (#1952) — one verb, at
  // one weight, in the block whose rows already carry it. What is left here is
  // deciding whether they apply at all.
  const crewNudge = isCollab && !completed ? state.crewNudge : null;

  const primaryClass = dress.primaryStyle ? undefined : "btn-primary";
  const quietButton = composerLabelStyle({
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    // The seam, not the neutral it defaults to (#1819). This surface is
    // faction-dressed, so the global tertiary is an ink the frame above it
    // cannot move; `--label-ink` is unset to exactly this grey everywhere no
    // frame has repointed it, which makes the swap a no-op on those.
    color: "var(--label-ink)",
    ...dress.quietButtonStyle,
  });

  return (
    <ComposerPage
      sizes={sizes}
      style={dress.pageStyle}
      breadcrumb={
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          editing
        />
      }
    >
      <ComposerSheet
        sizes={sizes}
        style={dress.sheetStyle}
        contentStyle={dress.contentStyle}
        masthead={dress.masthead}
        ground={dress.ground}
      >
        {/* The status row, in the composer's own slot and carrying the skin's
            own mark — the witch hat, the ankh, the gear, `[ok]`. The mark does
            not move or change size when you submit; the WORD beside it does,
            and that is the whole confirmation beat. */}
        <ComposerStatusRow
          status={composerStageWord(state)}
          meta={stamped}
          mark={dress.mark}
          statusStyle={dress.statusStyle}
          metaStyle={dress.metaStyle}
        />

        {/* The task this is all for, on the composer's own reference slip.
            Without it the surface never says what was proven.

            The mark is `ScoreStamp`, and since #1828 it is the SLIP's default
            rather than this mount's argument — the composer draws the same one,
            so the mark no longer changes shape the instant you press Submit.
            The reasoning stands where it was written: `scoreBreakdown()` is the
            single row-selection authority (ADR-0053), it is already dressed per
            faction, and it applies the conditional rules the design's inline
            strip spelled out by hand. Both a live multiplier and preserved votes
            are genuinely reachable here (ADR-0052), so a static task point value
            would be the less true number in the same place. */}
        <TaskSlip
          praxis={praxis}
          task={state.task}
          label={collabCopy(slug, isDuel ? "duelAwaitingTaskLabel" : "awaitingTaskLabel")}
          {...dress.slip}
        />

        {/* The confirmation beat. */}
        <section
          className="flex flex-col gap-2"
          style={{
            border: `1.5px solid ${accent}`,
            borderRadius: 8,
            padding: "var(--space-lg)",
            background: "var(--color-bg-surface)",
            ...dress.panelStyle,
          }}
        >
          <h2 className="content-title" style={{ color: accent, ...dress.headingStyle }}>
            {heading}
          </h2>
          {completed ? (
            /* Nothing is outstanding, so neither clock has anything to say — not
               the collab's countdown and not the duel's elapsed line. */
            <p className="content-text" style={dress.bodyStyle}>
              {collabCopy(slug, isDuel ? "duelCompletedBody" : "completedBody")}
            </p>
          ) : isDuel && sides ? (
            /* The duel's clock is an ELAPSED line, not a countdown. No deadline
               exists to count down to: `Duel` has no expiry, `EraConfig` has no
               duel duration, there is no scheduler, and ADR-0011 rejects per-duel
               windows by name (epic #1071, decision 4). */
            <p className="content-text" style={dress.bodyStyle}>
              {collabCopy(
                slug,
                duel?.status === "pending" ? "duelPendingLine" : "duelElapsedLine",
                {
                  elapsed: stamped,
                  name: sides.foe.display_name,
                },
              )}
            </p>
          ) : (
            <p className="content-text" style={dress.bodyStyle}>
              {collabCopy(slug, "awaitingBody")}
            </p>
          )}
        </section>

        {/* Who else is outstanding. The collab reuses the roster unchanged: it
            is the same component the composer and the read page already mount,
            and it takes the faction slug itself — including, since #1416, its
            own `Collaborators · N` header, which is why only the duel guise
            still passes a section label here. */}
        <ComposerSection
          label={isDuel ? t("editPraxis.composer.opponentLabel") : undefined}
          rule={rule("roster")}
          labelStyle={dress.labelStyle}
        >
          {isDuel && sides ? (
            <div className="flex flex-wrap gap-4">
              <DuelSidePanel
                side={sides.me}
                mine
                factionSlug={slug}
                dress={dress}
                title={state.title}
                body={state.body}
                completed={completed}
              />
              {/* The rival's nudge, gated on `active` exactly as the backend is:
                  at `pending` they have not accepted yet and the outstanding
                  thing is a decision (already in their requests tab as a
                  challenge), and once the duel settles there is nothing left to
                  hurry. */}
              <DuelSidePanel
                side={sides.foe}
                mine={false}
                factionSlug={slug}
                dress={dress}
                completed={completed}
                onNudge={
                  duel?.status === "active"
                    ? () => state.nudge(sides.foe.character_id)
                    : undefined
                }
              />
            </div>
          ) : (
            /* Completed drops both author controls rather than drawing them to
               be refused. The backend allows a kick only while the praxis is
               still open, and there is nobody left to nudge — except after a
               lapsed window, where the roster would otherwise offer to hurry a
               member whose part is no longer wanted. */
            <CollabRoster
              praxisType={praxis.type}
              members={praxis.members}
              invites={praxis.invites}
              currentCharacterId={state.currentCharacterId}
              factionSlug={slug}
              taskPointValue={praxis.task_point_value}
              onKick={completed ? undefined : state.kickMember}
              onNudge={completed ? undefined : state.nudge}
              // The bulk press and its receipt, in the block they act on
              // (#1952). The roster decides whether one press would reach
              // enough people to be worth a second control; this only says
              // whether the act applies to this reading at all.
              onNudgeCrew={completed ? undefined : state.nudgeCrew}
              crewNudge={crewNudge}
            />
          )}
        </ComposerSection>

        {/* The clock — collab only, and only while there is still a window to
            count. See the elapsed line above for the duel. */}
        {isCollab && !completed && (
          <CollabPublishClock
            submitProposedAt={praxis.submit_proposed_at}
            autoSubmitDays={windowDays}
            factionSlug={slug}
            now={now}
            accent={accent}
            panelStyle={dress.panelStyle}
            labelStyle={dress.labelStyle}
            bodyStyle={dress.bodyStyle}
          />
        )}

        {/* Your write-up, read-only. The duel already showed it inside your own
            side panel, so it is not repeated here. */}
        {isCollab && (
          <ComposerSection
            label={collabCopy(slug, "awaitingWriteUpLabel")}
            rule={rule("writeup")}
            labelStyle={dress.labelStyle}
          >
            <div
              style={{
                border: "1px solid var(--color-border-strong)",
                borderRadius: 8,
                padding: "var(--space-lg)",
                background: "var(--color-bg-surface)",
                ...dress.panelStyle,
              }}
            >
              <span
                className="content-title"
                style={{ fontWeight: 700, ...dress.headingStyle }}
              >
                {state.title}
              </span>
              {state.body.trim() ? (
                <MarkdownPreview
                  source={state.body}
                  className="content-text markdown-preview mt-2"
                />
              ) : (
                <p className="content-text mt-2" style={dress.quietStyle}>
                  {collabCopy(slug, "awaitingWriteUpEmpty")}
                </p>
              )}
            </div>
          </ComposerSection>
        )}

        {/* Same banner, same stock, same ink — the dress carries the alarm so
            the pairing cannot change the moment you press Submit (#1231). */}
        <ErrorBanner
          message={state.error}
          style={dress.alarm ? { color: dress.alarm } : undefined}
        />

        {rule("footer")}

        {/* Footer. Global order is [destructive/neutral] … [affirmative] (#646),
            so the way back into your own text sits on the right on every
            surface. Exactly one exit is drawn, the one that applies to this
            viewer.

            The completed reading keeps the position and changes the act: the one
            thing left to do with a published praxis is read it, and the link is
            the whole reason this beats the redirect the ruling turned down. */}
        {completed ? (
          <ComposerFooter
            end={
              <Link
                to={`/praxis/${praxis.id}`}
                className={primaryClass}
                style={dress.primaryStyle}
              >
                {collabCopy(slug, "completedReadAction")}
              </Link>
            }
          />
        ) : (
          /* Three acts, three weights, one order (#1952). The footer dropped
             from four controls to three when the crew press moved into the
             roster header it acts on, and all three now explain themselves in
             visible text — `leaveDescription` and `deleteDescription` were
             `title` attributes, which a touch user never sees. No copy was
             retired to do it: three of the four were already written and
             already good.

             `ComposerFooter`'s `start` / `end` contract is untouched. Only what
             is passed changes, which is what keeps its other fifteen callers —
             the eight editPraxis archetypes, `shared.tsx`, and the seven
             character-creation pages — exactly where they are. */
          <ComposerFooter
            style={{ alignItems: "flex-start" }}
            start={
              isCollab ? (
                <div className="flex flex-wrap items-start gap-4">
                  <FooterAct
                    description={collabCopy(slug, "leaveDescription")}
                    quietStyle={dress.quietStyle}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void state.leaveCollab()}
                      className="hover:underline"
                      style={quietButton}
                    >
                      {t("editPraxis.leaveAction")}
                    </button>
                  </FooterAct>
                  {isCreator && (
                    <FooterAct
                      description={collabCopy(slug, "deleteDescription")}
                      quietStyle={dress.quietStyle}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void state.cancel()}
                        className="hover:underline"
                        style={{ ...quietButton, color: "var(--color-danger)" }}
                      >
                        {collabCopy(slug, "deleteAction")}
                      </button>
                    </FooterAct>
                  )}
                </div>
              ) : undefined
            }
            end={
              /* The cost, before the click, not after it. On a collab the edit
                 this re-entry exists for cancels the pending-publish window and
                 clears every member's cast
                 (`cancel_pending_publish_on_edit`, ADR-0012) — the countdown
                 drawn a few blocks up. It was already mandated visible; the
                 other two joined it rather than it joining them. */
              <FooterAct
                align="end"
                description={collabCopy(
                  slug,
                  isDuel ? "duelPullBackDescription" : "awaitingEditDescription",
                )}
                quietStyle={dress.quietStyle}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void state.reopenForEdit()}
                  className={primaryClass}
                  style={dress.primaryStyle}
                >
                  {/* One button, not two. For a duel, "edit my entry" and "pull
                      my entry back" are the same call — `unsubmit` re-opens the
                      praxis for editing — so drawing both would be two labels
                      for one act. The neutral pull-back wording is the honest
                      one (#1077). */}
                  {collabCopy(
                    slug,
                    isDuel ? "duelPullBackAction" : "awaitingEditAction",
                  )}
                </button>
              </FooterAct>
            }
          />
        )}
      </ComposerSheet>
    </ComposerPage>
  );
}
