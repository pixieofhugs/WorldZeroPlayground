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
import { useCallback, useState } from "react";
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
 * Extensions the server stores as each kind (`_SAFE_EXTENSIONS` in
 * `backend/services/media.py`); `mediaExtensions.test.ts` pins this to it.
 */
export const MEDIA_EXTENSIONS = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".heic", ".heif", ".bmp"],
  video: [".mp4", ".webm", ".mov", ".m4v", ".ogv"],
  audio: [".mp3", ".m4a", ".aac", ".ogg", ".oga", ".wav", ".flac"],
} as const;

/**
 * The file as the tray takes it, or null if it is not media (#3135, #3172).
 *
 * Judged by the browser's type; a file with none (HEIC in Chrome on Linux and
 * Windows) by its extension, and handed on carrying a type, because the server
 * reads only the declared one. It reads the prefix alone, so `kind/ext` will do.
 */
export function asMedia(file: File): File | null {
  if (file.type) return /^(image|video|audio)\//.test(file.type) ? file : null;
  const extension = /\.[^./\\]+$/.exec(file.name.toLowerCase())?.[0] ?? "";
  for (const [kind, extensions] of Object.entries(MEDIA_EXTENSIONS)) {
    if ((extensions as readonly string[]).includes(extension)) {
      return new File([file], file.name, { type: `${kind}/${extension.slice(1)}` });
    }
  }
  return null;
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

/** One error line, several sentences: a refusal and an edit failure both read. */
export const joinErrors = (previous: string, message: string) =>
  previous ? `${previous} ${message}` : message;

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

  const handleFileChange = useCallback(
    async (incoming: File[]): Promise<MediaOutcome> => {
      // Refused by name, each for its own reason; whatever is left goes up.
      // One error line, so a pick with both kinds in it reads as two sentences.
      const notMedia = incoming.filter((f) => !asMedia(f));
      const media = incoming.flatMap((f) => asMedia(f) ?? []);
      const tooLarge = media.filter((f) => f.size > MAX_FILE_SIZE);
      const refusal = (key: "notMedia" | "fileTooLarge", refused: File[]) =>
        refused.length === 0
          ? []
          : [
              i18n.t(`forms:editPraxis.errors.${key}`, {
                count: refused.length,
                names: refused.map((f) => f.name).join(", "),
              }),
            ];
      setFileError(
        [
          ...refusal("notMedia", notMedia),
          ...refusal("fileTooLarge", tooLarge),
        ].join(" "),
      );
      const valid = media.filter((f) => f.size <= MAX_FILE_SIZE);
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
  // uses, after whatever that pick refused (#3172); the next pick clears it
  // (see `handleFileChange`).
  const reportImageError = useCallback(
    (reason: string) => {
      const message = imageEditFailureMessage(imageEditQueue[0]?.name, reason);
      setFileError((previous) => joinErrors(previous, message));
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
