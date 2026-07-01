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
  createPraxis,
  deletePraxis,
  deletePraxisMedia,
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

  // Invites (collab/duel)
  inviteQuery: string;
  setInviteQuery: (value: string) => void;
  inviteResults: CharacterOut[];
  inviteOpen: boolean;
  setInviteOpen: (value: boolean) => void;
  inviting: boolean;
  sendInvite: (character: CharacterOut) => Promise<void>;

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
  showCollabInvite: boolean;
  showMetatasks: boolean;
  duelSlotFull: boolean;

  // Identity helpers
  currentCharacterId: number | null;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Decide whether switching to a new mode needs a confirm, and with what prompt.
 * Returns the message to confirm, or null to proceed silently.
 *
 * A mode switch tears down and recreates the praxis (see `performModeSwitch`),
 * so the destructive cases warn first instead of locking the control (#155):
 *  - co-authors present  → they'll be dropped
 *  - else unsaved draft  → it'll be discarded
 */
export function modeSwitchPrompt(
  memberCount: number,
  hasDraftContent: boolean,
): string | null {
  if (memberCount > 1) {
    return "Switching mode will drop the collaboration — your co-authors will be removed and the current draft replaced. Continue?";
  }
  if (hasDraftContent) {
    return "Changing mode will discard your current draft (title, body, media, metatasks). Continue?";
  }
  return null;
}

export function useEditPraxis(idParam: string | undefined): EditPraxisState {
  const navigate = useNavigate();
  const { user, refetch } = useAuth();

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
    const praxisId = parseInt(idParam, 10);
    setLoading(true);
    getPraxis(praxisId)
      .then(async (loaded) => {
        if (user?.character?.id !== loaded.created_by_id) {
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
  }, [idParam, user, navigate]);

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
  const hasDraftContent = useCallback((): boolean => {
    if (title.trim().length > 0) return true;
    if (body.trim().length > 0) return true;
    if (media.length > 0) return true;
    if (appliedMetatasks.size > 0) return true;
    return false;
  }, [title, body, media, appliedMetatasks]);

  const performModeSwitch = useCallback(
    async (next: PraxisType) => {
      if (!praxis) return;
      setError("");
      setSwitchingMode(next);
      try {
        const taskId = praxis.task_id;
        await deletePraxis(praxis.id);
        const fresh = await createPraxis({ task_id: taskId, type: next });
        navigate(`/praxes/${fresh.id}/edit`, { replace: true });
      } catch (err) {
        setError(extractError(err, "Could not change mode."));
        setSwitchingMode(null);
      }
    },
    [praxis, navigate],
  );

  const changeMode = useCallback(
    async (next: PraxisType) => {
      if (!praxis || praxis.type === next) return;
      const prompt = modeSwitchPrompt(praxis.members.length, hasDraftContent());
      if (prompt && !window.confirm(prompt)) return;
      await performModeSwitch(next);
    },
    [praxis, hasDraftContent, performModeSwitch],
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
  }, [inviteQuery, praxis, user]);

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
  const duelSlotFull = !!(
    praxis &&
    praxis.type === "duel" &&
    praxis.members.length +
      praxis.invites.filter((i) => i.status === "pending").length >=
      2
  );
  const showCollabInvite =
    !controlsLocked &&
    !!praxis &&
    (praxis.type === "collab" || praxis.type === "duel");
  const showMetatasks =
    !controlsLocked &&
    !!praxis &&
    praxis.type === "solo" &&
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
    showCollabInvite,
    showMetatasks,
    duelSlotFull,

    currentCharacterId: user?.character?.id ?? null,
  };
}
