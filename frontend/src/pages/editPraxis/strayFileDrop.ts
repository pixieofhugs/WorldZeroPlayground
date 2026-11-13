/** The stray-drop guard for every form on the `ComposerSheet` chassis (#3135). */
import { useEffect } from "react";

/**
 * The drag began on this page (#3172): only in-page drags fire `dragstart`
 * here. An in-page `<img>` may still be listed under "Files" by Chrome.
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

/** Files dragged in from outside the page (#3077), not an in-page drag (#3172). */
export function isFileDrag(event: DragLike): boolean {
  return carriesFiles(event) && !dragStartedInPage;
}

/** Photos, video or audio (#3172). Empty types (some browsers) read as no. */
const carriesMedia = (event: DragLike) =>
  Array.from(event.dataTransfer?.items ?? []).some(
    (item) => item.kind === "file" && /^(image|video|audio)\//.test(item.type),
  );

/**
 * A file dropped off the Proof control would navigate the browser away from the
 * draft (#3077); this makes it a no-op. Already-handled events are left alone.
 *
 * Misses show a "none" cursor (#3135), except a text file over the body editor
 * (#3172): CodeMirror handles `drop` but not `dragover`, so "none" would block
 * that drop. Media there would be silently discarded, so it gets "none".
 *
 * ponytail: editor found by `.cm-editor`; a new drop target should cancel
 * `dragover` itself like the Proof control, not grow this selector.
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

/** Mounted by `ComposerSheet` and the praxis editor route (needed while loading, #3172). */
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
