/**
 * The waiting surface (#1080, ADR-0059): what the composer becomes after you
 * approve a multi-party praxis that waits on others. A reading, not a lock
 * (ADR-0079): re-entry costs the whole proposal, so it confirms.
 *
 * One shared layout dressed per faction (#1189, ADR-0065 §2): the archetype
 * hands a {@link ComposerDress} holding the SAME masthead/ground/rule elements
 * its composer mounts, so submitting never changes the page's dress. It also
 * draws the one breadcrumb. Copy is the neutral `editPraxis.collab.*` block via
 * `collabCopy`.
 *
 * Nudges (#1083) are server-written and rate-limited; disabled state reads
 * `nudged_at`. Crew nudge (#1418) is one request and may be partly refused.
 * Deliberately absent: a duel countdown (nothing backs one, `waitingClock.ts`)
 * and "Forfeit" (forfeit starts only once settled, ADR-0011 §Forfeit).
 *
 * `phase === "completed"` (#1164): roster all in, confirmation, read-only
 * write-up, a Read link, no exits (owner ruling: no locked composer, no
 * redirect). Solo redirects instead (`handoff`).
 *
 * Renders purely from props plus injectable `autoSubmitDays`/`now`, for the
 * effect-less harness.
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

// Ornament geometry: raw px per WORLD_ZERO_STYLE §4a.
const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The ADR-0012 pending-publish dial (collab only). Renders nothing when the
 * window is unknowable; never assumes a duration. Takes the skin's accent/panel.
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
        {/* Says in words that nobody has to act for it to fire. */}
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

function SideAvatar({ side }: { side: DuelSideOut }) {
  return (
    <RosterAvatar
      name={side.display_name}
      // Monogram fallback (#2128).
      avatarUrl={side.avatar_url}
      size={28}
      // The SIDE's faction, not the page's: two factions share a duel.
      background={factionCssVar(side.faction_slug, "light")}
      borderColor={factionCssVar(side.faction_slug, "border")}
    />
  );
}

/**
 * One duel side. The rival's body isn't on the wire
 * (`duel_side_hidden_condition`, #999), so it shows a placeholder.
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
  /** Duel over (#1164): the placeholder points at the page holding both (#1084). */
  completed?: boolean;
  /** Rival's panel only, while `active` (#1083); the caller owns that condition. */
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
        // Yours takes the accent; the rival's stays dashed.
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
      {/* The poke's cost, in visible text (#1952). */}
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
 * A footer control with its cost in visible text beneath (#1952) — not a
 * `title`, which touch users never see. `maxWidth` keeps it reading as a caption.
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

/**
 * Only what the surface reads (#2977, as #2882 for `controls.tsx`), so the
 * compiler checks each mount. `praxis` stays nullable: the surface guards it.
 */
export interface PraxisWaitingSurfaceProps
  extends Pick<
    EditPraxisState,
    | "praxis"
    | "task"
    | "duel"
    | "phase"
    | "title"
    | "body"
    | "error"
    | "submitting"
    | "currentCharacterId"
    | "crewNudge"
    | "nudge"
    | "nudgeCrew"
    | "kickMember"
    | "leaveCollab"
    | "cancel"
    | "reopenForEdit"
  > {
  /** The mounted archetype's ornament. Required: there is no undressed caller. */
  dress: ComposerDress;
  /** Window length in days; production uses game config. For the harness. */
  autoSubmitDays?: number | null;
  /** Injectable clock, same reason. */
  now?: number;
}

export default function PraxisWaitingSurface({
  praxis,
  task,
  duel,
  phase,
  title,
  body,
  error,
  submitting,
  currentCharacterId,
  // Renamed: the narrowed local below takes the name.
  crewNudge: crewNudgeHandler,
  nudge,
  nudgeCrew,
  kickMember,
  leaveCollab,
  cancel,
  reopenForEdit,
  dress,
  autoSubmitDays,
  now,
}: PraxisWaitingSurfaceProps) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const config = useGameConfig();
  if (!praxis) return null;

  const slug = praxis.task_faction_slug;
  const accent = dress.accent;
  // A duel side is `type='solo'` + a duel_id (ADR-0011).
  const isDuel = praxis.duel_id != null && duel != null;
  const sides = isDuel && duel ? duelSides(duel, currentCharacterId) : null;
  // Positive test, so a stray solo praxis never draws collab exits.
  const isCollab = !isDuel && praxis.type === "collab";
  const windowDays = autoSubmitDays ?? config?.collab_auto_submit_days ?? null;
  // Off the phase, not `status`: a submitted side of a live duel is still waiting (#1164).
  const completed = phase === "completed";

  // Delete is creator-only (`delete_praxis` enforces); leave is anyone's (ADR-0013).
  const isCreator = praxis.created_by_id === currentCharacterId;
  const busy = submitting;
  const rule = (key: string): ReactNode => dress.rule?.(key) ?? <ComposerRule />;

  const stamped = relativeTime(praxis.submitted_at ?? praxis.updated_at);

  /** Names who still owes an approval (#1952, `waitingOnHeading`); fallback unreachable. */
  const outstanding = praxis.members
    .filter((member) => !member.has_submitted)
    .map((member) => member.character_display_name);
  const crewHeading = waitingOnHeading(slug, outstanding);
  const heading = completed
    ? collabCopy(slug, isDuel ? "duelCompletedHeading" : "completedHeading")
    : isDuel
      ? collabCopy(slug, "duelAwaitingHeading")
      : (crewHeading ?? collabCopy(slug, "awaitingHeading"));

  // The roster draws the crew press (#1952); this only decides if it applies.
  const crewNudge = isCollab && !completed ? crewNudgeHandler : null;

  const primaryClass = dress.primaryStyle ? undefined : "btn-primary";
  const quietButton = composerLabelStyle({
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    // The seam (#1819): defaults to the tertiary grey where no frame repoints it.
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
        {/* Same slot and mark as the composer; only the WORD changes on submit. */}
        <ComposerStatusRow
          status={composerStageWord({ phase, praxis })}
          meta={stamped}
          mark={dress.mark}
          statusStyle={dress.statusStyle}
          metaStyle={dress.metaStyle}
        />

        {/* The task slip; its `ScoreStamp` default (#1828, ADR-0053) matches the composer. */}
        <TaskSlip
          praxis={praxis}
          task={task}
          label={collabCopy(slug, isDuel ? "duelAwaitingTaskLabel" : "awaitingTaskLabel")}
          {...dress.slip}
        />

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
            /* Nothing outstanding: no clock. */
            <p className="content-text" style={dress.bodyStyle}>
              {collabCopy(slug, isDuel ? "duelCompletedBody" : "completedBody")}
            </p>
          ) : isDuel && sides ? (
            /* Elapsed, not a countdown: duels have no deadline (ADR-0011). */
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

        {/* The roster draws its own header (#1416); only the duel passes a label. */}
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
                title={title}
                body={body}
                completed={completed}
              />
              {/* Nudge only while `active`, as the backend gates it. */}
              <DuelSidePanel
                side={sides.foe}
                mine={false}
                factionSlug={slug}
                dress={dress}
                completed={completed}
                onNudge={
                  duel?.status === "active"
                    ? () => nudge(sides.foe.character_id)
                    : undefined
                }
              />
            </div>
          ) : (
            /* Completed: no kick/nudge (the backend would refuse). */
            <CollabRoster
              praxisType={praxis.type}
              members={praxis.members}
              invites={praxis.invites}
              currentCharacterId={currentCharacterId}
              factionSlug={slug}
              taskPointValue={praxis.task_point_value}
              onKick={completed ? undefined : kickMember}
              onNudge={completed ? undefined : nudge}
              onNudgeCrew={completed ? undefined : nudgeCrew}
              crewNudge={crewNudge}
            />
          )}
        </ComposerSection>

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

        {/* Read-only write-up; the duel shows it in your side panel. */}
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
                {title}
              </span>
              {body.trim() ? (
                <MarkdownPreview
                  source={body}
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

        {/* The dress carries the alarm ink so it matches the composer (#1231). */}
        <ErrorBanner
          message={error}
          style={dress.alarm ? { color: dress.alarm } : undefined}
        />

        {rule("footer")}

        {/* Order: [destructive/neutral] … [affirmative] (#646). Completed: a Read link. */}
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
          /* Three acts, each with its cost in visible text (#1952). */
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
                      onClick={() => void leaveCollab()}
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
                        onClick={() => void cancel()}
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
              /* On a collab the edit cancels the window and every cast (ADR-0012). */
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
                  onClick={() => void reopenForEdit()}
                  className={primaryClass}
                  style={dress.primaryStyle}
                >
                  {/* For a duel, edit and pull back are one `unsubmit` call (#1077). */}
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
