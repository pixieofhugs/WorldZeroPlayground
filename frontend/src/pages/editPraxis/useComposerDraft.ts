/**
 * The composer's draft title and body — a read-only *view* of the room
 * document (ADR-0073, #1743). Nothing here writes to the server, and nothing
 * pushes these back into the document (that would be a client-side seed).
 */
import { useCallback, useState } from "react";

interface ComposerDraft {
  title: string;
  setTitle: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  autosaveAt: Date | null;
  setAutosaveAt: (value: Date | null) => void;
  /** Fill the boxes from the record while the socket opens; not a room seed. */
  hydrate: (title: string, body: string) => void;
}

export function useComposerDraft(): ComposerDraft {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  // Stamped by the room provider on every document update ("Saved …").
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
