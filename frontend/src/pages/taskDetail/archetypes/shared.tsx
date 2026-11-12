/**
 * Prop-driven helpers shared across task-detail archetypes, so skins reuse the
 * behaviour without inheriting each other's look. Mirrors editPraxis/archetypes/shared.tsx.
 */
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import CommentThread from "../../../components/comments/CommentThread";
import ScoreStamp, {
  type StampablePraxis,
} from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import { taskCardSignupCta } from "../../../components/taskCard/signupAffordance";
import type { TaskCardSignupCta } from "../../../components/taskCard/signupAffordance";
import { isNeutralMultiplier } from "../../../utils/points";
import { factionName, UNAFFILIATED_FACTION_SLUG } from "../../../utils/factions";
import type { TaskOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

interface ErrorBannerProps {
  message: string | null;
  style?: CSSProperties;
}

/**
 * Marks a task claimable only via the level-jump allowance (#816). Config-driven:
 * renders only when `state.levelJumpSignup` (useTaskDetail), no slug comparison.
 */
export function LevelJumpBanner({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  if (!state.levelJumpSignup || !state.task) return null;
  return (
    <div
      className="font-body"
      style={{
        display: "flex",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-sm)",
        padding: "var(--space-xs) var(--space-md)",
        background: "var(--color-bg-surface-alt)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
      }}
    >
      <span
        className="label-caption"
        style={{ color: "var(--color-text-primary)" }}
      >
        {t("detail.levelJump.tag")}
      </span>
      <span
        style={{
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
        }}
      >
        {t("detail.levelJump.note", { level: state.task.level_required })}
      </span>
    </div>
  );
}

/**
 * The one comments slot every archetype mounts; owns the `status === "active"`
 * gate (ADR-0006) so no skin can forget it. A `heading` suppresses the thread's
 * own `<h3>`; omit it for the default heading.
 */
export function TaskDetailComments({
  state,
  heading,
  style,
}: {
  state: TaskDetailState;
  heading?: ReactNode;
  style?: CSSProperties;
}) {
  const { task, comments } = state;
  if (!task || task.status !== "active") return null;
  return (
    <section style={style}>
      {heading}
      {/* Seeded from the page's batch (#1281); the gate delays the thread's own fetch. */}
      <CommentThread
        target="tasks"
        targetId={task.id}
        showHeading={heading === undefined}
        seed={comments}
      />
    </section>
  );
}

/**
 * The header's action-column geometry for all skins (#1138): with no action the
 * column collapses to the worth readout instead of framing an empty slot
 * (WORLD_ZERO_STYLE §1.4). `width` is the skin's (420–520 is dress, not drift).
 * `collapsedMinWidth` is for absolutely-positioned ornament wider than the content.
 */
export function actionColumnSize({
  desktop,
  hasAction,
  width,
  collapsedMinWidth,
}: {
  desktop: boolean;
  hasAction: boolean;
  width: number;
  collapsedMinWidth?: number;
}): CSSProperties {
  if (!desktop) return { flex: "1 1 auto", width: "100%" };
  if (!hasAction) {
    return { flex: "0 0 auto", width: "auto", minWidth: collapsedMinWidth };
  }
  return { flex: `0 0 ${width}px`, width };
}

/**
 * Does the worth readout have a base/×mult row to draw? (#1704) Same row policy
 * as `scoreBreakdown` (ADR-0049/0053): no row that repeats the total. Only
 * Albescent's prism ring calls it; the rest get it via {@link TaskWorthStamp}.
 */
export function showWorthBreakdown(factionMultiplier: number): boolean {
  return !isNeutralMultiplier(factionMultiplier);
}

/**
 * The ONLY fabricated praxis in the tree (#2554): a task's base · mult · total
 * as a `StampablePraxis`. The other terms sit at neutral values, which
 * `scoreBreakdown` hides. `moderation_status: "visible"` keeps #1444's guard
 * from blanking the panel.
 */
function taskWorthAsStampable(state: TaskDetailState): StampablePraxis | null {
  const { task, basePoints, factionMultiplier, modifiedPoints } = state;
  if (!task) return null;
  return {
    task_point_value: basePoints,
    display_multiplier: factionMultiplier,
    score: modifiedPoints,
    metatask_points: 0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    is_top_for_task: false,
    task_faction_slug: task.primary_faction_slug,
    moderation_status: "visible",
  };
}

/**
 * The worth cell: the faction's own score stamp (ADR-0049, #2554), so a score
 * has one drawing in the tree. Albescent deliberately substitutes a prism ring
 * via `worthSlot` (#2549).
 */
export function TaskWorthStamp({ state }: { state: TaskDetailState }) {
  const praxis = taskWorthAsStampable(state);
  if (!praxis) return null;
  return <ScoreStamp praxis={praxis} showCrown={false} />;
}

/**
 * The sign-up slot's control, resolved by the cards' `taskCardSignupCta` so
 * the surfaces agree (#2554). Narrowed for the page:
 * - a `denied` refusal returns null (the page hides unusable controls, §1.4);
 * - a link to the viewer's praxis (#2359/#2643) stands down where the page's
 *   own in-progress/submitted block already draws one — it is the fallback;
 * - anonymous viewers get null from the server's `can_sign_up: false`, and
 *   `state.canSignUp` (#1497) must still be true.
 */
export function detailSignupCta(
  state: TaskDetailState,
): TaskCardSignupCta | null {
  const { task } = state;
  if (!task) return null;
  const cta = taskCardSignupCta(task, () => {
    void state.handleSignup();
  });
  if (!cta) return null;
  if (cta.href) {
    return state.mySubmission || state.isInProgress ? null : cta;
  }
  return cta.denied || !state.canSignUp ? null : cta;
}

/**
 * The one faction word a task-detail header may print (#2282). Null on a
 * metatask whose primary faction is the generic word: there the issuer line
 * (`detail.metataskIssuer`) is the faction statement. Tested on the resolved
 * NAME, not the slug, so a masked Albescent metatask stands down exactly like
 * an `na` one (ADR-0027) — otherwise the difference is the tell.
 */
export function headerFactionName(task: TaskOut): string | null {
  const name = factionName(task.primary_faction_slug);
  const isGeneric = name === factionName(UNAFFILIATED_FACTION_SLUG);
  if (task.task_type === "metatask" && isGeneric) return null;
  return name;
}

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className="font-body"
      style={{
        fontSize: "var(--text-md)",
        color: "var(--color-danger)",
        marginTop: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        background: "var(--color-danger-veil)",
        border: "1px solid var(--color-danger-edge)",
        ...style,
      }}
    >
      {message}
    </div>
  );
}
