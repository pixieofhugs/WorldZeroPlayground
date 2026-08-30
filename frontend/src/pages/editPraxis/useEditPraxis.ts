/**
 * useEditPraxis — every piece of state and async behaviour behind the composer,
 * so the faction archetypes can each own their visual treatment without
 * re-implementing the data plumbing.
 *
 * This file is now the **assembler** (#1392). Six concerns own themselves in
 * their own modules and this one composes them into the single
 * `EditPraxisState` all nine archetypes, the waiting surface and the dispatcher
 * read:
 *
 *   `useComposerDraft`   — title and body, as a view of the room's document
 *   `useComposerMedia`   — the tray: pick, edit, upload, remove
 *   `useMetataskApply`   — the applied seal stack, picker and peel-off
 *   `useComposerRoster`  — the search box, invites, challenge, kick, nudge
 *   `useComposerDuel`    — the challenge pane, duel detail, seal dialog
 *   `useComposerConfirm` — the one in-page confirm slot
 *
 * What stays here is what nothing else can own: the initial load and the
 * viewer's seal catalogue, the lifecycle transitions (publish, pull back,
 * leave, drop, mode switch — plus `saveDraft`, which since #1743 only leaves),
 * and the derived flags that read across two or more of the concerns above.
 *
 * The split is pure restructuring — the interface, the request count and the
 * mount-time request ORDER are all unchanged, and the existing suite that
 * proves it was not edited to accommodate it.
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
  type PraxisOut,
  type PraxisType,
} from "../../api/praxis";
import {
  cancelChallenge,
  getDuelDetail,
  type DuelDetailOut,
} from "../../api/duel";
import { deriveCollabGate } from "../../components/collab/CollabRoster";
import { deriveEditPraxisPhase } from "./editPraxisPhase";
import { discardRoomStore } from "./roomStore";
import { editNeedsProposalConfirm } from "./proposalGuard";
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
import { useComposerMedia } from "./useComposerMedia";
import { useMetataskApply } from "./useMetataskApply";
import { useComposerRoster } from "./useComposerRoster";
import { useComposerDuel, type DuelOutcome } from "./useComposerDuel";
import { useGameConfig } from "../../hooks/useGameConfig";
import { getTask, type TaskOut } from "../../api/tasks";
import { listMetatasks } from "../../api/metatasks";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/**
 * The media tray — the 50 MB ceiling, the picker, the image-edit queue and the
 * batch upload — moved to `useComposerMedia.ts` (#1392). `MAX_FILE_SIZE` stays
 * exported from here because it has always been part of this module's surface.
 */
export { MAX_FILE_SIZE } from "./useComposerMedia";

/**
 * The state object every archetype reads moved to `editPraxisState.ts` (#1392)
 * so this file can be an assembler rather than a 200-line interface followed by
 * its implementation. Type-only, so the move costs no bytes; re-exported
 * because every importer — nine archetypes, the waiting surface, the seal
 * components, the dispatcher — reaches for both names by this path.
 */
export type { EditPraxisState } from "./editPraxisState";
import type { EditPraxisState } from "./editPraxisState";

/**
 * The phase predicate moved to `editPraxisPhase.ts` (#1397) so the praxis-detail
 * page can read the composer's own answer without pulling this module's api and
 * upload plumbing into its chunk. Re-exported here because every existing
 * importer — and this hook — reaches for it by this path.
 */
export {
  deriveEditPraxisPhase,
  isWaitingStage,
  type EditPraxisPhase,
} from "./editPraxisPhase";

/* `modeSwitchPrompt` moved to `components/confirm/composerConfirms.ts` as
 * `modeSwitchConfirm` (#1082): it now returns a whole ConfirmRequest rather than
 * one string for `window.confirm`, and it belongs beside the other six confirms
 * the composer asks for. */

/* The draft's save machinery — the 2s debounced autosave, the cancel-then-write
 * flush, and the three predicates that decided whether a write was owed — was
 * re-exported here so a test could call it directly. It is gone (#1743): the
 * praxis is written in its room, so there is no client-side write to order and
 * no "unsaved" for anything to be dirty against. */

/**
 * The invite/opponent search box, the two sends that clear it, and the roster
 * writes that follow (kick, rescind, nudge) moved to `useComposerRoster.ts`
 * (#1392).
 */
export function useEditPraxis(idParam: string | undefined): EditPraxisState {
  const navigate = useNavigate();
  const { user, refetch, loading: authLoading } = useAuth();

  // ---- Core state ----
  const [praxis, setPraxis] = useState<PraxisOut | null>(null);
  // The proposal this member has already agreed to cancel by typing (#1811) —
  // its `submit_proposed_at`, not a boolean, so "once per proposal" survives a
  // withdraw-and-repropose with no reset to remember. See `proposalGuard.ts`.
  const [agreedProposalAt, setAgreedProposalAt] = useState<string | null>(null);
  const [task, setTask] = useState<TaskOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ---- Media tray (#297, #514, #1286) ----
  const {
    media,
    setMedia,
    fileError,
    handleFileChange,
    removeMedia,
    pendingImage,
    confirmImageEdit,
    cancelImageEdit,
    reportImageError,
  } = useComposerMedia(idParam, setError);

  // The catalogue of seals this viewer may apply — a viewer-keyed LOAD, so it
  // stays here beside the composer's other loads. The APPLIED set is the other
  // concern, and lives in `useMetataskApply` below.
  const [metatasks, setMetatasks] = useState<TaskOut[]>([]);

  // ---- Metatask seals (#933) ----
  const {
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
    seedApplied: seedAppliedMetatasks,
  } = useMetataskApply({ praxis, setPraxis, setError });

  const [switchingMode, setSwitchingMode] = useState<PraxisType | null>(null);
  // One-shot post-publish beat for the member whose cast closed the gate (#591).
  const [collabSuccess, setCollabSuccess] = useState(false);

  // ---- Confirms (#1082) ----
  const { pendingConfirm, askConfirm, acceptConfirm, dismissConfirm } =
    useComposerConfirm();

  // ---- Duel challenge (#311, #718, #956) ----
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

  // The pane owns the duel; the praxis and the error line are ours, so it
  // reports what it changed and we write it (#2879).
  const applyDuelOutcome = useCallback((outcome: DuelOutcome) => {
    if (outcome.kind === "unchanged") return;
    setError(outcome.kind === "failed" ? outcome.message : "");
    if (outcome.kind === "cancelled") setPraxis(outcome.praxis);
  }, []);

  const cancelDuel = useCallback(async () => {
    applyDuelOutcome(await cancelDuelSide());
  }, [cancelDuelSide, applyDuelOutcome]);

  const dissolveDuel = useCallback(async () => {
    applyDuelOutcome(await dissolveDuelSide());
  }, [dissolveDuelSide, applyDuelOutcome]);

  // The duel gate and the ADR-0012 window length (#1164) are two era values off
  // one payload — since #1141 the app-wide cached one, rather than a third
  // `/game-config` request. `null` until it lands, and on a failed read, so the
  // duel chip stays hidden and the holdout's countdown undrawn either way.
  const gameConfig = useGameConfig();
  const duelLevelRequired = gameConfig?.duel_level_required ?? null;
  const autoSubmitDays = gameConfig?.collab_auto_submit_days ?? null;

  // ---- Draft text ----
  // A view of the room's document, not a copy waiting to be sent: the room is
  // the one write path since #1743, so nothing here persists anything.
  const {
    title,
    setTitle,
    body,
    setBody,
    autosaveAt,
    setAutosaveAt,
    hydrate: hydrateDraft,
  } = useComposerDraft();

  // ---- Initial load ----
  useEffect(() => {
    if (!idParam) return;
    // Wait for auth to resolve before the membership guard — otherwise a
    // still-loading `user` would bounce to the read page, which redirects
    // in_progress praxes right back here (infinite loop).
    //
    // This costs nothing and delays nothing (#1379): `/praxis/:id/edit` is
    // wrapped in `<ProtectedRoute>`, which renders a spinner instead of its
    // children while `/auth/me` is in flight — so this hook is not mounted, and
    // this effect not run, until auth has already resolved. `refetch()` never
    // sets `loading` back to true. The guard is the floor if the route is ever
    // unwrapped, not a gate anything waits on.
    if (authLoading) return;
    const praxisId = parseInt(idParam, 10);
    setLoading(true);
    // A signup that just created this praxis was handed the whole row; take it
    // rather than spending a round trip reading it back (#1379). Same builder,
    // same viewer, server-side — see `takeJustCreatedPraxis`. A miss (any other
    // way of arriving here) falls through to the read.
    const carried = takeJustCreatedPraxis(praxisId);
    const loadPraxis = carried
      ? Promise.resolve(carried)
      : getPraxis(praxisId);
    loadPraxis
      .then(async (loaded) => {
        // A collab is co-owned — any member may edit (ADR-0013), not just the
        // creator. Gating on created_by_id looped non-creator members between
        // this page and the read page's in_progress → edit redirect.
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
        // Seed the seal stack from the persisted seals so a reloaded draft shows
        // what's already sealed (the picker's "already sealed" check reads this).
        seedAppliedMetatasks(loaded.applied_metatasks ?? []);
        await getTask(loaded.task_id)
          .then(setTask)
          .catch(() => {
            /* non-fatal */
          });
      })
      .catch(() => setError(i18n.t("forms:editPraxis.errors.load")))
      .finally(() => setLoading(false));
    // The membership guard above reads only `user?.character?.id`, so that is
    // the whole dependency (#1390). Depending on `user` reloaded the praxis and
    // its task every time `/auth/me` refetched, flashing the editor back to its
    // loading state — that endpoint mints a new object on every answer, so the
    // object identity is never a safe dependency, changed or not.
    //
    // Casting a star used to be the loudest trigger; #1382 retired that refetch
    // by returning the tally from the vote POST. The narrowing stands without
    // it — every other refetch mints the same new object.
  }, [idParam, user?.character?.id, authLoading, navigate]);

  // The seals this viewer may apply (#933). It sat inside the praxis `.then()`
  // above, which made it wait a whole round trip on a payload it reads nothing
  // from — the list is keyed on the VIEWER (`eligible_for_current_user`), not
  // on the praxis (#1379). Fired here it leaves at mount, beside the praxis
  // read, and no longer holds `loading` open either.
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

  // ---- The other players (#311, #421, #959, #1083, #1257) ----
  // Declared AFTER the two loads above on purpose. Effects register in call
  // order, and this hook opens the mount-time foes read (#1390); keeping it
  // below leaves getPraxis and listMetatasks first in the queue, which is the
  // order #1379 settled on.
  const {
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
    sendChallenge,
  } = useComposerRoster({
    praxis,
    setPraxis,
    duel,
    setDuel,
    duelPaneOpen,
    setError,
  });

  // ---- Save / publish ----
  const publish = useCallback(async () => {
    // Any cast dismisses the seal dialog first, so a validation error or a
    // failed submit lands on the composer in plain sight rather than behind an
    // overlay. Harmless when the dialog was never open (#718).
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
      // No flush first. The text is already in the room and already durable
      // there (#1743); the record catches up on the room's own debounce, and
      // #1745 makes the freeze flatten it at exactly this moment instead.
      await submitPraxis(praxisId);
      // The seal just destroyed the server's document (ADR-0073 rule 7), so
      // this browser's copy goes with it — here, in the act, and not only on
      // the effect below. A solo publish navigates to the read page in the same
      // commit that flips the status, so the composer never re-renders as
      // published and that effect never runs for the one client guaranteed to
      // be holding a stale store: the one that published (#2381).
      discardRoomStore(praxisId);
      let refreshed: PraxisOut | null = null;
      let refreshedDuel: DuelDetailOut | null = duel;
      try {
        // Going live runs `recalculate_members_stats`, which both moves points
        // and delivers any newly-earned faction invitation letters — and those
        // reach the InvitationWatcher only through `user.character.invitations`.
        await refetch();
        // Reload the praxis too: `refetch` is the AUTH refetch (points/level),
        // so it says nothing about who has now cast. The fresh member list is
        // what decides between the success screen and the redirect below.
        refreshed = await getPraxis(praxisId);
        setPraxis(refreshed);
        // And reload the duel, because my own cast can change its status: a
        // cast against a rival who has already cast SETTLES the duel
        // (`maybe_settle_duel`). The praxis reload alone can't see that — the
        // `duel_id` is unchanged, so the detail effect never re-fires — and a
        // stale `active` would hold the composer on a duel that is over and
        // belongs to the read page (ADR-0059, epic decision 2).
        if (refreshed.duel_id != null) {
          refreshedDuel = await getDuelDetail(refreshed.duel_id);
          setDuel(refreshedDuel);
        }
      } catch {
        // best-effort; praxis was submitted successfully
      }
      // If my cast is the one that closed the gate on a multi-member collab,
      // hold the composer and show the success beat (#591).
      if (refreshed) {
        const gate = deriveCollabGate(refreshed.members, user?.character?.id);
        if (gate.memberCount > 1 && gate.state === "published") {
          setCollabSuccess(true);
          return;
        }
        // Otherwise a multi-party cast holds the composer on the waiting
        // surface (ADR-0059) instead of dropping the player on the public read
        // view, which offers no authoring exit. Nothing to set: the phase is
        // derived from the praxis + duel just refreshed above, so returning
        // early is the whole hold. **Solo keeps the redirect** — there is
        // nobody to wait for, and `deriveEditPraxisPhase` says so.
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

  // The third exit (#1081). Publish files the praxis and Drop destroys it; this
  // is the one that keeps the draft and simply leaves.
  //
  // It leaves, and that is all it does. It used to carry the flush — cancel the
  // queued autosave, write the text in hand — because keystrokes typed inside
  // the 2s debounce window would otherwise be discarded by the unmount. There
  // is no window to lose them in now: every keystroke is in the room's store
  // before the socket acknowledges it (#1743), so there is nothing to save, no
  // request that can fail, and no reason to refuse a blank title on the way out.
  //
  // Destination is the player's own profile, whose praxis grid shows them their
  // own `in_progress` work (`praxis_visibility_condition` ORs in the viewer's
  // member praxes) — i.e. the draft they just left, waiting where they left it.
  const saveDraft = useCallback(async () => {
    if (!idParam) return;
    setError("");
    const characterId = user?.character?.id;
    navigate(characterId != null ? `/characters/${characterId}` : "/tasks");
  }, [idParam, navigate, user?.character?.id]);

  // **Withdraw proposal** on a pending collab, and the duel side's neutral
  // reopen (#1077) — one endpoint, two doors, told apart server-side by status
  // (ADR-0079). On a collab it is now a GROUP act: the countdown stops, every
  // approval clears, the praxis is back to drafting. Per-member pull-back is
  // gone because per-member submission is.
  //
  // No confirm here. The composer's Withdraw button is pressed by somebody
  // already reading the proposal it cancels, and the duel case is
  // consequence-free — forfeit begins only at `settled` (ADR-0011 §Forfeit).
  // The one caller that DOES ask is `reopenForEdit` below, whose player is
  // looking at a countdown rather than at the button that started it.
  const pullBack = useCallback(async () => {
    if (!idParam) return;
    setSubmitting(true);
    setError("");
    try {
      const praxisId = parseInt(idParam, 10);
      await unsubmitPraxis(praxisId);
      await refetch();
      // `refetch` only refreshes auth — without reloading the praxis the roster
      // would keep showing approvals this call just cleared.
      setPraxis(await getPraxis(praxisId));
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.publish")));
    } finally {
      setSubmitting(false);
    }
  }, [idParam, refetch]);

  // **Done** — "my part is finished" (ADR-0079). Social only: no window opens,
  // no status moves, nothing is gated. It sends the VALUE rather than toggling,
  // because the server owns the flag and a client guessing from local state is
  // one dropped response away from disagreeing with it.
  //
  // No `refetch()`: Done banks no points and delivers no invitation letter, so
  // there is nothing on the auth payload for it to move. The praxis it swaps in
  // is the route's own answer, which carries the whole refreshed roster.
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

  // **Propose** — "I think we're ready to publish" (ADR-0079). The same request
  // Approve makes; what makes it a proposal is that no window is open yet, and
  // what makes it worth a dialog is that it starts a clock on everybody else.
  // Silence is consent, so a crew that simply stops reading publishes.
  const propose = useCallback(async () => {
    if (!praxis) return;
    if (!(await askConfirm(proposePublishConfirm(praxis.task_faction_slug))))
      return;
    await publish();
  }, [praxis, askConfirm, publish]);

  // The first keystroke after a proposal goes live (ADR-0079, owner-specified).
  //
  // Fire-and-forget, and deliberately NOT async: the caller is a CodeMirror
  // transaction filter, which is synchronous and has already dropped the edit
  // by the time this runs. Declining therefore costs the player that one
  // keystroke and nothing else — the editor stays editable and focused, so the
  // next one asks again and nothing is left half-applied.
  //
  // `askConfirm` declines any confirm already open, so the guard against a
  // second ask is the latch below rather than a busy flag: agreeing pins THIS
  // proposal's `submit_proposed_at`, which disarms the filter for as long as
  // that proposal lives and re-arms for the next one.
  //
  // ponytail: the client learns the edit actually cancelled the proposal only
  // on its next praxis read. The cancellation is the ROOM's — it fires on the
  // server's own debounced flush — so nothing here can know the moment it
  // lands, and nothing is optimistically cleared, because a member who agrees
  // and then types nothing has cancelled nothing. The ceiling is a footer that
  // goes on offering Approve/Withdraw against a window the server has already
  // closed; both are recoverable (Approve re-proposes, Withdraw 422s onto the
  // error line). The upgrade is to refetch the praxis off the room's update
  // signal, which `onUpdate` already delivers to `setAutosaveAt`.
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

  // The waiting surface's "edit my write-up" (ADR-0059). Re-entry is NOT a PUT:
  // on a collab any praxis PUT hard-resets every member's `has_submitted`
  // (ADR-0012 — "an edit means we're not done"), so the way back into your own
  // text is `pullBack`, which re-opens only the caller's membership (#590).
  //
  // On a collab it asks first. Pulling back is itself scoped to me, but the edit
  // it exists for is not: `cancel_pending_publish_on_edit` cancels the
  // pending-publish window and clears everyone's cast, silently resetting the
  // very countdown the surface was drawing. A player who is told that after the
  // fact was not told. A duel side needs no confirm — before the duel settles,
  // unsubmitting is a free neutral reopen with no forfeit (ADR-0011 §Forfeit),
  // which is exactly what the seal dialog promised on the way in.
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

  // Drop my own membership from a collab (#958). Distinct from `cancel` (deletes
  // the whole praxis, everyone's part with it) and `pullBack` (retract my cast but
  // stay a member): leaving removes me entirely, so I'm sent back to the task list.
  // Backend `leave_praxis` re-checks membership — membership is the only condition,
  // which is how the creator leaves too (ADR-0013, #1074) — and can complete
  // consensus for whoever stays.
  const leaveCollab = useCallback(async () => {
    if (!praxis) return;
    // The member count is what decides which consequence this leave carries:
    // at three or more the crew simply carries on, at two the praxis converts
    // to solo for whoever stays (ADR-0060), and at one there is nothing left to
    // carry on. The dialog says which of the three this is.
    const confirmed = await askConfirm(
      leaveCollabConfirm(praxis.task_faction_slug, praxis.members.length),
    );
    if (!confirmed) return;
    try {
      await leavePraxis(praxis.id);
      // `leave_praxis` runs `recalculate_character_stats` for the leaver — the
      // stake is gone, so score and level really move here.
      await refetch();
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.leave")));
      return;
    }
    navigate("/tasks");
  }, [praxis, navigate, refetch, askConfirm]);

  // The success screen's only exit: an explicit "it's on the public board" tap.
  // Deliberately not a timer — the player leaves when they've read it (#591).
  const continueFromCollabSuccess = useCallback(() => {
    setCollabSuccess(false);
    navigate(`/praxis/${idParam}`);
  }, [idParam, navigate]);

  const cancel = useCallback(async () => {
    if (!praxis) return;
    // Deleting a collab is not "dropping my task": it destroys the praxis with
    // every member's part still in it, which is why it stays the creator's alone
    // (enforced by the backend's `delete_praxis`). A member who only wants out
    // has `leaveCollab` — the creator included (ADR-0013). Say which of the two
    // this is before it happens, in the faction's voice where it has one (#1074).
    //
    // A duel side is the third case, and it used to be silently folded into
    // the second: it is stored type='solo' with a `duel_id` (ADR-0011), so
    // `crewAtStake` is false and every duellist got the plain drop path. That
    // path cannot work. `duel.challenger_praxis_id`/`opponent_praxis_id` are
    // deliberately NO ACTION while all eight sibling praxis-child FKs cascade
    // (`models/praxis.py`, migration 0006) — a duel is a contract between two
    // players, not a part of either side. The player got a generic 409 after a
    // dialog promising the opposite (#1831).
    //
    // What that NO ACTION guards is narrower than it looks, so do not read it
    // as "a duel row never goes": `delete_praxis` now discards the DECLINED
    // rows first, which is why the dissolve below is what unblocks the delete.
    // A live (`pending`/`active`) or finished (`settled`/`resolved`) duel is
    // still refused outright — see
    // `services.praxis_duel.discard_dissolved_duels_for_praxis`, which owns that
    // predicate and the owner ruling behind it.
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
      // Dissolve the contract, then delete the side. Same call the mode picker
      // makes when switching away from a duel, and legal at both pre-submit
      // stages — `cancel_duel_challenge` takes pending *or* active, from either
      // participant, and reverts both sides to plain solo with no penalty. So
      // this needs no new endpoint and costs the opponent nothing.
      //
      // Deliberately not routed through the mode picker instead: `changeMode`
      // refuses to leave an accepted duel (`errors.duelUnderway`), so at the
      // active stage there is no other way out of a task you asked to drop.
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

  // ---- Mode switching ----
  const changeMode = useCallback(
    async (next: PraxisType) => {
      if (!praxis) return;

      // Duel is not a type flip — it reveals the challenge box (#311). The praxis
      // stays type='solo' and only gains a duel_id once an opponent is picked.
      if (next === "duel") {
        if (praxis.duel_id != null) return; // already dueling
        // A duel side must be solo (ADR-0011). Coming from collab drops the crew.
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

      // next is solo|collab. Clicking the current mode with no duel open is a no-op.
      const inDuel = praxis.duel_id != null;
      if (!inDuel && next === praxis.type) {
        setDuelPaneOpen(false);
        return;
      }

      // Mode-switching away from an ACCEPTED duel is blocked here: an active duel
      // is dissolved through the dedicated "dissolve duel" control (#956), which
      // asks first, rather than silently as a side effect of picking solo/collab.
      // (The backend permits cancelling an active duel — services/duel.py — so
      // this guard is a UI choice, not a backend limitation.)
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
        // During a duel the praxis type is already 'solo', so switching to solo
        // just reloads; any real solo↔collab flip goes through change-type in place.
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

  // ---- Derived ----
  const isPublished = praxis?.status === "submitted";

  // A published praxis has no room document any more — the server destroyed it
  // (#1745). Drop this browser's copy with it, or `pullBack` merges the old
  // document into the freshly seeded one and the body appears twice.
  //
  // The **second** half of that disposal, not the only one (#2381). This half
  // is for the client that did not publish: a co-author who learns of it by
  // loading the page, or a collab whose window lapsed and was sealed
  // server-side with nobody's finger on a button. The publishing client is
  // covered in `publish()` above, because for it there is no render in between
  // to key an effect on.
  const publishedPraxisId = isPublished ? (praxis?.id ?? null) : null;
  useEffect(() => {
    if (publishedPraxisId !== null) discardRoomStore(publishedPraxisId);
  }, [publishedPraxisId]);
  const isModerated =
    praxis?.moderation_status === "hidden" ||
    praxis?.moderation_status === "failed";
  // Read the interface docstring before touching this: since #1164 the only
  // composer that renders with it true is a MODERATED one. `isPublished` is
  // kept in the expression because the two disagree for a beat — a published
  // praxis whose duel detail is still in flight derives `composing` — and
  // because every consumer below wants "read-only", not "hidden or failed".
  const controlsLocked = !!(isPublished || isModerated);
  // Locked only once sealed/moderated — co-authors no longer lock the picker;
  // switching with members joined confirms-then-drops instead (#155).
  const modeIsLocked = controlsLocked;
  // A duel side stays type='solo' + a duel_id (ADR-0011); the chip is "selected"
  // once a challenge is attached or the viewer has opened the challenge pane.
  const duelMode = !!praxis && (praxis.duel_id != null || duelPaneOpen);
  const viewerLevel = user?.character?.level ?? 0;
  const duelChipVisible =
    !controlsLocked &&
    duelLevelRequired != null &&
    viewerLevel >= duelLevelRequired;
  const showInviteBox =
    !controlsLocked && !!praxis && (praxis.type === "collab" || duelMode);
  // Editable only for a still-open solo praxis with at least one metatask the
  // viewer is eligible to seal, AND only when the API says the viewer may apply
  // a metatask at all (#1973).
  //
  // `metatasks.length > 0` alone was NOT that second gate, though the comment
  // here used to claim it was. The load effect filters on
  // `eligible_for_current_user`, whose own docstring says it mirrors the metatask
  // SCORING gate (`level >= task.level_required`) "rather than the stricter
  // apply_metatask service gate". So a level-0 viewer passed it on any level-0
  // metatask and was handed a picker that `POST /praxes/{id}/metatasks` answers
  // 403 to.
  //
  // `user.can_apply_metatask` is that stricter gate, stated by the server:
  // era.metatask_apply_level, OR a faction carrying the bypass. Read as a
  // capability rather than recomputed here, because a `level >= 5` in the client
  // would deny Albescent members the picker their charter grants them.
  const canSealMetatask =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    !!user?.can_apply_metatask &&
    metatasks.length > 0;
  // Show the stack when the viewer can seal, OR when an ineligible viewer still
  // has seals to display read-only (no add slot, no ×).
  const showSealStack =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    (canSealMetatask || appliedMetataskList.length > 0);

  // Derived every render from the praxis + duel already in hand (ADR-0059), so
  // a cast, a pull-back and a cold re-entry all land on the same answer.
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
