/**
 * useEditPraxis — the composer's state and async behaviour, so faction
 * archetypes own only their visuals. The **assembler** (#1392) of:
 *
 *   `useComposerDraft`   — title and body, as a view of the room's document
 *   `useComposerMedia`   — the tray: pick, edit, upload, remove
 *   `useMetataskApply`   — the applied seal stack, picker and peel-off
 *   `useComposerRoster`  — the search box, invites, challenge, kick, nudge
 *   `useComposerDuel`    — the challenge pane, duel detail, seal dialog
 *   `useComposerConfirm` — the one in-page confirm slot
 *
 * Owned here: the initial load, the seal catalogue, lifecycle transitions, and
 * cross-concern derived flags. Sub-hooks report outcomes; this file writes the
 * praxis and error line via `reportOutcome` (#2945). Mount-time request ORDER
 * matters (#1379).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePraxisType,
  deletePraxis,
  getPraxis,
  leavePraxis,
  setPraxisDone,
  submitPraxis,
  takeJustCreatedPraxis,
  unsubmitPraxis,
  type MediaItemOut,
  type PraxisOut,
  type PraxisType,
} from "../../api/praxis";
import {
  cancelChallenge,
  getDuelDetail,
  type DuelDetailOut,
} from "../../api/duel";
import type { CharacterOut } from "../../api/characters";
import { deriveCollabGate } from "../../components/collab/CollabRoster";
import { deriveEditPraxisPhase } from "./editPraxisPhase";
import { discardRoomStore } from "./roomStore";
import { editNeedsProposalConfirm } from "./proposalGuard";
import { planInitialLoad, loadPlannedPraxis } from "./initialLoadPlan";
import {
  deleteCollabConfirm,
  dropDuelSideConfirm,
  dropTaskConfirm,
  duelDropsCoauthorsConfirm,
  editCancelsProposalConfirm,
  leaveCollabConfirm,
  modeSwitchConfirm,
  proposePublishConfirm,
  reopenForEditConfirm,
} from "../../components/confirm/composerConfirms";
import { useComposerConfirm } from "./useComposerConfirm";
import { useComposerDraft } from "./useComposerDraft";
import { applyOutcome, type ComposerOutcome } from "./composerOutcome";
import { useComposerMedia } from "./useComposerMedia";
import { useMetataskApply } from "./useMetataskApply";
import {
  useComposerRoster,
  type RosterOutcome,
} from "./useComposerRoster";
import { useComposerDuel } from "./useComposerDuel";
import { useGameConfig } from "../../hooks/useGameConfig";
import { getTask, type TaskOut } from "../../api/tasks";
import { listMetatasks } from "../../api/metatasks";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

// Re-exported for importers using this path.
export { MAX_FILE_SIZE } from "./useComposerMedia";

export type { EditPraxisState } from "./editPraxisState";
import type { EditPraxisState } from "./editPraxisState";

/** Lives in `editPraxisPhase.ts` (#1397) to keep praxis-detail's chunk light. */
export {
  deriveEditPraxisPhase,
  isWaitingStage,
  type EditPraxisPhase,
} from "./editPraxisPhase";

export function useEditPraxis(idParam: string | undefined): EditPraxisState {
  const navigate = useNavigate();
  const { user, refetch, loading: authLoading } = useAuth();

  const [praxis, setPraxis] = useState<PraxisOut | null>(null);
  // The `submit_proposed_at` this member agreed to cancel (#1811, `proposalGuard.ts`).
  const [agreedProposalAt, setAgreedProposalAt] = useState<string | null>(null);
  const [task, setTask] = useState<TaskOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // The one write-back for sub-hook outcomes (#2945); `applyOutcome` is tested in
  // `__tests__/composerOutcomeWriteBack.test.ts`.
  const reportOutcome = useCallback((outcome: ComposerOutcome) => {
    applyOutcome(outcome, { setPraxis, setError });
  }, []);

  const {
    media,
    setMedia,
    fileError,
    handleFileChange: handleFileChangeSide,
    removeMedia: removeMediaSide,
    pickFromGooglePhotos: pickFromGooglePhotosSide,
    pendingImage,
    confirmImageEdit: confirmImageEditSide,
    cancelImageEdit,
    reportImageError,
  } = useComposerMedia(idParam);

  // Media failures never clear the line: `MediaOutcome` has no success arm (#2878).
  const handleFileChange = useCallback(
    async (files: File[]) => {
      reportOutcome(await handleFileChangeSide(files));
    },
    [handleFileChangeSide, reportOutcome],
  );

  const pickFromGooglePhotos = useCallback(
    async (signal: AbortSignal) => {
      reportOutcome(await pickFromGooglePhotosSide(signal));
    },
    [pickFromGooglePhotosSide, reportOutcome],
  );

  const removeMedia = useCallback(
    async (item: MediaItemOut) => {
      reportOutcome(await removeMediaSide(item));
    },
    [removeMediaSide, reportOutcome],
  );

  const confirmImageEdit = useCallback(
    async (blob: Blob) => {
      reportOutcome(await confirmImageEditSide(blob));
    },
    [confirmImageEditSide, reportOutcome],
  );

  // Seals this viewer may apply (viewer-keyed load); the applied set is `useMetataskApply`.
  const [metatasks, setMetatasks] = useState<TaskOut[]>([]);

  const {
    appliedMetatasks,
    appliedMetataskList,
    applyingMetatask,
    addMetatask: addMetataskSide,
    metataskPickerOpen,
    openMetataskPicker: openMetataskPickerSide,
    closeMetataskPicker,
    metataskRemovalTarget,
    requestRemoveMetatask,
    confirmRemoveMetatask: confirmRemoveMetataskSide,
    cancelRemoveMetatask,
    seedApplied: seedAppliedMetatasks,
  } = useMetataskApply({ praxis });

  // Must write the re-scored praxis too, or the stamp shows the old score (#2464).
  const addMetatask = useCallback(
    async (mt: TaskOut) => {
      reportOutcome(await addMetataskSide(mt));
    },
    [addMetataskSide, reportOutcome],
  );

  const confirmRemoveMetatask = useCallback(async () => {
    reportOutcome(await confirmRemoveMetataskSide());
  }, [confirmRemoveMetataskSide, reportOutcome]);

  // The sheet prints `error` itself (#2382); open it onto a clear line.
  const openMetataskPicker = useCallback(() => {
    setError("");
    openMetataskPickerSide();
  }, [openMetataskPickerSide]);

  const [switchingMode, setSwitchingMode] = useState<PraxisType | null>(null);
  // One-shot post-publish beat for the member whose cast closed the gate (#591).
  const [collabSuccess, setCollabSuccess] = useState(false);

  const { pendingConfirm, askConfirm, acceptConfirm, dismissConfirm } =
    useComposerConfirm();

  const {
    duel,
    setDuel,
    duelPaneOpen,
    setDuelPaneOpen,
    duelSealOpen,
    setDuelSealOpen,
    requestDuelSeal,
    cancelDuelSeal,
    cancelDuel: cancelDuelSide,
    dissolveDuel: dissolveDuelSide,
  } = useComposerDuel({ praxis, askConfirm });

  const cancelDuel = useCallback(async () => {
    reportOutcome(await cancelDuelSide());
  }, [cancelDuelSide, reportOutcome]);

  const dissolveDuel = useCallback(async () => {
    reportOutcome(await dissolveDuelSide());
  }, [dissolveDuelSide, reportOutcome]);

  // App-wide cached config (#1141). `null` until loaded or on failure: duel chip
  // hidden, countdown undrawn.
  const gameConfig = useGameConfig();
  const duelLevelRequired = gameConfig?.duel_level_required ?? null;
  const autoSubmitDays = gameConfig?.collab_auto_submit_days ?? null;

  const {
    title,
    setTitle,
    body,
    setBody,
    autosaveAt,
    setAutosaveAt,
    hydrate: hydrateDraft,
  } = useComposerDraft();

  useEffect(() => {
    if (!idParam) return;
    // A still-loading `user` would bounce to the read page, which redirects back
    // (loop). `<ProtectedRoute>` already waits on auth (#1379); this is the floor.
    if (authLoading) return;
    const praxisId = parseInt(idParam, 10);
    setLoading(true);
    // Reuse a just-created praxis row instead of re-reading it (#1379); the plan
    // is a pure value so it's testable without a DOM (#2881).
    loadPlannedPraxis(planInitialLoad(praxisId, takeJustCreatedPraxis), getPraxis)
      .then(async (loaded) => {
        // Any member may edit (ADR-0013); gating on creator caused a redirect loop.
        const viewerId = user?.character?.id;
        const isMember =
          viewerId != null &&
          loaded.members.some((member) => member.character_id === viewerId);
        if (!isMember) {
          navigate(`/praxis/${idParam}`, { replace: true });
          return;
        }
        setPraxis(loaded);
        hydrateDraft(loaded.title ?? "", loaded.body_text ?? "");
        setMedia(loaded.media_items);
        seedAppliedMetatasks(loaded.applied_metatasks ?? []);
        await getTask(loaded.task_id)
          .then(setTask)
          .catch(() => {
            /* non-fatal */
          });
      })
      .catch(() => setError(i18n.t("forms:editPraxis.errors.load")))
      .finally(() => setLoading(false));
    // Never depend on `user`: `/auth/me` mints a new object per refetch (#1390).
  }, [idParam, user?.character?.id, authLoading, navigate]);

  // Seals (#933): viewer-keyed, so fired at mount beside the praxis read (#1379).
  useEffect(() => {
    if (!user?.character) return;
    listMetatasks()
      .then((all) =>
        setMetatasks(all.filter((mt) => mt.eligible_for_current_user)),
      )
      .catch(() => {
        /* the seal picker stays empty; the composer is unaffected */
      });
  }, [user?.character?.id]);

  // Declared AFTER the two loads: effects run in call order, keeping getPraxis
  // and listMetatasks ahead of the foes read (#1379).
  const {
    inviteQuery,
    setInviteQuery,
    inviteResults,
    inviteOpen,
    setInviteOpen,
    inviting,
    sendInvite: sendInviteSide,
    cancelInvite: cancelInviteSide,
    kickMember: kickMemberSide,
    nudge: nudgeSide,
    nudgeCrew: nudgeCrewSide,
    crewNudge,
    sendChallenge: sendChallengeSide,
  } = useComposerRoster({
    praxis,
    duelPane: { duel, paneOpen: duelPaneOpen },
  });

  // A nudge also carries a re-read duel (see `RosterOutcome`).
  const reportRoster = useCallback(
    (outcome: RosterOutcome) => {
      reportOutcome(outcome);
      if (outcome.kind === "applied" && outcome.duel) setDuel(outcome.duel);
    },
    [reportOutcome, setDuel],
  );

  const sendInvite = useCallback(
    async (character: CharacterOut) => {
      reportRoster(await sendInviteSide(character));
    },
    [sendInviteSide, reportRoster],
  );

  const cancelInvite = useCallback(
    async (inviteId: number) => {
      reportRoster(await cancelInviteSide(inviteId));
    },
    [cancelInviteSide, reportRoster],
  );

  const kickMember = useCallback(
    async (memberId: number) => {
      reportRoster(await kickMemberSide(memberId));
    },
    [kickMemberSide, reportRoster],
  );

  const nudge = useCallback(
    async (characterId: number) => {
      reportRoster(await nudgeSide(characterId));
    },
    [nudgeSide, reportRoster],
  );

  const nudgeCrew = useCallback(async () => {
    reportRoster(await nudgeCrewSide());
  }, [nudgeCrewSide, reportRoster]);

  const sendChallenge = useCallback(
    async (character: CharacterOut) => {
      reportRoster(await sendChallengeSide(character));
    },
    [sendChallengeSide, reportRoster],
  );

  const publish = useCallback(async () => {
    // Close the seal dialog so errors aren't hidden behind it (#718).
    setDuelSealOpen(false);
    if (!idParam || !title.trim()) {
      setError(i18n.t("forms:editPraxis.errors.titleRequired"));
      return;
    }
    if (title.length > 200) {
      setError(i18n.t("forms:editPraxis.errors.titleTooLong"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const praxisId = parseInt(idParam, 10);
      // No flush: the text is already durable in the room (#1743).
      await submitPraxis(praxisId);
      // Publishing destroyed the server doc (ADR-0073 rule 7). Discard here, not
      // only in the effect below: a solo publish navigates away before it runs (#2381).
      discardRoomStore(praxisId);
      let refreshed: PraxisOut | null = null;
      let refreshedDuel: DuelDetailOut | null = duel;
      try {
        // Going live moves points and delivers invitation letters, which reach
        // InvitationWatcher only via `user.character.invitations`.
        await refetch();
        // The auth refetch says nothing about who has cast; the member list
        // decides success screen vs redirect.
        refreshed = await getPraxis(praxisId);
        setPraxis(refreshed);
        // My cast may SETTLE the duel (`maybe_settle_duel`); `duel_id` is
        // unchanged so the detail effect won't re-fire (ADR-0059).
        if (refreshed.duel_id != null) {
          refreshedDuel = await getDuelDetail(refreshed.duel_id);
          setDuel(refreshedDuel);
        }
      } catch {
        // best-effort; praxis was submitted successfully
      }
      // My cast closed a multi-member collab's gate: success beat (#591).
      if (refreshed) {
        const gate = deriveCollabGate(refreshed.members, user?.character?.id);
        if (gate.memberCount > 1 && gate.state === "published") {
          setCollabSuccess(true);
          return;
        }
        // Multi-party: stay on the waiting surface (ADR-0059); the phase is
        // derived, so returning is the whole hold. Solo redirects.
        if (
          deriveEditPraxisPhase(refreshed, refreshedDuel, user?.character?.id) ===
          "waiting"
        ) {
          return;
        }
      }
      navigate(`/praxis/${idParam}`);
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.publish")));
    } finally {
      setSubmitting(false);
    }
  }, [idParam, title, navigate, refetch, user?.character?.id, duel]);

  // Keep the draft and leave (#1081); the room already has every keystroke
  // (#1743). The profile grid shows the viewer's own in_progress work.
  const saveDraft = useCallback(async () => {
    if (!idParam) return;
    setError("");
    const characterId = user?.character?.id;
    navigate(characterId != null ? `/characters/${characterId}` : "/tasks");
  }, [idParam, navigate, user?.character?.id]);

  // Withdraw a collab proposal (a GROUP act: approvals clear) or reopen a duel
  // side (#1077, ADR-0079). No confirm: the presser is reading the proposal, and
  // a duel reopen is free until `settled` (ADR-0011). `reopenForEdit` asks.
  const pullBack = useCallback(async () => {
    if (!idParam) return;
    setSubmitting(true);
    setError("");
    try {
      const praxisId = parseInt(idParam, 10);
      await unsubmitPraxis(praxisId);
      await refetch();
      // Reload, or the roster keeps showing the just-cleared approvals.
      setPraxis(await getPraxis(praxisId));
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.publish")));
    } finally {
      setSubmitting(false);
    }
  }, [idParam, refetch]);

  // Done (ADR-0079): social only. Sends the VALUE, not a toggle (server owns the
  // flag). No auth refetch: no points or letters move.
  const markDone = useCallback(
    async (isDone: boolean) => {
      if (!idParam) return;
      setSubmitting(true);
      setError("");
      try {
        setPraxis(await setPraxisDone(parseInt(idParam, 10), isDone));
      } catch (err) {
        setError(extractError(err, i18n.t("forms:editPraxis.errors.publish")));
      } finally {
        setSubmitting(false);
      }
    },
    [idParam],
  );

  // Propose (ADR-0079): same request as Approve, but it starts everyone's clock
  // and silence is consent, hence the dialog.
  const propose = useCallback(async () => {
    if (!praxis) return;
    if (!(await askConfirm(proposePublishConfirm(praxis.task_faction_slug))))
      return;
    await publish();
  }, [praxis, askConfirm, publish]);

  // First keystroke on a live proposal (ADR-0079). NOT async: the CodeMirror
  // filter is synchronous and already dropped the edit; declining costs one
  // keystroke. Agreeing pins this proposal's `submit_proposed_at`.
  //
  // ponytail: the client sees the cancellation only on its next praxis read, so
  // the footer may offer Approve/Withdraw on a closed window (both recoverable).
  // Upgrade: refetch the praxis off the room's `onUpdate` signal.
  const proposalConfirmArmed = editNeedsProposalConfirm(praxis, agreedProposalAt);
  const confirmProposalEdit = useCallback(() => {
    if (!praxis) return;
    const proposedAt = praxis.submit_proposed_at;
    void askConfirm(editCancelsProposalConfirm(praxis.task_faction_slug)).then(
      (accepted) => {
        if (accepted) setAgreedProposalAt(proposedAt);
      },
    );
  }, [praxis, askConfirm]);

  // Waiting surface's "edit my write-up" (ADR-0059), via `pullBack` (#590). A
  // collab confirms first: the edit resets everyone's countdown. A duel reopen
  // is free before settling (ADR-0011 §Forfeit).
  const reopenForEdit = useCallback(async () => {
    if (!praxis) return;
    if (praxis.type === "collab" && praxis.members.length > 1) {
      const confirmed = await askConfirm(
        reopenForEditConfirm(praxis.task_faction_slug),
      );
      if (!confirmed) return;
    }
    await pullBack();
  }, [praxis, pullBack, askConfirm]);

  // Leave a collab (#958); unlike `cancel`, the praxis survives. Membership is
  // the only condition, creator included (ADR-0013, #1074).
  const leaveCollab = useCallback(async () => {
    if (!praxis) return;
    // Count picks the consequence: 3+ carry on, 2 converts to solo (ADR-0060), 1 ends.
    const confirmed = await askConfirm(
      leaveCollabConfirm(praxis.task_faction_slug, praxis.members.length),
    );
    if (!confirmed) return;
    try {
      await leavePraxis(praxis.id);
      // Leaving recalculates the leaver's score and level.
      await refetch();
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.leave")));
      return;
    }
    navigate("/tasks");
  }, [praxis, navigate, refetch, askConfirm]);

  // Explicit tap, not a timer (#591).
  const continueFromCollabSuccess = useCallback(() => {
    setCollabSuccess(false);
    navigate(`/praxis/${idParam}`);
  }, [idParam, navigate]);

  const cancel = useCallback(async () => {
    if (!praxis) return;
    // Deleting a collab destroys everyone's part (creator only, `delete_praxis`);
    // members want `leaveCollab` (ADR-0013, #1074).
    //
    // A duel side (solo + `duel_id`) has its own path: duel FKs are NO ACTION
    // (`models/praxis.py`), so the duel must be dissolved first or the delete
    // 409s (#1831). `delete_praxis` discards only DECLINED duel rows; see
    // `services.praxis_duel.discard_dissolved_duels_for_praxis`.
    const inDuel = praxis.duel_id != null;
    const crewAtStake = praxis.type === "collab" && praxis.members.length > 1;
    const confirmed = await askConfirm(
      crewAtStake
        ? deleteCollabConfirm(praxis.task_faction_slug)
        : inDuel
          ? dropDuelSideConfirm()
          : dropTaskConfirm(),
    );
    if (!confirmed) return;
    try {
      // `cancel_duel_challenge` takes pending or active, penalty-free. Not via
      // `changeMode`, which refuses an accepted duel.
      if (praxis.duel_id != null) {
        await cancelChallenge(praxis.duel_id);
      }
      await deletePraxis(praxis.id);
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.drop")));
      return;
    }
    navigate("/tasks");
  }, [praxis, navigate, askConfirm]);

  const changeMode = useCallback(
    async (next: PraxisType) => {
      if (!praxis) return;

      // Duel reveals the challenge box (#311); the type stays 'solo'.
      if (next === "duel") {
        if (praxis.duel_id != null) return; // already dueling
        // A duel side must be solo (ADR-0011).
        if (praxis.type === "collab") {
          if (
            praxis.members.length > 1 &&
            !(await askConfirm(duelDropsCoauthorsConfirm()))
          ) {
            return;
          }
          setError("");
          setSwitchingMode("solo");
          try {
            const updated = await changePraxisType(praxis.id, "solo");
            setPraxis(updated);
            setMedia(updated.media_items);
          } catch (err) {
            setError(
              extractError(err, i18n.t("forms:editPraxis.errors.changeMode")),
            );
            setSwitchingMode(null);
            return;
          }
          setSwitchingMode(null);
        }
        setDuelPaneOpen(true);
        return;
      }

      const inDuel = praxis.duel_id != null;
      if (!inDuel && next === praxis.type) {
        setDuelPaneOpen(false);
        return;
      }

      // UI choice, not a backend limit: an accepted duel is left via the
      // "dissolve duel" control, which confirms (#956).
      if (inDuel && duel && duel.status !== "pending") {
        setError(i18n.t("forms:editPraxis.errors.duelUnderway"));
        return;
      }

      const request = modeSwitchConfirm(
        next,
        praxis.type,
        praxis.members.length,
        inDuel,
      );
      if (request && !(await askConfirm(request))) return;

      setError("");
      setSwitchingMode(next);
      try {
        if (inDuel && praxis.duel_id != null) {
          await cancelChallenge(praxis.duel_id);
        }
        // In a duel the type is already 'solo', so solo just reloads.
        const updated =
          next === praxis.type
            ? await getPraxis(praxis.id)
            : await changePraxisType(praxis.id, next);
        setPraxis(updated);
        setMedia(updated.media_items);
        setDuelPaneOpen(false);
        setDuel(null);
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.changeMode")),
        );
      } finally {
        setSwitchingMode(null);
      }
    },
    [praxis, duel, askConfirm],
  );

  const isPublished = praxis?.status === "submitted";

  // Published = server doc destroyed (#1745); drop the local copy or `pullBack`
  // duplicates the body. For non-publishing clients; `publish()` covers its own (#2381).
  const publishedPraxisId = isPublished ? (praxis?.id ?? null) : null;
  useEffect(() => {
    if (publishedPraxisId !== null) discardRoomStore(publishedPraxisId);
  }, [publishedPraxisId]);
  const isModerated =
    praxis?.moderation_status === "hidden" ||
    praxis?.moderation_status === "failed";
  // In practice only a MODERATED composer renders locked (#1164); `isPublished`
  // covers the beat where a published praxis still derives `composing`.
  const controlsLocked = !!(isPublished || isModerated);
  // Co-authors don't lock the picker; switching confirms-then-drops (#155).
  const modeIsLocked = controlsLocked;
  // Selected once a challenge is attached or the pane is open (ADR-0011).
  const duelMode = !!praxis && (praxis.duel_id != null || duelPaneOpen);
  const viewerLevel = user?.character?.level ?? 0;
  const duelChipVisible =
    !controlsLocked &&
    duelLevelRequired != null &&
    viewerLevel >= duelLevelRequired;
  const showInviteBox =
    !controlsLocked && !!praxis && (praxis.type === "collab" || duelMode);
  // `eligible_for_current_user` mirrors only the SCORING gate, so
  // `can_apply_metatask` (the server's apply gate, incl. faction bypass) is also
  // required (#1973). Never recompute it client-side.
  const canSealMetatask =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    !!user?.can_apply_metatask &&
    metatasks.length > 0;
  // Or read-only when an ineligible viewer still has seals.
  const showSealStack =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    (canSealMetatask || appliedMetataskList.length > 0);

  // Derived each render (ADR-0059), so every entry path agrees.
  const phase = deriveEditPraxisPhase(praxis, duel, user?.character?.id);

  return {
    loading,
    phase,
    praxis,
    task,
    error,
    setError,

    title,
    setTitle,
    body,
    setBody,

    media,
    fileError,
    handleFileChange,
    pickFromGooglePhotos,
    removeMedia,

    pendingImage,
    confirmImageEdit,
    cancelImageEdit,
    reportImageError,

    switchingMode,
    changeMode,

    inviteQuery,
    setInviteQuery,
    inviteResults,
    inviteOpen,
    setInviteOpen,
    inviting,
    sendInvite,
    cancelInvite,
    kickMember,
    nudge,
    nudgeCrew,
    crewNudge,

    duel,
    sendChallenge,
    cancelDuel,
    dissolveDuel,

    metatasks,
    appliedMetatasks,
    appliedMetataskList,
    applyingMetatask,
    addMetatask,

    metataskPickerOpen,
    openMetataskPicker,
    closeMetataskPicker,

    metataskRemovalTarget,
    requestRemoveMetatask,
    confirmRemoveMetatask,
    cancelRemoveMetatask,

    submitting,
    publish,
    markDone,
    propose,
    saveDraft,
    pullBack,
    reopenForEdit,
    leaveCollab,
    cancel,
    collabSuccess,
    continueFromCollabSuccess,

    duelSealOpen,
    requestDuelSeal,
    cancelDuelSeal,

    pendingConfirm,
    acceptConfirm,
    dismissConfirm,

    autosaveAt,
    setAutosaveAt,

    autoSubmitDays,
    proposalConfirmArmed,
    confirmProposalEdit,
    isPublished: !!isPublished,
    controlsLocked,
    modeIsLocked,
    showInviteBox,
    canSealMetatask,
    showSealStack,
    duelMode,
    duelChipVisible,

    currentCharacterId: user?.character?.id ?? null,
  };
}
