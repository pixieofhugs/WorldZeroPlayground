/**
 * The composer's draft text: the title box and the body.
 *
 * **Nothing here writes to the server.** A praxis is written in its room and
 * flushed to the record by the room server (ADR-0073, #1743), so this hook is
 * a *view* of the document, not a copy of it waiting to be sent.
 *
 * What used to live here — the 2s debounced `PUT`, `flushEdits`' cancel-then-write
 * ordering, the last-persisted refs, `isDirty()` / `needsTitle()` — existed to
 * make single-writer autosave safe (#360 / #1081 / #1164). Every one of them
 * answered "what has and has not reached the server", and the room answers that
 * by construction: an update is in `praxis_room_update` before the socket
 * acknowledges it. `hasUnsavedEdits` in particular was a workaround for a praxis
 * `PUT` hard-resetting every member's `has_submitted` (ADR-0012) and went with
 * the `PUT` that caused it.
 *
 * The values still flow one way, and only one way. `body` follows the room's
 * `Y.Text` (`BodyTextarea`) and `title` follows the room's map key
 * (`TitleField`); nothing pushes either back into the document, or the praxis
 * would seed the room it is supposed to be seeded BY.
 */
import { useCallback, useState } from "react";

interface ComposerDraft {
  title: string;
  setTitle: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  autosaveAt: Date | null;
  setAutosaveAt: (value: Date | null) => void;
  /**
   * Seed the boxes from a freshly loaded praxis.
   *
   * Still needed with the room in place, and not a second seed: this fills the
   * title box and the preview pane from the record while the socket is still
   * opening, and both controls hand over to the document the moment it arrives.
   * The room's own seed is server-side and reads the same column.
   */
  hydrate: (title: string, body: string) => void;
}

export function useComposerDraft(): ComposerDraft {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  // "The room has this" — stamped by the provider on every document update, so
  // the composer's "Saved …" line marks something that actually happened rather
  // than a request this hook fired.
  const [autosaveAt, setAutosaveAt] = useState<Date | null>(null);

  const hydrate = useCallback((initialTitle: string, initialBody: string) => {
    setTitle(initialTitle);
    setBody(initialBody);
  }, []);

  return {
    title,
    setTitle,
    body,
    setBody,
    autosaveAt,
    setAutosaveAt,
    hydrate,
  };
}
