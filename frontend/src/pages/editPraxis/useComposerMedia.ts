/**
 * The composer's media tray: pick, edit, upload, remove.
 *
 * Media is the one part of a draft that persists without a save — a picked file
 * uploads the moment it is chosen (#297), because autosave covers title and
 * body only. Images take a detour through the crop/rotate modal first (#514);
 * video and audio go straight up, all of them in one request (#1286).
 *
 * Split out of `useEditPraxis.ts` (#1392). It keys on `idParam` rather than on
 * the loaded praxis, exactly as before: uploading is possible as soon as the
 * route has an id.
 *
 * It borrowed the assembler's `setError` until #2878. It no longer does: the
 * composer's shared error line is not the tray's state, so an action that fails
 * *reports* it as a `MediaOutcome` and `useEditPraxis` writes the line it owns.
 * That is what lets the tray be driven on its own — see
 * `__tests__/composerMediaStandsAlone.test.tsx`. The tray's own `fileError`
 * stays here: a rejected pick never reached the shared line and still doesn't.
 */
import { useCallback, useEffect, useState } from "react";
import {
  deletePraxisMedia,
  uploadPraxisMedia,
  type MediaItemOut,
} from "../../api/praxis";
import {
  blobToFile,
  partitionByEditability,
} from "../../components/imageEdit/imageEditHelpers";
import { extractError } from "../../utils/errors";
import { uploadMediaInChunks } from "./mediaBatchUpload";
import i18n from "../../i18n";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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
 * ponytail: the cursor still reads "copy" over the whole page, because saying
 * "none" here would also switch off CodeMirror's own handling of a dropped text
 * file. If a miss needs to look refused, set `dropEffect` for targets outside
 * the editor — with the drag-over highlight, which is its own issue.
 */
export function refuseStrayFileDrop(event: DragEvent): void {
  if (!event.defaultPrevented && isFileDrag(event)) event.preventDefault();
}

/**
 * The tray's line for an image the edit stage could not process (#1545).
 *
 * The modal supplies the sentence (it is the only party that knows *why*, and
 * the copy is already localised there); this names the file it was holding,
 * because unlike an avatar the tray edits a QUEUE — "that image" is ambiguous
 * once two of three picks have landed as tiles. Naming the file is also what
 * every other file-picker error here does (`fileTooLarge`, `upload`).
 *
 * Pure so the composition is testable without a DOM.
 */
export function imageEditFailureMessage(
  fileName: string | undefined,
  reason: string,
): string {
  if (!fileName) return reason;
  return i18n.t("forms:editPraxis.errors.imageEditFailed", {
    name: fileName,
    reason,
  });
}

/**
 * What a tray action leaves for the composer's shared error line.
 *
 * `unchanged` means there is nothing to print — the tray only ever wrote
 * failures to that line and never cleared it, so it must be left exactly as it
 * was found. A rejected pick is not reported here: that is `fileError`, which
 * is the tray's own.
 */
export type MediaOutcome =
  | { kind: "unchanged" }
  | { kind: "failed"; message: string };

const NOTHING_TO_REPORT: MediaOutcome = { kind: "unchanged" };

interface ComposerMedia {
  media: MediaItemOut[];
  /** Seed the tray from a freshly loaded praxis, or from a mode switch. */
  setMedia: (items: MediaItemOut[]) => void;
  fileError: string;
  /**
   * Validates and uploads files however they arrived — browsed or dropped
   * (#3077). The caller applies the outcome.
   */
  handleFileChange: (incoming: File[]) => Promise<MediaOutcome>;
  removeMedia: (item: MediaItemOut) => Promise<MediaOutcome>;
  /** The file the edit modal is holding, or null when the queue is empty. */
  pendingImage: File | null;
  confirmImageEdit: (blob: Blob) => Promise<MediaOutcome>;
  cancelImageEdit: () => void;
  /**
   * The edit stage could not process the pending image (#1545). A narrow
   * reporter rather than the raw `setFileError`, so the tray's one error line
   * keeps a single owner.
   */
  reportImageError: (reason: string) => void;
}

export function useComposerMedia(idParam: string | undefined): ComposerMedia {
  const [media, setMedia] = useState<MediaItemOut[]>([]);
  const [fileError, setFileError] = useState("");
  // Picked images awaiting the edit modal, oldest first (#514).
  const [imageEditQueue, setImageEditQueue] = useState<File[]>([]);

  // Every composer routes through this hook and the page is one draft, so the
  // window is the one place a missed drop can be caught (#3077) — including in
  // the page margin and on a locked composer, where no Proof control mounts.
  useEffect(() => {
    window.addEventListener("dragover", refuseStrayFileDrop);
    window.addEventListener("drop", refuseStrayFileDrop);
    return () => {
      window.removeEventListener("dragover", refuseStrayFileDrop);
      window.removeEventListener("drop", refuseStrayFileDrop);
    };
  }, []);

  const handleFileChange = useCallback(
    async (incoming: File[]): Promise<MediaOutcome> => {
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
      if (!idParam || valid.length === 0) return NOTHING_TO_REPORT;
      // Images get the crop/rotate edit stage first (#514); video/audio upload
      // straight through. Uploading immediately keeps a draft's media persisted
      // without a manual save (autosave covers title/body only; #297).
      const { toEdit, toUploadDirect } = partitionByEditability(valid);
      const praxisId = parseInt(idParam, 10);
      let outcome: MediaOutcome = NOTHING_TO_REPORT;
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
        if (errors.length > 0) {
          outcome = { kind: "failed", message: errors[errors.length - 1] };
        }
      }
      // Queue images for the modal; they're edited + uploaded one at a time.
      if (toEdit.length > 0) {
        setImageEditQueue((previous) => [...previous, ...toEdit]);
      }
      return outcome;
    },
    [idParam],
  );

  // ---- Image edit stage (#514): edit → upload → advance the queue ----
  const pendingImage = imageEditQueue[0] ?? null;

  const confirmImageEdit = useCallback(
    async (blob: Blob): Promise<MediaOutcome> => {
      const current = imageEditQueue[0];
      if (!idParam || !current) return NOTHING_TO_REPORT;
      const praxisId = parseInt(idParam, 10);
      const file = blobToFile(blob, current.name);
      try {
        const uploaded = await uploadPraxisMedia(praxisId, file);
        setMedia((previous) => [...previous, uploaded]);
        return NOTHING_TO_REPORT;
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.upload", { name: current.name }),
          ),
        };
      } finally {
        setImageEditQueue((previous) => previous.slice(1));
      }
    },
    [idParam, imageEditQueue],
  );

  const cancelImageEdit = useCallback(() => {
    setImageEditQueue((previous) => previous.slice(1));
  }, []);

  // The modal reports here and then cancels, so the queue head is still the
  // file that failed when this runs. Lands on the same line a rejected pick
  // uses, which the next pick clears (see `handleFileChange`).
  const reportImageError = useCallback(
    (reason: string) => {
      setFileError(imageEditFailureMessage(imageEditQueue[0]?.name, reason));
    },
    [imageEditQueue],
  );

  const removeMedia = useCallback(
    async (item: MediaItemOut): Promise<MediaOutcome> => {
      if (!idParam) return NOTHING_TO_REPORT;
      try {
        await deletePraxisMedia(parseInt(idParam, 10), item.id);
        setMedia((previous) => previous.filter((m) => m.id !== item.id));
        return NOTHING_TO_REPORT;
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.removeMedia"),
          ),
        };
      }
    },
    [idParam],
  );

  return {
    media,
    setMedia,
    fileError,
    handleFileChange,
    removeMedia,
    pendingImage,
    confirmImageEdit,
    cancelImageEdit,
    reportImageError,
  };
}
