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

interface ComposerMedia {
  media: MediaItemOut[];
  /** Seed the tray from a freshly loaded praxis, or from a mode switch. */
  setMedia: (items: MediaItemOut[]) => void;
  fileError: string;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeMedia: (item: MediaItemOut) => Promise<void>;
  /** The file the edit modal is holding, or null when the queue is empty. */
  pendingImage: File | null;
  confirmImageEdit: (blob: Blob) => Promise<void>;
  cancelImageEdit: () => void;
  /**
   * The edit stage could not process the pending image (#1545). A narrow
   * reporter rather than the raw `setFileError`, so the tray's one error line
   * keeps a single owner.
   */
  reportImageError: (reason: string) => void;
}

export function useComposerMedia(
  idParam: string | undefined,
  setError: (message: string) => void,
): ComposerMedia {
  const [media, setMedia] = useState<MediaItemOut[]>([]);
  const [fileError, setFileError] = useState("");
  // Picked images awaiting the edit modal, oldest first (#514).
  const [imageEditQueue, setImageEditQueue] = useState<File[]>([]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      const incoming = Array.from(event.target.files);
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
      event.target.value = "";
      if (!idParam || valid.length === 0) return;
      // Images get the crop/rotate edit stage first (#514); video/audio upload
      // straight through. Uploading immediately keeps a draft's media persisted
      // without a manual save (autosave covers title/body only; #297).
      const { toEdit, toUploadDirect } = partitionByEditability(valid);
      const praxisId = parseInt(idParam, 10);
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
        if (errors.length > 0) setError(errors[errors.length - 1]);
      }
      // Queue images for the modal; they're edited + uploaded one at a time.
      if (toEdit.length > 0) {
        setImageEditQueue((previous) => [...previous, ...toEdit]);
      }
    },
    [idParam, setError],
  );

  // ---- Image edit stage (#514): edit → upload → advance the queue ----
  const pendingImage = imageEditQueue[0] ?? null;

  const confirmImageEdit = useCallback(
    async (blob: Blob) => {
      const current = imageEditQueue[0];
      if (!idParam || !current) return;
      const praxisId = parseInt(idParam, 10);
      const file = blobToFile(blob, current.name);
      try {
        const uploaded = await uploadPraxisMedia(praxisId, file);
        setMedia((previous) => [...previous, uploaded]);
      } catch (err) {
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.upload", { name: current.name }),
          ),
        );
      } finally {
        setImageEditQueue((previous) => previous.slice(1));
      }
    },
    [idParam, imageEditQueue, setError],
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
    async (item: MediaItemOut) => {
      if (!idParam) return;
      try {
        await deletePraxisMedia(parseInt(idParam, 10), item.id);
        setMedia((previous) => previous.filter((m) => m.id !== item.id));
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.removeMedia")),
        );
      }
    },
    [idParam, setError],
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
