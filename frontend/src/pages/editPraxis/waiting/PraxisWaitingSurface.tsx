/**
 * The waiting surface (#1080, ADR-0059) — what the composer becomes once you
 * have filed your part of a multi-party praxis.
 *
 * Submitting a collab part or a duel side no longer navigates. `publish()`
 * holds, `EditPraxis.tsx` swaps this in for the faction archetype, and the
 * player stays somewhere that can still let them back into their own text. The
 * public read view could show roster state but offers no authoring exit, and
 * putting author-only controls on a public page is exactly what #646 undid.
 *
 * ONE shared, responsive, token-themed surface (epic #1071, decisions 7 and 8),
 * the way `CollabSuccess` is one screen for every faction and both form factors.
 * No mobile twin: a single stacked column at both widths, and `ScoreStamp` is
 * already size-agnostic. The design draws a per-faction device in the hero and a
 * per-faction masthead; those are a follow-up wave if this reads flat once live,
 * not a debt taken on here.
 *
 * Three things the design draws that are deliberately absent:
 *  - **Nudge.** It ships on its own issue. A `setNudged` local-state stub that
 *    lights up and sends nothing was rejected as dishonest, so there is no
 *    affordance at all.
 *  - **A duel countdown.** Nothing backs one (see `waitingClock.ts`). The duel
 *    gets a plain elapsed line; the ring is the collab's.
 *  - **"Forfeit the duel".** The design offers it at `active` and hides it at
 *    `settled`, which is backwards: forfeit begins only once a duel is settled
 *    (ADR-0011 §Forfeit). Before that, taking your entry back costs nothing, so
 *    that is what the footer says.
 *
 * Copy resolves through `collabCopy(slug, key)` — shared `editPraxis.collab.*`
 * defaults with faction overrides where a faction has authored them.
 *
 * TESTABILITY. The harness is `renderToStaticMarkup`: no DOM, no effects, so a
 * component that fetches its own data cannot be asserted on. Everything here
 * renders from `EditPraxisState` plus two injectable scalars (`autoSubmitDays`,
 * `now`), and the clock arithmetic lives in `waitingClock.ts` as a pure
 * function. `useGameConfig` is still the production source of the window
 * length; the prop only overrides it.
 */
import { useTranslation } from "react-i18next";
import type { DuelSideOut } from "../../../api/duel";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { collabCopy } from "../../../components/collab/collabCopy";
import { duelSides } from "../../../components/duel/shared";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import { useGameConfig } from "../../../hooks/useGameConfig";
import { factionCssVar } from "../../../utils/factions";
import { relativeTime } from "../../../utils/dates";
import MarkdownPreview from "../blocks/MarkdownPreview";
import { ArchetypeFrame, ErrorBanner, TaskMetaInline } from "../archetypes/shared";
import type { EditPraxisState } from "../useEditPraxis";
import { collabPublishWindow } from "./waitingClock";

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
 */
export function CollabPublishClock({
  submitProposedAt,
  autoSubmitDays,
  factionSlug,
  now,
}: {
  submitProposedAt: string | null | undefined;
  autoSubmitDays: number | null | undefined;
  factionSlug: string | null | undefined;
  now?: number;
}) {
  const publishWindow = collabPublishWindow(submitProposedAt, autoSubmitDays, now);
  if (!publishWindow) return null;
  const accent = factionCssVar(factionSlug, "card-accent");

  return (
    <section
      className="flex items-center gap-4"
      style={{
        border: `1px solid var(--color-border-strong)`,
        borderRadius: 8,
        padding: "var(--space-md) var(--space-lg)",
        background: "var(--color-bg-surface)",
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
            style={{ stroke: accent }}
          />
        </svg>
        <span
          className="flex flex-col items-center justify-center"
          style={{ position: "absolute", inset: 0, lineHeight: 1.1 }}
        >
          <span
            className="font-body"
            style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: accent }}
          >
            {publishWindow.lapsed
              ? collabCopy(factionSlug, "awaitingClockLapsed")
              : collabCopy(factionSlug, "awaitingClockDays", {
                  days: publishWindow.daysLeft,
                })}
          </span>
          {!publishWindow.lapsed && (
            <span className="eyebrow">
              {collabCopy(factionSlug, "awaitingClockHours", {
                hours: publishWindow.hoursLeft,
              })}
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="eyebrow" style={{ color: accent }}>
          {collabCopy(factionSlug, "awaitingClockLabel")}
        </span>
        {/* The rule the dial is counting down to, said in words — a ring alone
            never explains that nobody has to do anything for it to fire. */}
        <p
          className="font-body content-text"
          style={{ color: "var(--color-text-secondary)" }}
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
    <span
      className="flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        flexShrink: 0,
        background: factionCssVar(side.faction_slug, "light"),
        border: `1px solid ${factionCssVar(side.faction_slug, "border")}`,
        fontSize: "var(--text-md)",
        fontWeight: 700,
      }}
    >
      {side.display_name.charAt(0).toUpperCase()}
    </span>
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
  title,
  body,
}: {
  side: DuelSideOut;
  mine: boolean;
  factionSlug: string | null | undefined;
  title?: string;
  body?: string;
}) {
  const accent = factionCssVar(factionSlug, "card-accent");
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        flex: "1 1 260px",
        minWidth: 0,
        borderRadius: 8,
        border: mine
          ? `1.5px solid ${accent}`
          : "1.5px dashed var(--color-border-strong)",
        padding: "var(--space-md)",
        background: "var(--color-bg-surface)",
      }}
    >
      <div className="flex items-center gap-2">
        <SideAvatar side={side} />
        <span className="font-body content-text" style={{ flex: 1, minWidth: 0 }}>
          {side.display_name}
          {mine && (
            <span style={{ color: "var(--color-text-tertiary)" }}>
              {" · "}
              {collabCopy(factionSlug, "you")}
            </span>
          )}
        </span>
        <span
          className="eyebrow"
          style={{
            color: side.is_submitted ? accent : "var(--color-text-tertiary)",
          }}
        >
          {side.is_submitted
            ? collabCopy(factionSlug, "duelPillSealed")
            : collabCopy(factionSlug, "duelPillWriting")}
        </span>
      </div>
      {mine ? (
        <>
          <span className="font-body content-title" style={{ fontWeight: 700 }}>
            {title}
          </span>
          {body?.trim() ? (
            <MarkdownPreview
              source={body}
              className="content-text markdown-preview"
            />
          ) : (
            <p
              className="font-body content-text"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {collabCopy(factionSlug, "awaitingWriteUpEmpty")}
            </p>
          )}
        </>
      ) : (
        <p
          className="font-body content-text"
          style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}
        >
          {collabCopy(factionSlug, "duelSealedPlaceholder")}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The surface                                                                */
/* -------------------------------------------------------------------------- */

export interface PraxisWaitingSurfaceProps {
  state: EditPraxisState;
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
  autoSubmitDays,
  now,
}: PraxisWaitingSurfaceProps) {
  const { t } = useTranslation("forms");
  const config = useGameConfig();
  const praxis = state.praxis;
  const duel = state.duel;
  if (!praxis) return null;

  const slug = praxis.task_faction_slug;
  const accent = factionCssVar(slug, "card-accent");
  // A duel side is `type='solo'` + a duel_id (ADR-0011) — never `type`.
  const isDuel = praxis.duel_id != null && duel != null;
  const sides = isDuel && duel ? duelSides(duel, state.currentCharacterId) : null;
  // The only two shapes that ever reach this surface (ADR-0059). Naming the
  // collab positively rather than as "not a duel" keeps a solo praxis — which
  // `deriveEditPraxisPhase` never holds — from drawing collab exits if it ever
  // did arrive here.
  const isCollab = !isDuel && praxis.type === "collab";
  const windowDays = autoSubmitDays ?? config?.collab_auto_submit_days ?? null;

  // Deleting destroys the praxis with every member's part in it, so it stays the
  // creator's alone — the backend's `delete_praxis` is the authority and this
  // only declines to draw a control the viewer could never use. Leaving is
  // everyone's, the creator included (ADR-0013, #1074).
  const isCreator = praxis.created_by_id === state.currentCharacterId;
  const busy = state.submitting;

  return (
    <ArchetypeFrame>
      {/* Status row — who filed, in the surface's own quiet voice. */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="eyebrow" style={{ color: accent }}>
          {collabCopy(slug, "awaitingStatusMeta")}
        </span>
        <span className="eyebrow">
          {relativeTime(praxis.submitted_at ?? praxis.updated_at)}
        </span>
      </div>

      {/* The task this is all for. The design draws it and the issue's block
          list omits it; without it the surface never says what was proven.
          Reuses the composer's own `TaskMetaInline` rather than inventing a
          second task-context component. */}
      <section
        className="flex flex-wrap items-start gap-4 mb-6"
        style={{
          borderLeft: `3px solid ${accent}`,
          paddingLeft: "var(--space-lg)",
        }}
      >
        <div className="flex flex-col gap-2" style={{ flex: "1 1 320px", minWidth: 0 }}>
          <span className="eyebrow" style={{ color: accent }}>
            {collabCopy(slug, isDuel ? "duelAwaitingTaskLabel" : "awaitingTaskLabel")}
          </span>
          <span className="font-display content-title">{praxis.task_title}</span>
          <TaskMetaInline praxis={praxis} task={state.task} />
          {state.task?.description && (
            <p
              className="font-body content-text"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {state.task.description}
            </p>
          )}
        </div>
        {/* The points, mounted rather than hand-drawn: `scoreBreakdown()` is the
            single row-selection authority (ADR-0053) and already applies the
            conditional rules the design's inline strip spelled out by hand — a
            multiplier row only when it is not ×1.0, a votes row always. Both are
            genuinely reachable here: unsubmitting preserves votes, and a duel
            side carries a live, provisional modifier (ADR-0052). */}
        <ScoreStamp praxis={praxis} />
      </section>

      {/* The confirmation beat. Shared and token-themed: the design's
          per-faction device (pentacle, ensō, gear, ✦, swoosh, [ok], spectrum
          ring) is a later wave, not this one. */}
      <section
        className="flex flex-col gap-2 mb-6"
        style={{
          border: `1.5px solid ${accent}`,
          borderRadius: 8,
          padding: "var(--space-lg)",
          background: "var(--color-bg-surface)",
        }}
      >
        <h2 className="font-display content-title" style={{ color: accent }}>
          {collabCopy(slug, isDuel ? "duelAwaitingHeading" : "awaitingHeading")}
        </h2>
        {isDuel && sides ? (
          /* The duel's clock is an ELAPSED line, not a countdown. No deadline
             exists to count down to: `Duel` has no expiry, `EraConfig` has no
             duel duration, there is no scheduler, and ADR-0011 rejects per-duel
             windows by name (epic #1071, decision 4). */
          <p
            className="font-body content-text"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {collabCopy(
              slug,
              duel?.status === "pending" ? "duelPendingLine" : "duelElapsedLine",
              {
                elapsed: relativeTime(praxis.submitted_at ?? praxis.updated_at),
                name: sides.foe.display_name,
              },
            )}
          </p>
        ) : (
          <p
            className="font-body content-text"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {collabCopy(slug, "awaitingBody")}
          </p>
        )}
      </section>

      {/* Who else is outstanding. The collab reuses the roster unchanged — the
          same component the composer and the read page already mount. */}
      <section className="mb-6">
        {isDuel && sides ? (
          <div className="flex flex-wrap gap-4">
            <DuelSidePanel
              side={sides.me}
              mine
              factionSlug={slug}
              title={state.title}
              body={state.body}
            />
            <DuelSidePanel side={sides.foe} mine={false} factionSlug={slug} />
          </div>
        ) : (
          <CollabRoster
            members={praxis.members}
            currentCharacterId={state.currentCharacterId}
            factionSlug={slug}
            taskPointValue={praxis.task_point_value}
            onKick={state.kickMember}
          />
        )}
      </section>

      {/* The clock — collab only; see the elapsed line above for the duel. */}
      {isCollab && (
        <div className="mb-6">
          <CollabPublishClock
            submitProposedAt={praxis.submit_proposed_at}
            autoSubmitDays={windowDays}
            factionSlug={slug}
            now={now}
          />
        </div>
      )}

      {/* Your write-up, read-only. The duel already showed it inside your own
          side panel, so it is not repeated here. */}
      {isCollab && (
        <section className="flex flex-col gap-2 mb-6">
          <span className="eyebrow" style={{ color: accent }}>
            {collabCopy(slug, "awaitingWriteUpLabel")}
          </span>
          <div
            style={{
              border: "1px solid var(--color-border-strong)",
              borderRadius: 8,
              padding: "var(--space-lg)",
              background: "var(--color-bg-surface)",
            }}
          >
            <span className="font-display content-title" style={{ fontWeight: 700 }}>
              {state.title}
            </span>
            {state.body.trim() ? (
              <MarkdownPreview
                source={state.body}
                className="content-text markdown-preview mt-2"
              />
            ) : (
              <p
                className="font-body content-text mt-2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {collabCopy(slug, "awaitingWriteUpEmpty")}
              </p>
            )}
          </div>
        </section>
      )}

      <ErrorBanner message={state.error} />

      {/* Footer. Global order is [destructive/neutral] … [affirmative] (#646),
          so the way back into your own text sits on the right on every surface.
          Exactly one exit is drawn, the one that applies to this viewer. */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 pt-4"
        style={{ borderTop: "1px dashed var(--color-border-strong)" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {isCollab && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void state.leaveCollab()}
              title={collabCopy(slug, "leaveDescription")}
              className="font-body eyebrow hover:underline"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "var(--color-text-tertiary)",
              }}
            >
              {t("editPraxis.leaveAction")}
            </button>
          )}
          {isCollab && isCreator && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void state.cancel()}
              title={collabCopy(slug, "deleteDescription")}
              className="font-body eyebrow hover:underline"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "var(--color-danger)",
              }}
            >
              {collabCopy(slug, "deleteAction")}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void state.reopenForEdit()}
            className="btn-primary"
          >
            {/* One button, not two. For a duel, "edit my entry" and "pull my
                entry back" are the same call — `unsubmit` re-opens the praxis
                for editing — so drawing both would be two labels for one act.
                The neutral pull-back wording is the honest one (#1077). */}
            {collabCopy(
              slug,
              isDuel ? "duelPullBackAction" : "awaitingEditAction",
            )}
          </button>
          {/* The cost, before the click, not after it. On a collab the edit this
              re-entry exists for cancels the pending-publish window and clears
              every member's cast (`cancel_pending_publish_on_edit`, ADR-0012) —
              the countdown drawn a few blocks up. */}
          <span
            className="font-body eyebrow-sentence"
            style={{ textAlign: "right", maxWidth: 420 }}
          >
            {collabCopy(
              slug,
              isDuel ? "duelPullBackDescription" : "awaitingEditDescription",
            )}
          </span>
        </div>
      </div>
    </ArchetypeFrame>
  );
}
