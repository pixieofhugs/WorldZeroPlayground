/**
 * useEditPraxis — extracts every piece of state and async behavior from the
 * legacy EditPraxis.tsx so that the seven faction archetypes can each own their
 * own visual treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (mode-switch deletes + recreates,
 * locked-once-published rules, debounced 2s autosave on title/body, immediate save
 * for mode/metatask).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  applyMetatask,
  changePraxisType,
  deletePraxis,
  deletePraxisMedia,
  cancelInvite as cancelInviteApi,
  getPraxis,
  inviteToPraxis,
  kickMember as kickMemberApi,
  leavePraxis,
  removeMetatask,
  submitPraxis,
  takeJustCreatedPraxis,
  unsubmitPraxis,
  updatePraxis,
  uploadPraxisMedia,
  type MediaItemOut,
  type PraxisOut,
  type PraxisType,
} from "../../api/praxis";
import {
  cancelChallenge,
  getDuelDetail,
  issueChallenge,
  type DuelDetailOut,
} from "../../api/duel";
import { sendNudge } from "../../api/nudge";
import { deriveCollabGate } from "../../components/collab/CollabRoster";
import { deriveEditPraxisPhase } from "./editPraxisPhase";
import {
  deleteCollabConfirm,
  dissolveDuelConfirm,
  dropTaskConfirm,
  duelDropsCoauthorsConfirm,
  leaveCollabConfirm,
  modeSwitchConfirm,
  reopenForEditConfirm,
  type ConfirmRequest,
} from "../../components/confirm/composerConfirms";
import { useGameConfig } from "../../hooks/useGameConfig";
import { listRelationships } from "../../api/relationships";
import { getMyCharacters } from "../../api/me";
import { getTask, type TaskOut } from "../../api/tasks";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listMetatasks } from "../../api/metatasks";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import {
  blobToFile,
  partitionByEditability,
} from "../../components/imageEdit/imageEditHelpers";
import { uploadMediaInChunks } from "./mediaBatchUpload";
import i18n from "../../i18n";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * The state object every archetype reads moved to `editPraxisState.ts` (#1392)
 * so this file can be an assembler rather than a 200-line interface followed by
 * its implementation. Type-only, so the move costs no bytes; re-exported
 * because every importer — nine archetypes, the waiting surface, the seal
 * components, the dispatcher — reaches for both names by this path.
 */
export type { EditPraxisState, SaveStatus } from "./editPraxisState";
import type { EditPraxisState, SaveStatus } from "./editPraxisState";

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

const AUTOSAVE_DEBOUNCE_MS = 2000;

/* `modeSwitchPrompt` moved to `components/confirm/composerConfirms.ts` as
 * `modeSwitchConfirm` (#1082): it now returns a whole ConfirmRequest rather than
 * one string for `window.confirm`, and it belongs beside the other six confirms
 * the composer asks for. */

/**
 * Dirty-check gate for the pre-submit save (#360).
 *
 * On a collab, ANY praxis PUT hard-resets every member's has_submitted
 * (ADR-0012 — "an edit means we're not done"). If Submit always fired a PUT,
 * the last member's submit would reset everyone else's, so
 * all(has_submitted) could never be reached through the UI. Only persist
 * when the form actually differs from the last-persisted values; a genuine
 * edit still resets consensus, which is correct per ADR-0012.
 */
export function hasUnsavedEdits(
  title: string,
  body: string,
  lastSavedTitle: string | null,
  lastSavedBody: string | null,
): boolean {
  return title !== lastSavedTitle || body !== lastSavedBody;
}

/**
 * The composer's one manual write: **cancel the queued autosave first, then
 * persist the text in hand** — in that order, and never one without the other.
 *
 * The ordering is the whole correctness of a manual save (#1081). A queued
 * debounce holds a *stale* closure over title/body; leaving it armed lets it
 * land after the manual PUT and re-write older text, while cancelling without
 * writing drops every keystroke typed inside the 2s window. Publish has always
 * done both (#360); Save draft needs exactly the same two steps, so they live
 * here once rather than being re-typed at each call site.
 *
 * Exported (and dependency-injected on `cancelQueuedAutosave`) so the ordering
 * is provable in a test that calls it directly — the frontend harness runs no
 * effects, so the debounce timer can't be exercised through the component.
 *
 * Returns whether a PUT actually went out: nothing changed since the last save
 * → no request at all (#360; on a collab a PUT would reset every member's
 * `has_submitted`, ADR-0012).
 */
export async function flushEdits(options: {
  praxisId: number;
  title: string;
  body: string;
  lastSavedTitle: string | null;
  lastSavedBody: string | null;
  cancelQueuedAutosave: () => void;
}): Promise<boolean> {
  const {
    praxisId,
    title,
    body,
    lastSavedTitle,
    lastSavedBody,
    cancelQueuedAutosave,
  } = options;
  // First, always — even on the clean path, where the queued write would be a
  // no-op PUT the collab consensus rules can't afford.
  cancelQueuedAutosave();
  if (!hasUnsavedEdits(title, body, lastSavedTitle, lastSavedBody)) return false;
  await updatePraxis(praxisId, { title, body_text: body || undefined });
  return true;
}

/**
 * Save draft can't leave when the flush it's about to run would be rejected.
 *
 * The backend requires a title, which is why the autosave effect sits out a
 * blank one. That's harmless while the player stays on the page — but Save
 * draft *navigates away*, so a blank title with unsaved body text would strand
 * the writing with nowhere to land. Refuse the exit and say why instead (#1081).
 *
 * A blank title with nothing unsaved is not this case: there is no pending
 * write to reject, so leaving is free.
 */
export function draftNeedsTitle(
  title: string,
  body: string,
  lastSavedTitle: string | null,
  lastSavedBody: string | null,
): boolean {
  return (
    hasUnsavedEdits(title, body, lastSavedTitle, lastSavedBody) && !title.trim()
  );
}

/**
 * Which of the viewer's own lives the invite/opponent picker withholds (#1257).
 *
 * Collab invites withhold only the life you are carrying — inviting your own alt
 * to a collab is doing a task with yourself, which splits no points unfairly and
 * which the backend allows. Duel mode withholds the whole account roster: #1237
 * blocked both sides of a duel landing on one account, so offering an alt as an
 * opponent could only ever earn a 400 on Challenge.
 *
 * `ownCharacterIds` is empty until the lazy `/me/characters` read lands (and
 * stays empty if it fails), so the carried life is unioned in rather than
 * assumed present — the narrow old rule remains the floor.
 */
export function selfExcludedPickIds(
  carriedCharacterId: number | undefined,
  ownCharacterIds: Set<number>,
  duelMode: boolean,
): Set<number> {
  const excluded = new Set<number>(duelMode ? ownCharacterIds : []);
  if (carriedCharacterId != null) excluded.add(carriedCharacterId);
  return excluded;
}

export function useEditPraxis(idParam: string | undefined): EditPraxisState {
  const navigate = useNavigate();
  const { user, refetch, loading: authLoading } = useAuth();

  // ---- Core state ----
  const [praxis, setPraxis] = useState<PraxisOut | null>(null);
  const [task, setTask] = useState<TaskOut | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  // Picked images awaiting the edit modal, oldest first (#514).
  const [imageEditQueue, setImageEditQueue] = useState<File[]>([]);

  const [metatasks, setMetatasks] = useState<TaskOut[]>([]);
  // The applied metatasks as full rows (source of truth for the seal stack);
  // `appliedMetatasks` (the id Set) is derived from it below.
  const [appliedMetataskList, setAppliedMetataskList] = useState<TaskOut[]>([]);
  const appliedMetatasks = useMemo(
    () => new Set(appliedMetataskList.map((mt) => mt.id)),
    [appliedMetataskList],
  );
  const [applyingMetatask, setApplyingMetatask] = useState<number | null>(null);
  const [metataskPickerOpen, setMetataskPickerOpen] = useState(false);
  const [metataskRemovalTarget, setMetataskRemovalTarget] =
    useState<TaskOut | null>(null);

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<CharacterOut[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [switchingMode, setSwitchingMode] = useState<PraxisType | null>(null);
  // One-shot post-publish beat for the member whose cast closed the gate (#591).
  const [collabSuccess, setCollabSuccess] = useState(false);

  // Duel challenge (#311)
  const [duelPaneOpen, setDuelPaneOpen] = useState(false);
  const [duel, setDuel] = useState<DuelDetailOut | null>(null);
  // The duel gate and the ADR-0012 window length (#1164) are two era values off
  // one payload — since #1141 the app-wide cached one, rather than a third
  // `/game-config` request. `null` until it lands, and on a failed read, so the
  // duel chip stays hidden and the holdout's countdown undrawn either way.
  const gameConfig = useGameConfig();
  const duelLevelRequired = gameConfig?.duel_level_required ?? null;
  const autoSubmitDays = gameConfig?.collab_auto_submit_days ?? null;
  const [foeIds, setFoeIds] = useState<Set<number>>(new Set());
  // Every life on the viewer's account (#1257) — read lazily when the duel pane
  // opens, since only duel mode withholds them and there is no app-wide cache of
  // the roster to read. Empty until it lands, and on failure.
  const [ownCharacterIds, setOwnCharacterIds] = useState<Set<number>>(new Set());
  // Seal confirmation (#718) — opened by PublishButton in duel mode.
  const [duelSealOpen, setDuelSealOpen] = useState(false);

  // The in-page confirm (#1082) — one slot, because only one handler can be
  // waiting on an answer at a time.
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(
    null,
  );
  const confirmResolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const [autosaveAt, setAutosaveAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Track last-persisted title/body so the autosave effect can detect
  // genuine user edits and skip the initial hydration round-trip.
  const lastSavedTitleRef = useRef<string | null>(null);
  const lastSavedBodyRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Confirms (#1082) ----
  // `window.confirm` used to block the handler until the player answered; these
  // three restore that shape without the OS dialog. `askConfirm` puts the
  // request on screen and returns a promise the handler awaits, so each caller
  // still reads `if (!(await askConfirm(...))) return;` — one line, in the same
  // place, with the same control flow.
  //
  // The resolver lives in a ref rather than in state: it is not rendered, and
  // storing a function in state would need the lazy-setter dance for no gain.
  const settleConfirm = useCallback((accepted: boolean) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setPendingConfirm(null);
    resolve?.(accepted);
  }, []);

  const askConfirm = useCallback((request: ConfirmRequest) => {
    // A second ask while one is open declines the first, so no handler is left
    // awaiting a promise that can never settle.
    confirmResolverRef.current?.(false);
    setPendingConfirm(request);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

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
        const initialTitle = loaded.title ?? "";
        const initialBody = loaded.body_text ?? "";
        setTitle(initialTitle);
        setBody(initialBody);
        setMedia(loaded.media_items);
        // Seed the seal stack from the persisted seals so a reloaded draft shows
        // what's already sealed (the picker's "already sealed" check reads this).
        setAppliedMetataskList(loaded.applied_metatasks ?? []);
        lastSavedTitleRef.current = initialTitle;
        lastSavedBodyRef.current = initialBody;
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
    // its task every time `/auth/me` refetched — which a star cast does — and
    // flashed the editor back to its loading state.
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

  useEffect(() => {
    if (!user?.character) return;
    listRelationships({ type: "foe", status: "active" })
      .then((rels) => setFoeIds(new Set(rels.map((r) => r.to_character_id))))
      .catch(() => {
        /* foes-first ordering is a nicety; ignore failures */
      });
  }, [user?.character?.id]);

  // The account's own roster, for the duel opponent picker only (#1257). The
  // picker already fetches per keystroke, so one read on a pane the player has
  // just opened costs nothing on mount.
  useEffect(() => {
    if (!duelPaneOpen || !user?.character) return;
    let cancelled = false;
    getMyCharacters()
      .then((roster) => {
        if (!cancelled) setOwnCharacterIds(new Set(roster.map((c) => c.id)));
      })
      .catch(() => {
        /* the carried life stays withheld either way — see selfExcludedPickIds */
      });
    return () => {
      cancelled = true;
    };
  }, [duelPaneOpen, user?.character?.id]);

  // ---- Duel detail (opponent chip + status) whenever this praxis is a duel side ----
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
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, [praxis?.duel_id]);

  // ---- Debounced autosave for title + body ----
  useEffect(() => {
    if (!praxis) return;
    if (lastSavedTitleRef.current === null) return; // not yet hydrated
    const titleChanged = title !== lastSavedTitleRef.current;
    const bodyChanged = body !== lastSavedBodyRef.current;
    if (!titleChanged && !bodyChanged) return;
    if (!title.trim()) return; // backend rejects empty titles; wait for input

    if (
      praxis.status === "submitted" ||
      praxis.moderation_status === "hidden" ||
      praxis.moderation_status === "failed"
    ) {
      return;
    }

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void (async () => {
        setSaveStatus("saving");
        try {
          const updated = await updatePraxis(praxis.id, {
            title,
            body_text: body || undefined,
          });
          lastSavedTitleRef.current = title;
          lastSavedBodyRef.current = body;
          // Take the payload, don't discard it (#1164). A PUT is exactly what
          // `cancel_pending_publish_on_edit` reacts to: the pending-publish
          // window is cancelled and every member's submission cleared
          // (ADR-0012), so the `submit_proposed_at` this hook is holding is
          // stale the instant a save lands. The holdout's countdown reads that
          // field, and a countdown still ticking against a window that no
          // longer exists is worse than no countdown at all. Costs nothing:
          // `updatePraxis` already returns the fresh praxis.
          //
          // Safe against a loop — the effect's first act is to compare title
          // and body against the refs just written, so the re-render it causes
          // returns immediately.
          setPraxis(updated);
          setAutosaveAt(new Date());
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      })();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [title, body, praxis]);

  // ---- Files ----
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      const incoming = Array.from(event.target.files);
      const tooLarge = incoming.filter((f) => f.size > MAX_FILE_SIZE);
      if (tooLarge.length > 0) {
        setFileError(
          i18n.t("forms:editPraxis.errors.fileTooLarge", {
            count: tooLarge.length,
            names: tooLarge.map((f) => f.name).join(", "),
          }),
        );
      } else {
        setFileError("");
      }
      const valid = incoming.filter((f) => f.size <= MAX_FILE_SIZE);
      event.target.value = "";
      if (!idParam || valid.length === 0) return;
      // Images get the crop/rotate edit stage first (#514); video/audio upload
      // straight through. Uploading immediately keeps a draft's media persisted
      // without a manual save (autosave covers title/body only; #297).
      const { toEdit, toUploadDirect } = partitionByEditability(valid);
      const praxisId = parseInt(idParam, 10);
      if (toUploadDirect.length > 0) {
        // One request for the whole selection instead of one per file (#1286).
        // Tiles now appear together rather than trickling in — that is the
        // accepted cost of the single round trip, so no artificial staggering.
        const { uploaded, errors } = await uploadMediaInChunks(
          praxisId,
          toUploadDirect,
        );
        if (uploaded.length > 0) {
          setMedia((previous) => [...previous, ...uploaded]);
        }
        // One error slot, so the last failure wins — exactly what the old
        // per-file loop left on screen when several files failed.
        if (errors.length > 0) setError(errors[errors.length - 1]);
      }
      // Queue images for the modal; they're edited + uploaded one at a time.
      if (toEdit.length > 0) {
        setImageEditQueue((previous) => [...previous, ...toEdit]);
      }
    },
    [idParam],
  );

  // ---- Image edit stage (#514): edit → upload → advance the queue ----
  const pendingImage = imageEditQueue[0] ?? null;

  const confirmImageEdit = useCallback(
    async (blob: Blob) => {
      const current = imageEditQueue[0];
      if (!idParam || !current) return;
      const praxisId = parseInt(idParam, 10);
      const file = blobToFile(blob, current.name);
      try {
        const uploaded = await uploadPraxisMedia(praxisId, file);
        setMedia((previous) => [...previous, uploaded]);
      } catch (err) {
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.upload", { name: current.name }),
          ),
        );
      } finally {
        setImageEditQueue((previous) => previous.slice(1));
      }
    },
    [idParam, imageEditQueue],
  );

  const cancelImageEdit = useCallback(() => {
    setImageEditQueue((previous) => previous.slice(1));
  }, []);

  const removeMedia = useCallback(
    async (item: MediaItemOut) => {
      if (!idParam) return;
      try {
        await deletePraxisMedia(parseInt(idParam, 10), item.id);
        setMedia((previous) => previous.filter((m) => m.id !== item.id));
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.removeMedia")),
        );
      }
    },
    [idParam],
  );

  // ---- Save / publish ----
  const cancelQueuedAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  /** Cancel-then-write, then remember what was written. Resolves to whether a
   * PUT went out — see `flushEdits` for why the order matters. */
  const persistEdits = useCallback(
    async (praxisId: number) => {
      const wrote = await flushEdits({
        praxisId,
        title,
        body,
        lastSavedTitle: lastSavedTitleRef.current,
        lastSavedBody: lastSavedBodyRef.current,
        cancelQueuedAutosave,
      });
      if (wrote) {
        lastSavedTitleRef.current = title;
        lastSavedBodyRef.current = body;
      }
      return wrote;
    },
    [title, body, cancelQueuedAutosave],
  );

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
      await persistEdits(praxisId);
      await submitPraxis(praxisId);
      let refreshed: PraxisOut | null = null;
      let refreshedDuel: DuelDetailOut | null = duel;
      try {
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
  }, [idParam, title, persistEdits, navigate, refetch, user?.character?.id, duel]);

  // The third exit (#1081). Publish files the praxis and Drop destroys it; this
  // is the one that keeps the draft and simply leaves.
  //
  // Almost every byte is already persisted by the time it's pressed — title and
  // body on the 2s debounce, media the moment it's picked — so the work here is
  // the flush, not a save: the queued autosave is cancelled and the text in hand
  // written in its place, exactly as publish does. Without that, the keystrokes
  // typed inside the debounce window would be discarded by the unmount.
  //
  // Destination is the player's own profile, whose praxis grid shows them their
  // own `in_progress` work (`praxis_visibility_condition` ORs in the viewer's
  // member praxes) — i.e. the draft they just saved, waiting where they left it.
  const saveDraft = useCallback(async () => {
    if (!idParam) return;
    if (
      draftNeedsTitle(
        title,
        body,
        lastSavedTitleRef.current,
        lastSavedBodyRef.current,
      )
    ) {
      // Stay put: the body is still in the box, and leaving would strand it.
      setError(i18n.t("forms:editPraxis.errors.titleRequired"));
      return;
    }
    const dirty = hasUnsavedEdits(
      title,
      body,
      lastSavedTitleRef.current,
      lastSavedBodyRef.current,
    );
    setError("");
    if (dirty) setSaveStatus("saving");
    try {
      await persistEdits(parseInt(idParam, 10));
    } catch (err) {
      // The write failed, so the only copy of this text is the one on screen.
      // Report and hold — navigating now would be the data loss the flush exists
      // to prevent.
      if (dirty) setSaveStatus("error");
      setError(extractError(err, i18n.t("forms:editPraxis.errors.saveDraft")));
      return;
    }
    if (dirty) {
      setAutosaveAt(new Date());
      setSaveStatus("saved");
    }
    const characterId = user?.character?.id;
    navigate(characterId != null ? `/characters/${characterId}` : "/tasks");
  }, [idParam, title, body, persistEdits, navigate, user?.character?.id]);

  // Pull my own part back out of a pending collab (#591) — clears my cast so the
  // composer unlocks for editing. Backend re-opens only my membership (#590).
  // Also the duel side's neutral reopen (#1077): same endpoint, and for a duel
  // still at `active` it takes the praxis back to `in_progress` without touching
  // `forfeited_by_character_id` — forfeit begins only at `settled` (ADR-0011
  // §Forfeit). No confirm: the consequence-free case earns none.
  const pullBack = useCallback(async () => {
    if (!idParam) return;
    setSubmitting(true);
    setError("");
    try {
      const praxisId = parseInt(idParam, 10);
      await unsubmitPraxis(praxisId);
      await refetch();
      // `refetch` only refreshes auth — without reloading the praxis the roster
      // would keep showing my part as cast right after I pulled it back.
      setPraxis(await getPraxis(praxisId));
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.publish")));
    } finally {
      setSubmitting(false);
    }
  }, [idParam, refetch]);

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
    const crewAtStake = praxis.type === "collab" && praxis.members.length > 1;
    const confirmed = await askConfirm(
      crewAtStake
        ? deleteCollabConfirm(praxis.task_faction_slug)
        : dropTaskConfirm(),
    );
    if (!confirmed) return;
    cancelQueuedAutosave();
    try {
      await deletePraxis(praxis.id);
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.drop")));
      return;
    }
    navigate("/tasks");
  }, [praxis, navigate, askConfirm, cancelQueuedAutosave]);

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

  // ---- Invite search (debounced via input change handler in caller, but
  // we keep the actual fetch here so archetypes can wire the input directly) ----
  useEffect(() => {
    if (!praxis) return;
    if (inviteQuery.length < 2) {
      setInviteResults([]);
      setInviteOpen(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const results = await listCharacters({
          search: inviteQuery,
          exclude_active_task_id: praxis.task_id,
          limit: 8,
        });
        if (cancelled) return;
        const memberIds = new Set(praxis.members.map((m) => m.character_id));
        const pendingInviteIds = new Set(
          praxis.invites
            .filter((i) => i.status === "pending")
            .map((i) => i.invitee_id),
        );
        // The picker is choosing an *opponent* only while a duel is being set up;
        // with a challenge already attached it is hidden, and otherwise it is
        // choosing collab invitees.
        const pickingOpponent = praxis.duel_id == null && duelPaneOpen;
        const selfExcluded = selfExcludedPickIds(
          user?.character?.id,
          ownCharacterIds,
          pickingOpponent,
        );
        const filtered = results.filter(
          (c) =>
            !selfExcluded.has(c.id) &&
            !memberIds.has(c.id) &&
            !pendingInviteIds.has(c.id),
        );
        // In duel mode, surface the viewer's foes first (soft ordering; anyone
        // eligible can still be challenged).
        if (pickingOpponent && foeIds.size > 0) {
          filtered.sort(
            (a, b) => Number(foeIds.has(b.id)) - Number(foeIds.has(a.id)),
          );
        }
        setInviteResults(filtered);
        setInviteOpen(filtered.length > 0);
      } catch {
        if (!cancelled) {
          setInviteResults([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // `user` narrowed to the id the filter actually reads (#1390) — otherwise
    // every `/auth/me` refetch re-ran the character search behind an open
    // invite box.
  }, [
    inviteQuery,
    praxis,
    user?.character?.id,
    duelPaneOpen,
    foeIds,
    ownCharacterIds,
  ]);

  const sendInvite = useCallback(
    async (character: CharacterOut) => {
      if (!praxis) return;
      setInviting(true);
      setError("");
      setInviteQuery("");
      setInviteOpen(false);
      setInviteResults([]);
      try {
        await inviteToPraxis(praxis.id, character.id);
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
      } catch (err) {
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.invite", {
              name: character.display_name,
            }),
          ),
        );
      } finally {
        setInviting(false);
      }
    },
    [praxis],
  );

  // Inviter rescinds a still-pending invite (#421).
  const cancelInvite = useCallback(
    async (inviteId: number) => {
      if (!praxis) return;
      setError("");
      try {
        await cancelInviteApi(praxis.id, inviteId);
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.rescindInvite")),
        );
      }
    },
    [praxis],
  );

  // Remove another member from the collab (#959). Any member may kick any other
  // (mirrors the backend guard); the confirm step lives in CollabRoster, so this
  // just fires the call and reloads — the kick resets the group to editing, so
  // the refreshed praxis carries the reset roster + cast state (ADR-0013).
  const kickMember = useCallback(
    async (memberId: number) => {
      if (!praxis) return;
      setError("");
      try {
        const updated = await kickMemberApi(praxis.id, memberId);
        setPraxis(updated);
      } catch (err) {
        const kicked = praxis.members.find(
          (member) => member.character_id === memberId,
        );
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.kick", {
              name: kicked?.character_display_name ?? "",
            }),
          ),
        );
      }
    },
    [praxis],
  );

  // Poke whoever this praxis is waiting on (#1083). Every rule lives on the
  // server — who may nudge, and the one-per-24h limit — so this fires and then
  // RE-READS. It deliberately keeps no local "nudged" flag: the design's version
  // did exactly that, which made the button read as sent when nothing had been,
  // and let a reload clear it. `nudged_at` on the refreshed roster row / duel
  // side is the only thing the button believes.
  const nudge = useCallback(
    async (characterId: number) => {
      if (!praxis) return;
      setError("");
      // A duel is two linked solo praxes (ADR-0011): the praxis the rival owes
      // is THEIR side, not the one this composer is holding.
      const duelSide =
        duel != null
          ? [duel.challenger, duel.opponent].find(
              (side) => side.character_id === characterId,
            )
          : undefined;
      const targetPraxisId = duelSide?.praxis_id ?? praxis.id;
      const name =
        duelSide?.display_name ??
        praxis.members.find((member) => member.character_id === characterId)
          ?.character_display_name ??
        "";
      try {
        await sendNudge(targetPraxisId, characterId);
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
        if (refreshed.duel_id != null) {
          setDuel(await getDuelDetail(refreshed.duel_id));
        }
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.nudge", { name })),
        );
      }
    },
    [praxis, duel],
  );

  // ---- Duel challenge (#311): pick an opponent, cancel a pending challenge ----
  const sendChallenge = useCallback(
    async (character: CharacterOut) => {
      if (!praxis) return;
      setInviting(true);
      setError("");
      setInviteQuery("");
      setInviteOpen(false);
      setInviteResults([]);
      try {
        await issueChallenge({
          challenger_praxis_id: praxis.id,
          opponent_character_id: character.id,
        });
        // Reload so the praxis carries its new duel_id; the effect fetches detail.
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
      } catch (err) {
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.challenge", {
              name: character.display_name,
            }),
          ),
        );
      } finally {
        setInviting(false);
      }
    },
    [praxis],
  );

  const cancelDuel = useCallback(async () => {
    if (!praxis?.duel_id) return;
    setError("");
    try {
      await cancelChallenge(praxis.duel_id);
      const refreshed = await getPraxis(praxis.id);
      setPraxis(refreshed);
      setDuel(null);
      setDuelPaneOpen(false);
    } catch (err) {
      setError(
        extractError(err, i18n.t("forms:editPraxis.errors.cancelChallenge")),
      );
    }
  }, [praxis]);

  // Dissolve an *active* duel (#956). Same neutral cancel as `cancelDuel`, but
  // gated behind a confirm because it ends an accepted duel for both sides.
  const dissolveDuel = useCallback(async () => {
    if (!praxis?.duel_id) return;
    if (!(await askConfirm(dissolveDuelConfirm()))) return;
    await cancelDuel();
  }, [praxis?.duel_id, cancelDuel, askConfirm]);

  // ---- Metatasks (#933) ----
  // Legacy toggle (apply when absent, remove when present) kept on the state
  // shape; the new compose flow adds through the picker and removes through the
  // confirm below. All three keep `appliedMetataskList` in sync.
  const toggleMetatask = useCallback(
    async (mt: TaskOut) => {
      if (!praxis) return;
      if (applyingMetatask !== null) return;
      setApplyingMetatask(mt.id);
      setError("");
      try {
        if (appliedMetatasks.has(mt.id)) {
          await removeMetatask(praxis.id, mt.id);
          setAppliedMetataskList((previous) =>
            previous.filter((m) => m.id !== mt.id),
          );
        } else {
          await applyMetatask(praxis.id, mt.id);
          setAppliedMetataskList((previous) => [...previous, mt]);
        }
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.updateMetatask")),
        );
      } finally {
        setApplyingMetatask(null);
      }
    },
    [praxis, applyingMetatask, appliedMetatasks],
  );

  // Section D: the picker seals one metatask at a time, then closes.
  const addMetatask = useCallback(
    async (mt: TaskOut) => {
      if (!praxis || applyingMetatask !== null) return;
      if (appliedMetatasks.has(mt.id)) {
        setMetataskPickerOpen(false);
        return;
      }
      setApplyingMetatask(mt.id);
      setError("");
      try {
        await applyMetatask(praxis.id, mt.id);
        setAppliedMetataskList((previous) => [...previous, mt]);
        setMetataskPickerOpen(false);
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.updateMetatask")),
        );
      } finally {
        setApplyingMetatask(null);
      }
    },
    [praxis, applyingMetatask, appliedMetatasks],
  );

  // Section E: the seal's × asks first — open the confirm for that metatask.
  const requestRemoveMetatask = useCallback(
    (taskId: number) => {
      setMetataskRemovalTarget(
        appliedMetataskList.find((mt) => mt.id === taskId) ?? null,
      );
    },
    [appliedMetataskList],
  );

  const cancelRemoveMetatask = useCallback(
    () => setMetataskRemovalTarget(null),
    [],
  );

  const confirmRemoveMetatask = useCallback(async () => {
    const target = metataskRemovalTarget;
    if (!praxis || !target) return;
    setApplyingMetatask(target.id);
    setError("");
    try {
      await removeMetatask(praxis.id, target.id);
      setAppliedMetataskList((previous) =>
        previous.filter((mt) => mt.id !== target.id),
      );
      setMetataskRemovalTarget(null);
    } catch (err) {
      setError(
        extractError(err, i18n.t("forms:editPraxis.errors.updateMetatask")),
      );
    } finally {
      setApplyingMetatask(null);
    }
  }, [praxis, metataskRemovalTarget]);

  // ---- Derived ----
  const isPublished = praxis?.status === "submitted";
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
  // viewer is eligible to seal (backend ships `eligible_for_current_user`; the
  // load effect already filters `metatasks` to it — the level threshold never
  // reaches the client).
  const canSealMetatask =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    metatasks.length > 0;
  // Legacy name, unchanged meaning (still gates the old per-archetype block).
  const showMetatasks = canSealMetatask;
  // Show the stack when the viewer can seal, OR when an ineligible viewer still
  // has seals to display read-only (no add slot, no ×).
  const showSealStack =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    (canSealMetatask || appliedMetataskList.length > 0);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

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
    wordCount,

    media,
    fileError,
    handleFileChange,
    removeMedia,

    pendingImage,
    confirmImageEdit,
    cancelImageEdit,

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

    duel,
    sendChallenge,
    cancelDuel,
    dissolveDuel,

    metatasks,
    appliedMetatasks,
    appliedMetataskList,
    applyingMetatask,
    toggleMetatask,
    addMetatask,

    metataskPickerOpen,
    openMetataskPicker: () => setMetataskPickerOpen(true),
    closeMetataskPicker: () => setMetataskPickerOpen(false),

    metataskRemovalTarget,
    requestRemoveMetatask,
    confirmRemoveMetatask,
    cancelRemoveMetatask,

    submitting,
    publish,
    saveDraft,
    pullBack,
    reopenForEdit,
    leaveCollab,
    cancel,
    collabSuccess,
    continueFromCollabSuccess,

    duelSealOpen,
    requestDuelSeal: () => setDuelSealOpen(true),
    cancelDuelSeal: () => setDuelSealOpen(false),

    pendingConfirm,
    acceptConfirm: () => settleConfirm(true),
    dismissConfirm: () => settleConfirm(false),

    autosaveAt,
    saveStatus,

    autoSubmitDays,
    isPublished: !!isPublished,
    controlsLocked,
    modeIsLocked,
    showInviteBox,
    showMetatasks,
    canSealMetatask,
    showSealStack,
    duelMode,
    duelChipVisible,

    currentCharacterId: user?.character?.id ?? null,
  };
}
