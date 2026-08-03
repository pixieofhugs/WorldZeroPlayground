/**
 * usePraxisDetail — extracts every piece of state and async behaviour from the
 * legacy PraxisDetail.tsx so that per-faction archetypes can each own their
 * visual treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (praxis+votes fetch, reopen /
 * flag / moderate handlers, admin-bar visibility, isOwner). The returned
 * {@link PraxisDetailState} is the stable contract every praxis-detail
 * archetype consumes. Voting still routes through <VoteUI factionSlug=…>, so
 * faction vote UIs keep working through any archetype.
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
   * The comment rows for this praxis, fetched in the batch below off the route
   * param and handed to `CommentThread` as its seed (#1281).
   *
   * The thread cannot fetch these itself in time: `PraxisDetailComments` gates
   * on `moderation_status === 'visible'`, so the component is unmounted — its
   * effect cannot run at all — until the praxis has landed. That put comments a
   * full round trip behind everything else on the page. The gate stays exactly
   * where it is; the request just no longer waits behind it. The accepted cost
   * is one discarded request on a moderation-hidden praxis (owner decision,
   * #1281). Null while in flight, or if that fetch failed — the thread then
   * falls back to its own request, which is also the bare-mount path.
   */
  comments: CommentOut[] | null;

  // Derived
  /** True when the viewer is a MEMBER of this praxis (ADR-0013 co-ownership) —
   *  gates the edit/submit/withdraw actions, matching the backend _require_member guard. */
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

  // Flagging — reason is a pick from the shared vocabulary (ADR-0037);
  // flagDetail is the free-text note that only travels with 'other'.
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
  /**
   * Reopen a published praxis — the one direction this page moves it.
   *
   * THERE IS NO `handleResubmit` TWIN (#1089). Detail used to carry a submit
   * handler for the green CAST control, which was gated to `in_progress` /
   * `pending`; ADR-0062 redirects both statuses to the composer, so the control
   * and its handler were dead on arrival. Deleted rather than left dormant, for
   * the same reason as the metatask-apply wiring below. Casting is the
   * composer's, on both paths (#1071).
   */
  handleWithdraw: () => Promise<void>;
  handleFlag: () => Promise<void>;
  /** Remove another member from the collab (#959) — target is a character id. */
  handleKickMember: (memberId: number) => Promise<void>;

  // Metatasks are READ-ONLY on detail (#1093): the seal stack draws
  // `praxis.applied_metatasks` and nothing here applies or peels one. The apply
  // wiring this state used to carry — the metatask catalog fetch plus
  // apply/remove handlers — is deleted rather than left dormant, because
  // `apply_metatask` (services/praxis.py) requires `status == in_progress` and
  // 422s otherwise, so every control it could have fed was already dead.
  // Letting an owner seal a metatask after publishing reopens scoring on a
  // praxis that may already hold votes; that is a rule change and needs its own
  // ADR, not a re-added handler.
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

  // `api/admin` loads when a moderator acts, not when the page renders (#1141)
  // — the detail page is public, the admin bar is not.
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
      // Off the ROUTE PARAM, in this wave — see the `comments` field above for
      // why the thread cannot start its own fetch this early (#1281). A failed
      // comments fetch must not fail the page, hence the local catch: the
      // thread falls back to its own request when the seed is null.
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
      // `unsubmit_praxis` recalculates every member's stats: the points this
      // praxis was carrying come back off the rail's score and can drop a level.
      void refetch();
    } catch (err) {
      setWithdrawError(extractError(err, t("detail.errors.withdraw")));
    } finally {
      setWithdrawing(false);
    }
  };

  // Kick another member from the roster (#959). Any member may kick any other
  // (mirrors the backend guard); the confirm step lives in CollabRoster. A kick
  // resets the group to editing (ADR-0013), so the response carries the fresh
  // roster/cast state. On failure we re-sync from the server so the roster can't
  // drift out of step with the backend.
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

  // Merge the viewer's own just-cast vote into everything this page renders
  // (#626). It lands on the PRAXIS (#1142): every archetype's score panel is the
  // mounted `ScoreStamp`, which resolves its rows from `scoreBreakdown(praxis)`
  // (ADR-0053), so a merge that stopped short of the praxis left the panel
  // reading "+ 0 from votes" until a refresh — exactly the bug. There is no
  // second votes-summary payload to keep in step any more: `GET /praxes/{id}/votes`
  // carried numbers this praxis already has, and nothing rendered it (#1382).
  const castTally = useCastTally(praxis?.id ?? -1);
  const displayPraxis = praxis && castTally ? applyCastTally(praxis, castTally) : praxis;

  // The duel card is a SECOND payload with the same number in it (#1239): both
  // rows' totals, and the margin its verdict line subtracts out of them, come
  // off `DuelDetailOut` and nothing merged into that. Looked up per SIDE rather
  // than reusing `castTally`, because a spectator voting the RIVAL is the
  // reported case and the rival's praxis is not this page's — there is no
  // praxis payload here to read it off.
  const challengerTally = useCastTally(duel?.challenger.praxis_id ?? -1);
  const opponentTally = useCastTally(duel?.opponent.praxis_id ?? -1);
  const displayDuel = duel
    ? applyDuelCastTally(duel, {
        challenger: challengerTally,
        opponent: opponentTally,
      })
    : duel;

  const isOwner = isViewerMember(praxis, user?.character?.id);

  return {
    loading,
    praxis: displayPraxis,
    fetchError,

    voters,
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
