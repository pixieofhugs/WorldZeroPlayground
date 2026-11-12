/**
 * usePraxisDetail — all state and async behaviour for the praxis-detail page, so
 * per-faction archetypes own only their visuals. {@link PraxisDetailState} is
 * the contract every archetype consumes.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getPraxis,
  unsubmitPraxis,
  flagPraxis,
  kickMember,
  type PraxisOut,
} from "../../api/praxis";
// Type-only: `api/admin` still loads dynamically, when a moderator acts (#1141).
import type { PraxisModerationStatus } from "../../api/admin";
import { getVoters, type VoterDetail } from "../../api/votes";
import { getDuelDetail, type DuelDetailOut } from "../../api/duel";
import { listComments, type CommentOut } from "../../api/comments";
import { useAuth } from "../../auth/AuthContext";
import { useAdminMode } from "../../auth/AdminModeContext";
import { extractError } from "../../utils/errors";
import { useCastTally } from "../../components/vote/castTallies";
import {
  applyPendingCast,
  usePendingCast,
} from "../../components/vote/pendingCasts";
import {
  applyCastTally,
  applyDuelCastTally,
} from "../../components/vote/useVotedPraxis";
import type { CurrentUser } from "../../api/auth";
import { FLAG_REASON_OTHER, type FlagReason } from "../../utils/flagReasons";

export interface PraxisDetailState {
  // Routing / loading
  loading: boolean;
  praxis: PraxisOut | null;
  fetchError: string | null;

  // Entities
  voters: VoterDetail[];
  /** Duel detail when this praxis is one side of a duel (#313); null otherwise. */
  duel: DuelDetailOut | null;
  /**
   * Comments fetched in the page batch and seeded into `CommentThread` (#1281):
   * `PraxisDetailComments` gates on `visible`, so the thread's own fetch would
   * wait a round trip. Costs one discarded request on a hidden praxis (owner
   * decision). Null while in flight or on failure — the thread then fetches.
   */
  comments: CommentOut[] | null;

  // Derived
  /** Viewer is a MEMBER (ADR-0013 co-ownership), matching `_require_member`. */
  isOwner: boolean;
  showAdminBar: boolean;
  // Authenticated viewer character (null when anonymous)
  user: CurrentUser | null;

  // Reopen (unsubmit)
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

  // Flagging: reason from the shared vocabulary (ADR-0037); flagDetail travels
  // only with 'other'.
  showFlagForm: boolean;
  setShowFlagForm: (value: boolean) => void;
  flagReason: FlagReason | null;
  setFlagReason: (value: FlagReason | null) => void;
  flagDetail: string;
  setFlagDetail: (value: string) => void;
  flagging: boolean;
  flagError: string | null;
  setFlagError: (value: string | null) => void;
  flagSubmitted: boolean;

  // Handlers
  handleModerate: (status: PraxisModerationStatus, note?: string) => Promise<void>;
  /** Reopen a published praxis. No submit twin: casting is the composer's (#1071). */
  handleWithdraw: () => Promise<void>;
  handleFlag: () => Promise<void>;
  /** Remove another member from the collab (#959) — target is a character id. */
  handleKickMember: (memberId: number) => Promise<void>;

  // Metatasks are READ-ONLY on detail (#1093): `apply_metatask` 422s outside
  // `in_progress`. Sealing after publish would reopen scoring and needs an ADR.
}

/**
 * Mirrors the backend `_require_member`: any MEMBER may act (ADR-0013), not just
 * the creator (#348). The creator is always seeded as a member.
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
  const { t } = useTranslation("praxis");
  const { user, refetch } = useAuth();
  const { adminMode } = useAdminMode();

  const [praxis, setPraxis] = useState<PraxisOut | null>(null);
  const [voters, setVoters] = useState<VoterDetail[]>([]);
  const [duel, setDuel] = useState<DuelDetailOut | null>(null);
  const [comments, setComments] = useState<CommentOut[] | null>(null);

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
  const [flagReason, setFlagReason] = useState<FlagReason | null>(null);
  const [flagDetail, setFlagDetail] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagSubmitted, setFlagSubmitted] = useState(false);

  const showAdminBar = !!(user?.is_admin && adminMode && praxis);

  // `api/admin` loads when a moderator acts, not on render (#1141).
  const handleModerate = async (status: PraxisModerationStatus, note?: string) => {
    if (!praxis) return;
    setModerating(true);
    setModerateError(null);
    try {
      const { moderatePraxis } = await import("../../api/admin");
      const updated = await moderatePraxis(praxis.id, status, note);
      setPraxis(updated);
      setShowFailInput(false);
      setAdminFailNote("");
    } catch (err) {
      setModerateError(extractError(err, t("detail.errors.moderate")));
    } finally {
      setModerating(false);
    }
  };

  useEffect(() => {
    if (!idParam) return;
    const pid = parseInt(idParam, 10);
    Promise.all([
      getPraxis(pid),
      getVoters(pid),
      // Off the route param, in this wave (#1281). Local catch: a failed
      // comments fetch must not fail the page; the thread falls back.
      listComments("praxes", pid).catch(() => null),
    ])
      .then(([p, vr, c]) => {
        setPraxis(p);
        setVoters(vr);
        setComments(c);
      })
      .catch((err) =>
        setFetchError(extractError(err, t("detail.errors.load"))),
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

  const handleWithdraw = async () => {
    if (!praxis) return;
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const updated = await unsubmitPraxis(praxis.id);
      setPraxis(updated);
      setShowWithdrawConfirm(false);
      // `unsubmit_praxis` recalculates every member's stats; points can come
      // back off and drop a level.
      void refetch();
    } catch (err) {
      setWithdrawError(extractError(err, t("detail.errors.withdraw")));
    } finally {
      setWithdrawing(false);
    }
  };

  // Kick another member (#959); confirm lives in CollabRoster. A kick resets the
  // group to editing (ADR-0013). On failure, re-sync so the roster can't drift.
  const handleKickMember = async (memberId: number) => {
    if (!praxis) return;
    try {
      const updated = await kickMember(praxis.id, memberId);
      setPraxis(updated);
    } catch {
      const resynced = await getPraxis(praxis.id).catch(() => null);
      if (resynced) setPraxis(resynced);
    }
  };

  const handleFlag = async () => {
    if (!praxis) return;
    if (flagReason === null) {
      setFlagError(t("detail.errors.flagReasonMissing"));
      return;
    }
    setFlagging(true);
    setFlagError(null);
    try {
      const detail =
        flagReason === FLAG_REASON_OTHER ? flagDetail.trim() : undefined;
      await flagPraxis(praxis.id, flagReason, detail || undefined);
      setFlagSubmitted(true);
      setShowFlagForm(false);
      setFlagReason(null);
      setFlagDetail("");
    } catch (err) {
      setFlagError(extractError(err, t("detail.errors.flag")));
    } finally {
      setFlagging(false);
    }
  };

  // Merge the viewer's just-cast vote into the PRAXIS (#626, #1142): every score
  // panel resolves from `scoreBreakdown(praxis)` (ADR-0053).
  const castTally = useCastTally(praxis?.id ?? -1);
  const displayPraxis = praxis && castTally ? applyCastTally(praxis, castTally) : praxis;

  // The duel card is a second payload with the same numbers (#1239). Per SIDE:
  // a spectator voting the rival is the reported case, and that praxis isn't here.
  const challengerTally = useCastTally(duel?.challenger.praxis_id ?? -1);
  const opponentTally = useCastTally(duel?.opponent.praxis_id ?? -1);
  const displayDuel = duel
    ? applyDuelCastTally(duel, {
        challenger: challengerTally,
        opponent: opponentTally,
      })
    : duel;

  // Merge the viewer's own row into the once-fetched voters list (#1895);
  // updates on re-vote, rolls back if refused. The score still moves only on the
  // server's tally — see `pendingCasts`.
  const viewerCast = usePendingCast(praxis?.id ?? -1);
  const displayVoters = applyPendingCast(voters, viewerCast);

  const isOwner = isViewerMember(praxis, user?.character?.id);

  return {
    loading,
    praxis: displayPraxis,
    fetchError,

    voters: displayVoters,
    duel: displayDuel,
    comments,

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
    flagDetail,
    setFlagDetail,
    flagging,
    flagError,
    setFlagError,
    flagSubmitted,

    handleModerate,
    handleWithdraw,
    handleFlag,
    handleKickMember,
  };
}
