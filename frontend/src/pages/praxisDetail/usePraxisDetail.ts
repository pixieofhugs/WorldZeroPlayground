/**
 * usePraxisDetail — extracts every piece of state and async behaviour from the
 * legacy PraxisDetail.tsx so that per-faction archetypes can each own their
 * visual treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (praxis+votes fetch, withdraw /
 * resubmit / flag / moderate handlers, admin-bar visibility, isOwner). The
 * returned {@link PraxisDetailState} is the stable contract every praxis-detail
 * archetype consumes. Voting still routes through <VoteUI factionSlug=…>, so
 * faction vote UIs keep working through any archetype.
 */
import { useEffect, useState } from "react";
import {
  getPraxis,
  withdrawPraxis,
  submitPraxis,
  flagPraxis,
  applyMetatask,
  removeMetatask,
  type PraxisOut,
} from "../../api/praxis";
import { getVotes, getVoters, type VoteSummary, type VoterDetail } from "../../api/votes";
import { getDuelDetail, type DuelDetailOut } from "../../api/duel";
import { useAuth } from "../../auth/AuthContext";
import { useAdminMode } from "../../auth/AdminModeContext";
import { moderatePraxis } from "../../api/admin";
import { extractError } from "../../utils/errors";
import type { CurrentUser } from "../../api/auth";
import { listTasks, type TaskOut } from "../../api/tasks";

export interface PraxisDetailState {
  // Routing / loading
  loading: boolean;
  praxis: PraxisOut | null;
  fetchError: string | null;

  // Entities
  votes: VoteSummary | null;
  voters: VoterDetail[];
  /** Duel detail when this praxis is one side of a duel (#313); null otherwise. */
  duel: DuelDetailOut | null;

  // Derived
  /** True when the viewer is a MEMBER of this praxis (ADR-0013 co-ownership) —
   *  gates the edit/submit/withdraw actions, matching the backend _require_member guard. */
  isOwner: boolean;
  showAdminBar: boolean;
  // Authenticated viewer character (null when anonymous)
  user: CurrentUser | null;

  // Withdraw / resubmit
  withdrawing: boolean;
  showWithdrawConfirm: boolean;
  setShowWithdrawConfirm: (value: boolean) => void;
  withdrawError: string | null;

  // Admin moderation
  adminFailNote: string;
  setAdminFailNote: (value: string) => void;
  showFailInput: boolean;
  setShowFailInput: (value: boolean) => void;
  moderating: boolean;
  moderateError: string | null;

  // Flagging
  showFlagForm: boolean;
  setShowFlagForm: (value: boolean) => void;
  flagReason: string;
  setFlagReason: (value: string) => void;
  flagging: boolean;
  flagError: string | null;
  setFlagError: (value: string | null) => void;
  flagSubmitted: boolean;

  // Handlers
  handleModerate: (status: string, note?: string) => Promise<void>;
  handleWithdraw: () => Promise<void>;
  handleResubmit: () => Promise<void>;
  handleFlag: () => Promise<void>;

  // Metatasks
  metatasks: TaskOut[];
  metataskLoading: boolean;
  metataskError: string | null;
  applyingMetataskId: number | null;
  removingMetataskId: number | null;
  handleApplyMetatask: (taskId: number) => Promise<void>;
  handleRemoveMetatask: (taskId: number) => Promise<void>;
}

/**
 * Ownership mirrors the backend guard (_require_member): any praxis MEMBER may
 * edit/submit/withdraw (ADR-0013 co-ownership), not just the creator. The
 * creator is always seeded as a member, so solo and duel praxes are unchanged;
 * this only widens collab praxes so invited members see the owner actions (#348).
 */
export function isViewerMember(
  praxis: PraxisOut | null,
  viewerCharacterId: number | null | undefined,
): boolean {
  if (!praxis || viewerCharacterId == null) return false;
  return praxis.members.some(
    (member) => member.character_id === viewerCharacterId,
  );
}

export function usePraxisDetail(idParam: string | undefined): PraxisDetailState {
  const { user, refetch } = useAuth();
  const { adminMode } = useAdminMode();

  const [praxis, setPraxis] = useState<PraxisOut | null>(null);
  const [votes, setVotes] = useState<VoteSummary | null>(null);
  const [voters, setVoters] = useState<VoterDetail[]>([]);
  const [duel, setDuel] = useState<DuelDetailOut | null>(null);
  const [metatasks, setMetatasks] = useState<TaskOut[]>([]);
  const [metataskLoading, setMetataskLoading] = useState(false);
  const [metataskError, setMetataskError] = useState<string | null>(null);
  const [applyingMetataskId, setApplyingMetataskId] = useState<number | null>(null);
  const [removingMetataskId, setRemovingMetataskId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [adminFailNote, setAdminFailNote] = useState("");
  const [showFailInput, setShowFailInput] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [moderateError, setModerateError] = useState<string | null>(null);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagSubmitted, setFlagSubmitted] = useState(false);

  const showAdminBar = !!(user?.is_admin && adminMode && praxis);

  const handleModerate = async (status: string, note?: string) => {
    if (!praxis) return;
    setModerating(true);
    setModerateError(null);
    try {
      const updated = await moderatePraxis(praxis.id, status, note);
      setPraxis(updated);
      setShowFailInput(false);
      setAdminFailNote("");
    } catch (err) {
      setModerateError(extractError(err, "Moderation failed."));
    } finally {
      setModerating(false);
    }
  };

  useEffect(() => {
    if (!idParam) return;
    const pid = parseInt(idParam, 10);
    Promise.all([getPraxis(pid), getVotes(pid), getVoters(pid)])
      .then(([p, v, vr]) => {
        setPraxis(p);
        setVotes(v);
        setVoters(vr);
      })
      .catch((err) =>
        setFetchError(extractError(err, "Couldn't load this praxis.")),
      )
      .finally(() => setLoading(false));
  }, [idParam]);

  // Fetch duel detail in one round trip whenever this praxis is a duel side (#313).
  useEffect(() => {
    const duelId = praxis?.duel_id ?? null;
    if (duelId == null) {
      setDuel(null);
      return;
    }
    let cancelled = false;
    getDuelDetail(duelId)
      .then((d) => {
        if (!cancelled) setDuel(d);
      })
      .catch(() => {
        /* non-fatal — the page still renders without the cross-link */
      });
    return () => {
      cancelled = true;
    };
  }, [praxis?.duel_id]);

  useEffect(() => {
    if (!praxis) return;
    setMetataskLoading(true);
    listTasks({ task_type: "metatask" })
      .then(setMetatasks)
      .catch((err) => setMetataskError(extractError(err, "Failed to load metatasks.")))
      .finally(() => setMetataskLoading(false));
  }, [praxis?.id]);

  const handleApplyMetataskFn = async (taskId: number) => {
    if (!praxis) return;
    setApplyingMetataskId(taskId);
    setMetataskError(null);
    try {
      const updated = await applyMetatask(praxis.id, taskId);
      setPraxis(updated);
    } catch (err) {
      setMetataskError(extractError(err, "Failed to apply metatask."));
    } finally {
      setApplyingMetataskId(null);
    }
  };

  const handleRemoveMetataskFn = async (taskId: number) => {
    if (!praxis) return;
    setRemovingMetataskId(taskId);
    setMetataskError(null);
    try {
      await removeMetatask(praxis.id, taskId);
      const updated = await getPraxis(praxis.id);
      setPraxis(updated);
    } catch (err) {
      setMetataskError(extractError(err, "Failed to remove metatask."));
    } finally {
      setRemovingMetataskId(null);
    }
  };

  const handleWithdraw = async () => {
    if (!praxis) return;
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const updated = await withdrawPraxis(praxis.id);
      setPraxis(updated);
      setShowWithdrawConfirm(false);
      void refetch();
    } catch (err) {
      setWithdrawError(extractError(err, "Could not withdraw this praxis."));
    } finally {
      setWithdrawing(false);
    }
  };

  const handleResubmit = async () => {
    if (!praxis) return;
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const updated = await submitPraxis(praxis.id);
      setPraxis(updated);
      void refetch();
    } catch (err) {
      setWithdrawError(extractError(err, "Could not resubmit."));
    } finally {
      setWithdrawing(false);
    }
  };

  const handleFlag = async () => {
    if (!praxis) return;
    const trimmed = flagReason.trim();
    if (trimmed.length < 10) {
      setFlagError("Please describe the issue in at least 10 characters.");
      return;
    }
    setFlagging(true);
    setFlagError(null);
    try {
      await flagPraxis(praxis.id, trimmed);
      setFlagSubmitted(true);
      setShowFlagForm(false);
      setFlagReason("");
    } catch (err) {
      setFlagError(extractError(err, "Could not flag this praxis."));
    } finally {
      setFlagging(false);
    }
  };

  const isOwner = isViewerMember(praxis, user?.character?.id);

  return {
    loading,
    praxis,
    fetchError,

    votes,
    voters,
    duel,

    user,

    isOwner,
    showAdminBar,

    withdrawing,
    showWithdrawConfirm,
    setShowWithdrawConfirm,
    withdrawError,

    adminFailNote,
    setAdminFailNote,
    showFailInput,
    setShowFailInput,
    moderating,
    moderateError,

    showFlagForm,
    setShowFlagForm,
    flagReason,
    setFlagReason,
    flagging,
    flagError,
    setFlagError,
    flagSubmitted,

    metatasks,
    metataskLoading,
    metataskError,
    applyingMetataskId,
    removingMetataskId,
    handleApplyMetatask: handleApplyMetataskFn,
    handleRemoveMetatask: handleRemoveMetataskFn,

    handleModerate,
    handleWithdraw,
    handleResubmit,
    handleFlag,
  };
}
