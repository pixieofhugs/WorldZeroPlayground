/**
 * useEditPraxis — extracts every piece of state and async behavior from the
 * legacy EditPraxis.tsx so that the seven faction archetypes can each own their
 * own visual treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (mode-switch deletes + recreates,
 * locked-once-published rules, debounced 2s autosave on title/body, immediate save
 * for mode/metatask).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  applyMetatask,
  changePraxisType,
  deletePraxis,
  deletePraxisMedia,
  cancelInvite as cancelInviteApi,
  getPraxis,
  inviteToPraxis,
  removeMetatask,
  submitPraxis,
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
import { getGameConfig } from "../../api/gameConfig";
import { listRelationships } from "../../api/relationships";
import { getTask, type TaskOut } from "../../api/tasks";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listMetatasks } from "../../api/metaTasks";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface EditPraxisState {
  // Routing / loading
  loading: boolean;
  praxis: PraxisOut | null;
  task: TaskOut | null;
  error: string;
  setError: (value: string) => void;

  // Title / body
  title: string;
  setTitle: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  wordCount: number;

  // Media
  media: MediaItemOut[];
  fileError: string;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeMedia: (item: MediaItemOut) => Promise<void>;

  // Mode switching
  switchingMode: PraxisType | null;
  changeMode: (next: PraxisType) => Promise<void>;

  // Invites (collab) / challenge (duel) — shared search box
  inviteQuery: string;
  setInviteQuery: (value: string) => void;
  inviteResults: CharacterOut[];
  inviteOpen: boolean;
  setInviteOpen: (value: boolean) => void;
  inviting: boolean;
  sendInvite: (character: CharacterOut) => Promise<void>;
  cancelInvite: (inviteId: number) => Promise<void>;

  // Duel challenge (#311) — selecting duel attaches a challenge to this praxis;
  // the praxis stays type='solo' and gains a duel_id.
  duel: DuelDetailOut | null;
  sendChallenge: (character: CharacterOut) => Promise<void>;
  cancelDuel: () => Promise<void>;

  // Metatasks
  metaTasks: TaskOut[];
  appliedMetatasks: Set<number>;
  applyingMetatask: number | null;
  toggleMetatask: (mt: TaskOut) => Promise<void>;

  // Save / publish / drop
  submitting: boolean;
  publish: () => Promise<void>;
  cancel: () => Promise<void>;

  // Autosave
  autosaveAt: Date | null;
  saveStatus: SaveStatus;

  // Derived locked-state flags
  isPublished: boolean;
  controlsLocked: boolean;
  modeIsLocked: boolean;
  /** Show the invite/challenge box: collab members, or an open duel pane. */
  showInviteBox: boolean;
  showMetatasks: boolean;
  /** The duel chip is selected (a challenge is attached or the pane is open). */
  duelMode: boolean;
  /** The duel chip is available to this viewer (level ≥ duel_level_required). */
  duelChipVisible: boolean;

  // Identity helpers
  currentCharacterId: number | null;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Decide whether switching to a new mode needs a confirm, and with what prompt.
 * Returns the message to confirm, or null to proceed silently.
 *
 * Mode switches are now in-place (#321 solo↔collab, #311 duel), so the draft is
 * always preserved — only genuinely destructive transitions warn:
 *  - leaving a pending/active duel  → the challenge is cancelled
 *  - collab → solo with co-authors  → they're dropped (content stays)
 */
export function modeSwitchPrompt(
  next: PraxisType,
  currentType: PraxisType,
  memberCount: number,
  inDuel: boolean,
): string | null {
  if (inDuel && next !== "duel") {
    return "Switching mode will cancel your duel challenge. Continue?";
  }
  if (next === "solo" && currentType === "collab" && memberCount > 1) {
    return "Switching to solo will remove your co-authors — your draft stays. Continue?";
  }
  return null;
}

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

  const [metaTasks, setMetaTasks] = useState<TaskOut[]>([]);
  const [appliedMetatasks, setAppliedMetatasks] = useState<Set<number>>(
    new Set(),
  );
  const [applyingMetatask, setApplyingMetatask] = useState<number | null>(null);

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<CharacterOut[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [switchingMode, setSwitchingMode] = useState<PraxisType | null>(null);

  // Duel challenge (#311)
  const [duelPaneOpen, setDuelPaneOpen] = useState(false);
  const [duel, setDuel] = useState<DuelDetailOut | null>(null);
  const [duelLevelRequired, setDuelLevelRequired] = useState<number | null>(null);
  const [foeIds, setFoeIds] = useState<Set<number>>(new Set());

  const [autosaveAt, setAutosaveAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Track last-persisted title/body so the autosave effect can detect
  // genuine user edits and skip the initial hydration round-trip.
  const lastSavedTitleRef = useRef<string | null>(null);
  const lastSavedBodyRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Initial load ----
  useEffect(() => {
    if (!idParam) return;
    // Wait for auth to resolve before the membership guard — otherwise a
    // still-loading `user` would bounce to the read page, which redirects
    // in_progress praxes right back here (infinite loop).
    if (authLoading) return;
    const praxisId = parseInt(idParam, 10);
    setLoading(true);
    getPraxis(praxisId)
      .then(async (loaded) => {
        // A collab is co-owned — any member may edit (ADR-0013), not just the
        // creator. Gating on created_by_id looped non-creator members between
        // this page and the read page's in_progress → edit redirect.
        const viewerId = user?.character?.id;
        const isMember =
          viewerId != null &&
          loaded.members.some((member) => member.character_id === viewerId);
        if (!isMember) {
          navigate(`/praxes/${idParam}`, { replace: true });
          return;
        }
        setPraxis(loaded);
        const initialTitle = loaded.title ?? "";
        const initialBody = loaded.body_text ?? "";
        setTitle(initialTitle);
        setBody(initialBody);
        setMedia(loaded.media_items);
        lastSavedTitleRef.current = initialTitle;
        lastSavedBodyRef.current = initialBody;
        await Promise.all([
          getTask(loaded.task_id)
            .then(setTask)
            .catch(() => {
              /* non-fatal */
            }),
          listMetatasks()
            .then((all) =>
              setMetaTasks(all.filter((mt) => mt.eligible_for_current_user)),
            )
            .catch(() => {
              /* non-fatal */
            }),
        ]);
      })
      .catch(() => setError("Couldn't load this praxis."))
      .finally(() => setLoading(false));
  }, [idParam, user, authLoading, navigate]);

  // ---- Duel gating: level required + the viewer's foes (surfaced first) ----
  useEffect(() => {
    getGameConfig()
      .then((cfg) => setDuelLevelRequired(cfg.duel_level_required))
      .catch(() => {
        /* non-fatal; chip stays hidden until known */
      });
  }, []);

  useEffect(() => {
    if (!user?.character) return;
    listRelationships({ type: "foe", status: "active" })
      .then((rels) => setFoeIds(new Set(rels.map((r) => r.to_character_id))))
      .catch(() => {
        /* foes-first ordering is a nicety; ignore failures */
      });
  }, [user?.character?.id]);

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
          await updatePraxis(praxis.id, {
            title,
            body_text: body || undefined,
          });
          lastSavedTitleRef.current = title;
          lastSavedBodyRef.current = body;
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
          `File${tooLarge.length > 1 ? "s" : ""} too large (50 MB limit): ${tooLarge.map((f) => f.name).join(", ")}`,
        );
      } else {
        setFileError("");
      }
      const valid = incoming.filter((f) => f.size <= MAX_FILE_SIZE);
      event.target.value = "";
      if (!idParam || valid.length === 0) return;
      // Upload immediately so a draft's media persists without a manual save
      // (the Save Draft button was removed in #297; autosave covers title/body,
      // and media now lands the moment it's picked — instant visual feedback too).
      const praxisId = parseInt(idParam, 10);
      for (const file of valid) {
        try {
          const uploaded = await uploadPraxisMedia(praxisId, file);
          setMedia((previous) => [...previous, uploaded]);
        } catch (err) {
          setError(extractError(err, `Could not upload ${file.name}.`));
        }
      }
    },
    [idParam],
  );

  const removeMedia = useCallback(
    async (item: MediaItemOut) => {
      if (!idParam) return;
      try {
        await deletePraxisMedia(parseInt(idParam, 10), item.id);
        setMedia((previous) => previous.filter((m) => m.id !== item.id));
      } catch (err) {
        setError(extractError(err, "Could not remove media item."));
      }
    },
    [idParam],
  );

  // ---- Save / publish ----
  const persistEdits = useCallback(
    async (praxisId: number) => {
      // Cancel any queued autosave so it can't race the manual write.
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      // Nothing changed since the last save → skip the PUT entirely (#360).
      // On a collab the PUT would reset every member's has_submitted.
      if (
        !hasUnsavedEdits(
          title,
          body,
          lastSavedTitleRef.current,
          lastSavedBodyRef.current,
        )
      ) {
        return;
      }
      await updatePraxis(praxisId, { title, body_text: body || undefined });
      lastSavedTitleRef.current = title;
      lastSavedBodyRef.current = body;
    },
    [title, body],
  );

  const publish = useCallback(async () => {
    if (!idParam || !title.trim()) {
      setError("Title is required.");
      return;
    }
    if (title.length > 200) {
      setError("Title must be 200 characters or fewer.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const praxisId = parseInt(idParam, 10);
      await persistEdits(praxisId);
      await submitPraxis(praxisId);
      try {
        await refetch();
      } catch {
        // best-effort; praxis was submitted successfully
      }
      navigate(`/praxes/${idParam}`);
    } catch (err) {
      setError(extractError(err, "Could not publish proof."));
    } finally {
      setSubmitting(false);
    }
  }, [idParam, title, persistEdits, navigate, refetch]);

  const cancel = useCallback(async () => {
    if (!praxis) return;
    const confirmed = window.confirm(
      "Drop this task? Your draft will be lost.",
    );
    if (!confirmed) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    try {
      await deletePraxis(praxis.id);
    } catch (err) {
      setError(extractError(err, "Could not drop the task."));
      return;
    }
    navigate("/tasks");
  }, [praxis, navigate]);

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
            !window.confirm(
              "Switching to a duel will remove your co-authors — your draft stays. Continue?",
            )
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
            setError(extractError(err, "Could not change mode."));
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

      // Only a *pending* challenge can be cancelled (the backend forbids
      // unilaterally cancelling an accepted duel). Once the opponent has
      // accepted, the challenger can't switch away.
      if (inDuel && duel && duel.status !== "pending") {
        setError(
          "This duel is already underway — it can't be cancelled from here.",
        );
        return;
      }

      const prompt = modeSwitchPrompt(
        next,
        praxis.type,
        praxis.members.length,
        inDuel,
      );
      if (prompt && !window.confirm(prompt)) return;

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
        setError(extractError(err, "Could not change mode."));
      } finally {
        setSwitchingMode(null);
      }
    },
    [praxis, duel],
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
        const filtered = results.filter(
          (c) =>
            c.id !== user?.character?.id &&
            !memberIds.has(c.id) &&
            !pendingInviteIds.has(c.id),
        );
        // In duel mode, surface the viewer's foes first (soft ordering; anyone
        // eligible can still be challenged).
        if (praxis.duel_id == null && duelPaneOpen && foeIds.size > 0) {
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
  }, [inviteQuery, praxis, user, duelPaneOpen, foeIds]);

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
          extractError(err, `Could not invite ${character.display_name}.`),
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
        setError(extractError(err, "Could not rescind the invite."));
      }
    },
    [praxis],
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
          extractError(err, `Could not challenge ${character.display_name}.`),
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
      setError(extractError(err, "Could not cancel the challenge."));
    }
  }, [praxis]);

  // ---- Metatasks ----
  const toggleMetatask = useCallback(
    async (mt: TaskOut) => {
      if (!praxis) return;
      if (applyingMetatask !== null) return;
      setApplyingMetatask(mt.id);
      setError("");
      try {
        if (appliedMetatasks.has(mt.id)) {
          await removeMetatask(praxis.id, mt.id);
          setAppliedMetatasks((previous) => {
            const next = new Set(previous);
            next.delete(mt.id);
            return next;
          });
        } else {
          await applyMetatask(praxis.id, mt.id);
          setAppliedMetatasks((previous) => new Set(previous).add(mt.id));
        }
      } catch (err) {
        setError(extractError(err, "Could not update metatask."));
      } finally {
        setApplyingMetatask(null);
      }
    },
    [praxis, applyingMetatask, appliedMetatasks],
  );

  // ---- Derived ----
  const isPublished = praxis?.status === "submitted";
  const isModerated =
    praxis?.moderation_status === "hidden" ||
    praxis?.moderation_status === "failed";
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
  const showMetatasks =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
    !duelMode &&
    metaTasks.length > 0;

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return {
    loading,
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

    duel,
    sendChallenge,
    cancelDuel,

    metaTasks,
    appliedMetatasks,
    applyingMetatask,
    toggleMetatask,

    submitting,
    publish,
    cancel,

    autosaveAt,
    saveStatus,

    isPublished: !!isPublished,
    controlsLocked,
    modeIsLocked,
    showInviteBox,
    showMetatasks,
    duelMode,
    duelChipVisible,

    currentCharacterId: user?.character?.id ?? null,
  };
}
