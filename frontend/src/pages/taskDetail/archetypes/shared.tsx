/**
 * Small presentational + logic helpers shared across task-detail archetypes.
 * Kept prop-driven and skinnable so wildly-different archetypes can reuse the
 * behaviour (level-jump banner, error banner, comment thread) without inheriting
 * each other's look. Mirrors editPraxis/archetypes/shared.tsx.
 *
 * `relationOf` (friend/foe resolution for roster badges) used to live here and
 * was removed in #1039: the v2 skins draw no in-progress roster — the header's
 * in-progress count is the only place that number appears — so nothing resolved
 * a relation any more. Reinstating a roster means reinstating the helper.
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
 * LevelJumpBanner — the shared level-jump affordance (#816). Rendered at the top
 * of every archetype's sign-up region so a WOW member (or any future faction
 * whose config grants a level-jump reach) sees a task they can only claim BECAUSE
 * of the allowance marked distinctly, never identical to a task at or below their
 * level. Purely presentational and config-driven: it renders only when
 * `state.levelJumpSignup` is true (computed in useTaskDetail off
 * `level_jump_reach`/`level_jump_available` — no slug comparison). When the
 * allowance is spent or the task is plainly out of reach the CTA doesn't render
 * at all, so this banner never appears and the task reads as locked.
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
 * TaskDetailComments — the one comments slot every task-detail archetype mounts.
 *
 * The dispatcher used to render `<CommentThread>` below whichever archetype it
 * picked; #1030 moved the thread inside the archetypes so each skin can dress
 * its own section head and place the thread in its own layout. Putting the
 * `status === "active"` gate here (rather than copy-pasting it into nine files)
 * is the point: comments are open while a task is active (ADR-0006), and one
 * faction forgetting that gate is exactly the drift this prevents.
 *
 * Pass `heading` to supply a dressed section head; the thread's own
 * `{n} comments` `<h3>` is then suppressed so the page carries one heading, not
 * two. Omit it and the thread draws its default heading — which is what the
 * not-yet-redesigned faction archetypes want.
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
      {/* Seeded from the page's own batch (#1281) — the gate above means the
          thread's effect could never have started this early on its own. */}
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
 * actionColumnSize — the header's action-column geometry, one expression for all
 * nine skins (#1138).
 *
 * The panel holds two cells: the worth readout, always drawn, and the ONE action
 * slot (sign up / continue / edit), which every skin already gates behind
 * `hasAction`. What none of them gated was the column AROUND them: the width was
 * pinned to the skin's panel value unconditionally, so a viewer with no move —
 * every logged-out visitor — got a 420–520px frame around a ~168px score box.
 * WORLD_ZERO_STYLE §1.4 hides controls a viewer cannot use; a frame sized for a
 * control that is not there re-states the absence as a hole.
 *
 * `width` stays the caller's — the panel band runs 420 (Ephemerists) to 520
 * (Everymen) and that spread is dress, not drift, so this helper takes the number
 * rather than owning it. What is shared is the SHAPE of the expression, which is
 * the part that was identical in eight files and wrong in all eight.
 *
 * `collapsedMinWidth` is for a panel carrying ornament wider than its flow
 * content: an absolutely-positioned mark contributes nothing to a
 * shrink-to-fit width, so the Ephemerists crown (400px) would hang off both
 * edges of a collapsed plate. Only that skin passes it.
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
  // The column has collapsed; the panel is the column, whatever it holds.
  if (!desktop) return { flex: "1 1 auto", width: "100%" };
  if (!hasAction) {
    return { flex: "0 0 auto", width: "auto", minWidth: collapsedMinWidth };
  }
  return { flex: `0 0 ${width}px`, width };
}

/**
 * showWorthBreakdown — does the worth readout have a second row to draw? (#1704)
 *
 * Every skin's readout is `base N` · `×mult` · `N POINTS`. The chip was already
 * gated on the factor being real (ADR-0055), but the `base` row above it was
 * drawn unconditionally — so at `era_1`'s neutralised ×1.00, which is every
 * task today, the panel said the same number twice: `base 18` and then
 * `18 POINTS`.
 *
 * That is the row policy `components/praxisCard/scoreStamp/scoreBreakdown.ts`
 * states for the praxis stamp (ADR-0049, ADR-0053): *a row exists when it tells
 * the viewer something the total mark does not already say*. #1131 fixed this
 * exact shape there.
 *
 * ONE CALLER LEFT, AND IT IS THE RECORDED ONE (#2554). This used to be the gate
 * in all nine skins, under a note arguing that calling `scoreBreakdown` here
 * "would be a lie about what a task is". The owner ruled the other way: eight
 * archetypes now draw their worth through {@link TaskWorthStamp}, where
 * `scoreBreakdown` selects the same rows off the same RAW factor and this gate
 * is honoured by construction rather than by hand. Albescent is the exception —
 * its prism ring is the one piece of worth markup a faction owns rather than
 * inherits, so it still needs the shared policy by name.
 *
 * One gate, not two: the chip lives inside the row in that skin, and its
 * condition is this same one, so the row drops as a unit with nothing orphaned
 * (`scoreBreakdown`'s own note: a null base always coincides with a null mult).
 * The total keeps its own label and stands alone.
 */
export function showWorthBreakdown(factionMultiplier: number): boolean {
  return !isNeutralMultiplier(factionMultiplier);
}

/**
 * The adapter, and the ONLY fabricated praxis in the tree (#2554).
 *
 * `ScoreStamp` draws base · multiplier · total. A task detail has exactly those
 * three numbers under different names, and no praxis. Rather than fork nine
 * stamps or widen every skin's prop, the three terms a task DOES have are
 * carried across and the four a task cannot have are stated at their neutral
 * values — which is not a fiction about the arithmetic: `scoreBreakdown` hides a
 * row at exactly those values, so a task's stamp draws no metatask row, no votes
 * tally and no habit bonus because there is nothing to draw, not because a flag
 * was set.
 *
 * Two fields are dispatch inputs rather than terms, and both are honest:
 *  - `task_faction_slug` is the same slug the archetype itself dispatched on, so
 *    the page and its stamp always agree about whose mark this is.
 *  - `moderation_status` is what #1444's guard reads — it blanks a praxis that
 *    banked nothing. A task's point value is always live, so `visible` is the
 *    truthful answer, and it is what keeps that guard from blanking the panel.
 *
 * `is_top_for_task` is false because a crown belongs to a praxis, not a task;
 * `showCrown={false}` says the same thing a second way so neither can drift.
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
 * The worth cell every task-detail archetype draws — the faction's OWN score
 * stamp (ADR-0049), not a second mark invented for this one page (#2554).
 *
 * Eight archetypes each hand-drew a base row, a `×mult` chip and a total mark
 * here while their faction already owned a registered `scoreStamp` surface —
 * the Ephemerists, for one, drew a compass rose on praxis cards and a ~60-line
 * stepped octagon here. This mounts the dispatcher, so there is ONE drawing of a
 * score in the tree and a faction that restyles its stamp restyles both places.
 *
 * Albescent does not mount this: `AlbescentTaskDetail` substitutes a prism ring
 * through `DefaultTaskDetail`'s `worthSlot`, which is a deferral with a reason
 * (#2549/#2550 are re-cutting that page's ground) and not an oversight.
 */
export function TaskWorthStamp({ state }: { state: TaskDetailState }) {
  const praxis = taskWorthAsStampable(state);
  if (!praxis) return null;
  return <ScoreStamp praxis={praxis} showCrown={false} />;
}

/**
 * Which control the ONE sign-up slot draws — resolved by the task cards' own
 * `taskCardSignupCta`, so the two surfaces cannot disagree (#2554).
 *
 * ### Why this is a narrowing rather than a straight call
 *
 * A card draws a refusal: it spends its one slot saying *why* instead of
 * offering a claim. A detail page does not, and never has — WORLD_ZERO_STYLE
 * §1.4 hides a control the viewer cannot use, and the whole panel column
 * collapses when there is no action (`actionColumnSize`, #1138). That difference
 * survives here: a `denied` control returns null, exactly as `canSignUp` used to
 * hide it.
 *
 * ### The one refusal that is a door
 *
 * `already_active_member` is the reason this function is a bug fix and not a
 * tidy-up. The card offers a LINK to the draft's editor (#2359); the detail page
 * for the same task offered nothing. It offers the link now.
 *
 * The conjunction from `signupAffordance` is untouched and load-bearing: the
 * reason ALONE is not a door, because it also covers a submitted or pending
 * praxis with nothing left to edit. The link needs `in_progress_praxis_id` too.
 *
 * ### …but only where the page is not already the door
 *
 * The detail page has its own in-progress block — "Continue editing" beside
 * "drop" — gated on the separate `/praxis/mine` read. Where that block draws,
 * this slot stands down: two links to the same editor in one panel is not the
 * gap being closed. The slot is the FALLBACK, for the read where the task's own
 * `signup_reason` knows about a draft that the page's roster fetch does not.
 *
 * ### The anonymous viewer
 *
 * `onSignup` is passed unconditionally, which is safe *and* checked twice. The
 * server returns `can_sign_up: false` and `signup_reason: null` for a viewer it
 * has no character for (`services/task.py`: `if viewer is None: return base`),
 * so the resolver returns null on its own; and `state.canSignUp` — which is
 * `signedIn && can_sign_up` (#1497) — still has to be true before a pressable
 * control comes back. Neither check re-derives eligibility.
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
 * headerFactionName — the ONE faction word a task-detail header may print
 * (#2282).
 *
 * A metatask carries two real faction columns and every skin printed both as if
 * they were one answer: `primary_faction_slug` in the eyebrow/nameplate, and
 * `metatask_faction_slug` in the line under the title. Task 162 therefore
 * claimed to be *Unaffiliated* AND *Warriors of Whimsy*.
 *
 * Neither column is wrong — they answer different questions. The propose form
 * POSTs `metatask_faction_slug` only (`planProposalSubmission`), so every
 * player-made metatask has the `na` sentinel in `primary_faction_slug`, and
 * `na` printed as "Unaffiliated": a faction-shaped word for the *absence* of
 * one, standing next to the issuer's real name. The issuer is the fact worth
 * stating — `faction_permits` documents that it gates nothing, it records who
 * issued the metatask — so on a metatask THAT line is the header's faction
 * statement (`detail.metataskIssuer`) and this one stands down.
 *
 * Null only where the word would be the generic one, never for a named faction:
 * the dispatcher picks the archetype off this same slug, so a faction skin's
 * nameplate — the Everymen masthead, the S.N.I.D.E. bar, the Ephemerists
 * wordmark — always has its own word to set, and an admin-set
 * `primary_faction_slug` on a metatask keeps it. Those two lines are then
 * differently labelled, which is all the rule asks.
 *
 * The test is on the resolved NAME rather than the slug, which is what keeps
 * Albescent hidden (ADR-0027): `factionName` masks that slug to the
 * unaffiliated word for a viewer who has not been shown the society, so an
 * albescent metatask must stand its header word down exactly as an `na` one
 * does — a word that appeared on one and not the other would BE the tell. A
 * revealed viewer resolves the real name and keeps it.
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
