/**
 * The stray-drop guard for every form on the `ComposerSheet` chassis.
 *
 * Moved out of `useComposerMedia` (#3135): it was the praxis composer's alone,
 * and a file that missed on Propose a Task or a character form still navigated
 * the browser to it and took the form's contents along.
 */
import { useEffect } from "react";

/**
 * Whether the drag in flight began on this page (#3172). Only a drag that
 * starts here fires `dragstart` here; files dragged in from the desktop never
 * do. That is the whole test, so no element needs marking: an `<img>` anywhere
 * on the page, a tile, an avatar, can be dragged onto the Proof control and
 * Chrome may well list it under "Files" - and it is still not a pick.
 */
let dragStartedInPage = false;
export const noteDragStart = () => {
  dragStartedInPage = true;
};
export const noteDragEnd = () => {
  dragStartedInPage = false;
};

type DragLike = { dataTransfer: Pick<DataTransfer, "types" | "items"> | null };

const carriesFiles = (event: DragLike) =>
  !!event.dataTransfer?.types.includes("Files");

/**
 * A drag carrying files in from outside the page (#3077) - as opposed to a text
 * selection being moved inside the body editor, which must stay the browser's,
 * or something dragged from this page (#3172).
 */
export function isFileDrag(event: DragLike): boolean {
  return carriesFiles(event) && !dragStartedInPage;
}

/**
 * Whether the files in the drag are photos, video or audio (#3172). Readable
 * during the drag in Chrome and Firefox; where the types come back empty this
 * says no, which keeps the behaviour a drag had before it was asked.
 */
const carriesMedia = (event: DragLike) =>
  Array.from(event.dataTransfer?.items ?? []).some(
    (item) => item.kind === "file" && /^(image|video|audio)\//.test(item.type),
  );

/**
 * A file dropped on the composer but off the Proof control (#3077). Left alone
 * the browser navigates to the file and the draft is gone; this makes the miss
 * a no-op instead. Anything that already answered the event - the Proof
 * control, the body editor's own drop handling - is not second-guessed.
 *
 * A miss also LOOKS refused (#3135): the cursor reads "none" everywhere but the
 * Proof control, which set "copy" and cancelled the event before it got here.
 * The one exception is the body editor, and only for a text file (#3172).
 * CodeMirror answers `drop` (it reads a dropped text file into the body) but
 * not `dragover`, so over it the event arrives uncancelled, and "none" would
 * stop that drop from ever firing. A photo, clip or sound dropped there would
 * be taken and discarded without a word, so it gets "none" like the rest.
 *
 * ponytail: the editor is found by CodeMirror's own `.cm-editor` class. If a
 * second kind of drop target ever lands on a sheet, have it cancel `dragover`
 * itself, the way the Proof control does, rather than growing this selector.
 */
export function refuseStrayFileDrop(event: DragEvent): void {
  if (event.defaultPrevented || !carriesFiles(event)) return;
  event.preventDefault();
  // Duck-typed: Firefox can target a text node, which has no `closest`.
  const target = event.target as (Element & { closest?: unknown }) | null;
  const element = target?.closest ? target : target?.parentElement;
  const textFileForEditor =
    !!element?.closest(".cm-editor") &&
    !dragStartedInPage &&
    !carriesMedia(event);
  if (!textFileForEditor) event.dataTransfer!.dropEffect = "none";
}

const LISTENERS: [string, EventListener][] = [
  ["dragstart", noteDragStart],
  ["dragover", refuseStrayFileDrop as EventListener],
  ["drop", refuseStrayFileDrop as EventListener],
  // After the guard's own `drop`, which still has to read the flag.
  ["drop", noteDragEnd],
  ["dragend", noteDragEnd],
];

// The page and a sheet can both ask, so the listeners outlive the first to unmount.
let sheetsMounted = 0;

/**
 * Mounted by `ComposerSheet` and by the praxis editor route, which must have it
 * while it loads, fails to load, and waits on its archetype chunk (#3172).
 */
export function useStrayFileDropGuard(): void {
  useEffect(() => {
    if (sheetsMounted++ === 0) {
      dragStartedInPage = false;
      for (const [type, fn] of LISTENERS) window.addEventListener(type, fn);
    }
    return () => {
      if (--sheetsMounted > 0) return;
      for (const [type, fn] of LISTENERS) window.removeEventListener(type, fn);
    };
  }, []);
}
