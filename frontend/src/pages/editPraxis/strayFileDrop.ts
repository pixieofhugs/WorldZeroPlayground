/**
 * The stray-drop guard for every form on the `ComposerSheet` chassis.
 *
 * Moved out of `useComposerMedia` (#3135): it was the praxis composer's alone,
 * and a file that missed on Propose a Task or a character form still navigated
 * the browser to it and took the form's contents along.
 */
import { useEffect } from "react";

/**
 * A drag carrying files in from outside the page (#3077) — as opposed to a text
 * selection being moved inside the body editor, which must stay the browser's.
 */
export function isFileDrag(event: {
  dataTransfer: Pick<DataTransfer, "types"> | null;
}): boolean {
  return !!event.dataTransfer?.types.includes("Files");
}

/**
 * A file dropped on the composer but off the Proof control (#3077). Left alone
 * the browser navigates to the file and the draft is gone; this makes the miss
 * a no-op instead. Anything that already answered the event — the Proof
 * control, the body editor's own drop handling — is not second-guessed.
 *
 * A miss also LOOKS refused (#3135): the cursor reads "none" everywhere but the
 * Proof control, which set "copy" and cancelled the event before it got here.
 * The one exception is the body editor. CodeMirror answers `drop` (it reads a
 * dropped text file into the body) but not `dragover`, so over it the event
 * arrives uncancelled, and "none" would stop that drop from ever firing.
 *
 * ponytail: the editor is found by CodeMirror's own `.cm-editor` class. If a
 * second kind of drop target ever lands on a sheet, have it cancel `dragover`
 * itself, the way the Proof control does, rather than growing this selector.
 */
export function refuseStrayFileDrop(event: DragEvent): void {
  if (event.defaultPrevented || !isFileDrag(event)) return;
  event.preventDefault();
  // Duck-typed: Firefox can target a text node, which has no `closest`.
  const target = event.target as (Element & { closest?: unknown }) | null;
  const element = target?.closest ? target : target?.parentElement;
  if (!element?.closest(".cm-editor")) event.dataTransfer!.dropEffect = "none";
}

// Two sheets can share a page, so the listeners outlive the first to unmount.
let sheetsMounted = 0;

/** Mounted by `ComposerSheet`, and by nothing else. */
export function useStrayFileDropGuard(): void {
  useEffect(() => {
    if (sheetsMounted++ === 0) {
      window.addEventListener("dragover", refuseStrayFileDrop);
      window.addEventListener("drop", refuseStrayFileDrop);
    }
    return () => {
      if (--sheetsMounted > 0) return;
      window.removeEventListener("dragover", refuseStrayFileDrop);
      window.removeEventListener("drop", refuseStrayFileDrop);
    };
  }, []);
}
