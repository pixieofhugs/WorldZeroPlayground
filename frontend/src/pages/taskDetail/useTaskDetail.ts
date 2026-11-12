/**
 * All task-detail state and async behaviour, so archetypes own only their look.
 * `TaskDetailState` is the stable contract every archetype consumes.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getTask, type TaskOut } from "../../api/tasks";
import {
  listPraxes,
  createPraxis,
  deletePraxis,
  type PraxisCardOut,
} from "../../api/praxis";
import { cancelChallenge } from "../../api/duel";
import type { ConfirmRequest } from "../../components/confirm/composerConfirms";
import { dropConfirmFor } from "./dropConfirm";
import { listRelationships } from "../../api/relationships";
import { listComments, type CommentOut } from "../../api/comments";
import { useAuth } from "../../auth/AuthContext";
import i18n from "../../i18n";
import { extractError } from "../../utils/errors";
import { useGameConfig } from "../../hooks/useGameConfig";
import { isLevelJumpSignup } from "./levelJump";
import { canSignUpForTask } from "./signupCta";

const DEFAULT_MAX_TASK_SLOTS = 20;

/**
 * A drop asked for and not yet confirmed (#2215). The dialog is mounted once by
 * `TaskDetail.tsx`, so archetypes only call `handleDrop`.
 */
interface DropConfirmState {
  request: ConfirmRequest;
  onConfirm: () => void;
  onDismiss: () => void;
}

export interface TaskDetailState {
  loading: boolean;
  task: TaskOut | null;
  fetchError: string | null;

  // Deliberately no `signups`: no roster on task detail (owner ruling, #1262).
  // `detailContract.test.tsx` pins the absence.
  submissions: PraxisCardOut[];
  /**
   * Comment rows fetched in the page batch as `CommentThread`'s seed (#1281),
   * since the active-task gate keeps the thread unmounted until the task lands.
   * Null in flight or on failure; the thread then fetches its own.
   */
  comments: CommentOut[] | null;
  friends: Set<number>;
  foes: Set<number>;

  mySubmission: PraxisCardOut | undefined;
  isInProgress: boolean;
  inProgressPraxisId: number | null;

  canSignUp: boolean;
  /** The CTA is reachable only via the faction level-jump allowance (#816). */
  levelJumpSignup: boolean;
  slotsOpen: number;
  maxTaskSlots: number;
  /** Unmultiplied `task.point_value` (0 with no task), drawn beside the multiplier (ADR-0055). */
  basePoints: number;
  /**
   * The RAW server-resolved modifier (`viewer_faction_multiplier`). Never
   * reconstruct it as `modifiedPoints / basePoints` (ADR-0053).
   */
  factionMultiplier: number;
  /** Base × multiplier, rounded. */
  modifiedPoints: number;
  /** `in_progress_count` (#1021) with its default; the only in-progress population shown. */
  inProgressCount: number;
  topScore: number; // highest submission merit — non-mean signal (ADR-0014; no averages)
  voteCount: number;

  submissionSort: "score" | "recent";
  setSubmissionSort: (sort: "score" | "recent") => void;
  sortedSubmissions: PraxisCardOut[];

  signupError: string | null;
  handleSignup: () => Promise<void>;
  /** ASK to drop this task: opens {@link dropConfirm}, does not delete (#2215). */
  handleDrop: () => void;
  /** The pending drop confirmation, rendered by the dispatcher; null when none. */
  dropConfirm: DropConfirmState | null;
}

export function useTaskDetail(idParam: string | undefined): TaskDetailState {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [task, setTask] = useState<TaskOut | null>(null);
  const [submissions, setSubmissions] = useState<PraxisCardOut[]>([]);
  const [comments, setComments] = useState<CommentOut[] | null>(null);
  /**
   * The viewer's open draft for THIS task, as a row: `handleDrop` needs its
   * `type`/`members`/`duel_id`. `isInProgress` and the id derive from it.
   */
  const [inProgressPraxis, setInProgressPraxis] =
    useState<PraxisCardOut | null>(null);
  /** The draft a pending confirm is asking about; null when none is open. */
  const [dropTarget, setDropTarget] = useState<PraxisCardOut | null>(null);
  const [taskSlotCount, setTaskSlotCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [friends, setFriends] = useState<Set<number>>(new Set());
  const [foes, setFoes] = useState<Set<number>>(new Set());

  const gameConfig = useGameConfig();
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS;

  const [submissionSort, setSubmissionSort] = useState<"score" | "recent">(
    "score",
  );

  useEffect(() => {
    if (!idParam) return;
    setLoading(true);
    setInProgressPraxis(null);
    const taskId = parseInt(idParam, 10);

    const fetches: Promise<unknown>[] = [
      getTask(taskId),
      listPraxes({ task_id: taskId, status: "submitted" }),
      // Unconditional (comments are public), keeping the destructure positional.
      // Local catch: a failed seed must not fail the page (#1281).
      listComments("tasks", taskId).catch(() => null),
    ];
    if (user) {
      fetches.push(
        listPraxes({ character_id: user.character?.id, status: "in_progress" }),
      );
      // ONE relationship read, split by type client-side (#1390).
      fetches.push(
        listRelationships()
          .then((rels) => {
            const active = rels.filter((r) => r.status === "active");
            return {
              friends: new Set(
                active
                  .filter((r) => r.type === "friend")
                  .map((r) => r.to_character_id),
              ),
              foes: new Set(
                active
                  .filter((r) => r.type === "foe")
                  .map((r) => r.to_character_id),
              ),
            };
          })
          .catch(() => ({
            friends: new Set<number>(),
            foes: new Set<number>(),
          })),
      );
    }

    Promise.all(fetches)
      .then(([t, s, c, myTasks, relationships]) => {
        setTask(t as TaskOut);
        setSubmissions(s as PraxisCardOut[]);
        setComments(c as CommentOut[] | null);
        if (myTasks) {
          const praxes = myTasks as PraxisCardOut[];
          const activeForThisTask = praxes.find(
            (p) => p.task_id === taskId,
          );
          setInProgressPraxis(activeForThisTask ?? null);
          setTaskSlotCount(praxes.length);
        }
        if (relationships) {
          const { friends, foes } = relationships as {
            friends: Set<number>;
            foes: Set<number>;
          };
          setFriends(friends);
          setFoes(foes);
        }
      })
      .catch((err) =>
        setFetchError(extractError(err, "Couldn't load this task.")),
      )
      .finally(() => setLoading(false));
    // Key on the character id, not `user`: an auth-object identity change would
    // flash "Loading…".
  }, [idParam, location.key, user?.character?.id]);

  const mySubmission = user?.character
    ? submissions.find(
        (s) => s.created_by_id === user.character!.id,
      )
    : undefined;

  const handleSignup = useCallback(async () => {
    if (!task) return;
    setSignupError(null);
    try {
      const praxis = await createPraxis({ task_id: task.id, type: "solo" });
      navigate(`/praxis/${praxis.id}/edit`);
    } catch (err) {
      setSignupError(extractError(err, "Could not sign up for this task."));
    }
  }, [task, navigate]);

  /**
   * ASK to drop — opens the confirm only. Never `window.confirm`: a browser that
   * suppresses dialogs returns false silently, killing the control (#2215). The
   * guard is unreachable from current skins but says something rather than no-op.
   */
  const handleDrop = useCallback(() => {
    if (!task || !inProgressPraxis) {
      setSignupError(i18n.t("tasks:detail.inProgress.dropUnavailable"));
      return;
    }
    setSignupError(null);
    setDropTarget(inProgressPraxis);
  }, [task, inProgressPraxis]);

  const cancelDrop = useCallback(() => setDropTarget(null), []);

  /** The confirmed half: dissolve any duel, delete, then resync the task. */
  const confirmDrop = useCallback(async () => {
    if (!task || !dropTarget) return;
    setDropTarget(null);
    setSignupError(null);
    try {
      // Dissolve the duel, THEN delete (as `useEditPraxis.ts` cancel): both duel
      // FKs on `praxis` are NO ACTION. A live/resolved duel's refusal lands in the banner.
      if (dropTarget.duel_id != null) {
        await cancelChallenge(dropTarget.duel_id);
      }
      await deletePraxis(dropTarget.id);
      setInProgressPraxis(null);
      setSubmissions((prev) => prev.filter((s) => s.id !== dropTarget.id));
      // Re-read: the server's `can_sign_up` and `in_progress_count` are now stale.
      try {
        setTask((await getTask(task.id)) as TaskOut);
      } catch {
        // The drop succeeded; a stale flag clears on the next navigation.
      }
    } catch (err) {
      setSignupError(extractError(err, i18n.t("forms:editPraxis.errors.drop")));
    }
  }, [task, dropTarget]);

  /** What the dispatcher draws while a drop is pending. */
  const dropConfirm = useMemo<DropConfirmState | null>(
    () =>
      dropTarget === null
        ? null
        : {
            request: dropConfirmFor(dropTarget),
            onConfirm: confirmDrop,
            onDismiss: cancelDrop,
          },
    [dropTarget, confirmDrop, cancelDrop],
  );

  // Server-resolved (#2865); the client only formats.
  const factionMultiplier = task?.viewer_faction_multiplier ?? 1.0;
  const basePoints = task?.point_value ?? 0;
  const inProgressCount = task?.in_progress_count ?? 0;
  const modifiedPoints = Math.round((task?.point_value ?? 0) * factionMultiplier);

  // The server alone decides; don't AND in a local "already on it" mirror (#1497).
  const canSignUp = canSignUpForTask({
    signedIn: !!user,
    canSignUp: task?.can_sign_up,
  });
  const levelJumpSignup = isLevelJumpSignup({
    canSignUp,
    levelJumpReach: user?.level_jump_reach ?? 0,
    levelJumpAvailable: !!user?.level_jump_available,
    taskLevelRequired: task?.level_required,
    viewerLevel: user?.character?.level ?? 0,
  });
  const slotsOpen = maxTaskSlots - taskSlotCount;

  const voteCount = submissions.length;
  // ADR-0014 forbids vote averages; expose the highest submission merit instead.
  const topScore = submissions.reduce(
    (max, s) => Math.max(max, s.score ?? 0),
    0,
  );

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      if (submissionSort === "score") return (b.score ?? 0) - (a.score ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [submissions, submissionSort]);

  return {
    loading,
    task,
    fetchError,

    submissions,
    comments,
    friends,
    foes,

    mySubmission,
    // Both derived from the one row, so they cannot disagree.
    isInProgress: inProgressPraxis !== null,
    inProgressPraxisId: inProgressPraxis?.id ?? null,

    canSignUp,
    levelJumpSignup,
    slotsOpen,
    maxTaskSlots,
    basePoints,
    factionMultiplier,
    modifiedPoints,
    inProgressCount,
    topScore,
    voteCount,

    submissionSort,
    setSubmissionSort,
    sortedSubmissions,

    signupError,
    handleSignup,
    handleDrop,
    dropConfirm,
  };
}
