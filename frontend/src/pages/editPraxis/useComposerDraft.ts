/**
 * The composer's draft text: title, body, the 2s debounced autosave, and the
 * cancel-then-write flush every manual save runs.
 *
 * This is the concern that owns *what has and has not reached the server*. The
 * last-persisted title and body live here in refs and are never read from
 * outside — callers ask `isDirty()` / `needsTitle()` instead, so no other file
 * can drift on what "unsaved" means.
 *
 * Split out of `useEditPraxis.ts` (#1392); behaviour is unchanged from #360 /
 * #1081 / #1164.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { updatePraxis, type PraxisOut } from "../../api/praxis";
import type { SaveStatus } from "./editPraxisState";

const AUTOSAVE_DEBOUNCE_MS = 2000;

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

export interface ComposerDraft {
  title: string;
  setTitle: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  wordCount: number;
  autosaveAt: Date | null;
  setAutosaveAt: (value: Date | null) => void;
  saveStatus: SaveStatus;
  setSaveStatus: (value: SaveStatus) => void;
  /**
   * Seed the boxes AND the last-persisted marks from a freshly loaded praxis.
   * Both halves matter: without the marks the autosave effect would read the
   * hydration itself as a user edit and PUT it straight back.
   */
  hydrate: (title: string, body: string) => void;
  cancelQueuedAutosave: () => void;
  /** Cancel-then-write, then remember what was written. */
  persistEdits: (praxisId: number) => Promise<boolean>;
  /** Does the text on screen differ from what the server last accepted? */
  isDirty: () => boolean;
  /** Would the pending flush be rejected for want of a title? (#1081) */
  needsTitle: () => boolean;
}

export function useComposerDraft(
  praxis: PraxisOut | null,
  setPraxis: (praxis: PraxisOut) => void,
): ComposerDraft {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [autosaveAt, setAutosaveAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Track last-persisted title/body so the autosave effect can detect
  // genuine user edits and skip the initial hydration round-trip.
  const lastSavedTitleRef = useRef<string | null>(null);
  const lastSavedBodyRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrate = useCallback((initialTitle: string, initialBody: string) => {
    setTitle(initialTitle);
    setBody(initialBody);
    lastSavedTitleRef.current = initialTitle;
    lastSavedBodyRef.current = initialBody;
  }, []);

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

  const isDirty = useCallback(
    () =>
      hasUnsavedEdits(
        title,
        body,
        lastSavedTitleRef.current,
        lastSavedBodyRef.current,
      ),
    [title, body],
  );

  const needsTitle = useCallback(
    () =>
      draftNeedsTitle(
        title,
        body,
        lastSavedTitleRef.current,
        lastSavedBodyRef.current,
      ),
    [title, body],
  );

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return {
    title,
    setTitle,
    body,
    setBody,
    wordCount,
    autosaveAt,
    setAutosaveAt,
    saveStatus,
    setSaveStatus,
    hydrate,
    cancelQueuedAutosave,
    persistEdits,
    isDirty,
    needsTitle,
  };
}
