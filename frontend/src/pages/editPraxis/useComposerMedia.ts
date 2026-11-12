/**
 * The composer's media tray: pick, edit, upload, remove. A pick uploads at once
 * (#297); images go through the crop/rotate modal first (#514), video/audio in
 * one request (#1286). Keyed on `idParam` so uploads work before the praxis loads.
 *
 * Failures for the shared error line return as a `MediaOutcome` (#2878,
 * `__tests__/composerMediaStandsAlone.test.tsx`); `fileError` is the tray's own.
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
import { settleBatchResults, uploadMediaInChunks } from "./mediaBatchUpload";
import { depsForPraxis, runPick } from "./googlePhotosPick";
import i18n from "../../i18n";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/** Mirrors `_SAFE_EXTENSIONS` in `backend/services/media.py`; pinned by `proofDrop.test.tsx`. */
export const MEDIA_EXTENSIONS = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".heic", ".heif", ".bmp"],
  video: [".mp4", ".webm", ".mov", ".m4v", ".ogv"],
  audio: [".mp3", ".m4a", ".aac", ".ogg", ".oga", ".wav", ".flac"],
} as const;

/**
 * The file as media, or null (#3135, #3172). Typeless files (HEIC in Chrome on
 * Linux/Windows) are judged by extension and given a `kind/ext` type, since the
 * server reads only the declared type's prefix.
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
 * Edit-stage failure line (#1545): the modal's localised reason plus the file
 * name, since the tray edits a queue and "that image" would be ambiguous.
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

/** A pick that ended without photos. */
const pickRefusal = (kind: "expired" | "authFailed" | "authorized" | "popupBlocked") =>
  kind === "expired"
    ? i18n.t("praxis:googlePhotos.expired")
    : kind === "authFailed"
      ? i18n.t("praxis:googlePhotos.authFailed")
      : kind === "authorized"
        ? i18n.t("praxis:googlePhotos.authorized")
        : i18n.t("praxis:googlePhotos.popupBlocked");

/** One error line, several sentences. */
export const joinErrors = (previous: string, message: string) =>
  previous ? `${previous} ${message}` : message;

/** For the shared error line; `unchanged` leaves it as found. Rejected picks go to `fileError`. */
export type MediaOutcome =
  | { kind: "unchanged" }
  | { kind: "failed"; message: string };

const NOTHING_TO_REPORT: MediaOutcome = { kind: "unchanged" };

interface ComposerMedia {
  media: MediaItemOut[];
  setMedia: (items: MediaItemOut[]) => void;
  fileError: string;
  /** Validate and upload browsed or dropped files (#3077). */
  handleFileChange: (incoming: File[]) => Promise<MediaOutcome>;
  removeMedia: (item: MediaItemOut) => Promise<MediaOutcome>;
  /** Google Photos (#559). Call straight from the click: the popup opens before any await. */
  pickFromGooglePhotos: (signal: AbortSignal) => Promise<MediaOutcome>;
  pendingImage: File | null;
  confirmImageEdit: (blob: Blob) => Promise<MediaOutcome>;
  cancelImageEdit: () => void;
  /** Edit stage failed (#1545); narrow so `fileError` keeps one owner. */
  reportImageError: (reason: string) => void;
}

export function useComposerMedia(idParam: string | undefined): ComposerMedia {
  const [media, setMedia] = useState<MediaItemOut[]>([]);
  const [fileError, setFileError] = useState("");
  // Picked images awaiting the edit modal, oldest first (#514).
  const [imageEditQueue, setImageEditQueue] = useState<File[]>([]);

  const handleFileChange = useCallback(
    async (incoming: File[]): Promise<MediaOutcome> => {
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
      const { toEdit, toUploadDirect } = partitionByEditability(valid);
      const praxisId = parseInt(idParam, 10);
      let outcome: MediaOutcome = NOTHING_TO_REPORT;
      if (toUploadDirect.length > 0) {
        // One request for the selection (#1286); tiles land together by design.
        const { uploaded, errors } = await uploadMediaInChunks(
          praxisId,
          toUploadDirect,
        );
        if (uploaded.length > 0) {
          setMedia((previous) => [...previous, ...uploaded]);
        }
        // One error slot: last failure wins.
        if (errors.length > 0) {
          outcome = { kind: "failed", message: errors[errors.length - 1] };
        }
      }
      if (toEdit.length > 0) {
        setImageEditQueue((previous) => [...previous, ...toEdit]);
      }
      return outcome;
    },
    [idParam],
  );

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

  // The modal reports then cancels, so the queue head is the failed file.
  // Appends to the pick's line (#3172); the next pick clears it.
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

  const pickFromGooglePhotos = useCallback(
    async (signal: AbortSignal): Promise<MediaOutcome> => {
      if (!idParam) return NOTHING_TO_REPORT;
      try {
        const picked = await runPick(depsForPraxis(parseInt(idParam, 10)), signal);
        if (picked.kind === "abandoned") return NOTHING_TO_REPORT;
        if (picked.kind !== "ingested") {
          return { kind: "failed", message: pickRefusal(picked.kind) };
        }
        const { uploaded, errors } = settleBatchResults(picked.results);
        if (uploaded.length > 0) setMedia((previous) => [...previous, ...uploaded]);
        return errors.length > 0
          ? { kind: "failed", message: errors[errors.length - 1] }
          : NOTHING_TO_REPORT;
      } catch (err) {
        return { kind: "failed", message: extractError(err, i18n.t("praxis:googlePhotos.failed")) };
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
    pickFromGooglePhotos,
    pendingImage,
    confirmImageEdit,
    cancelImageEdit,
    reportImageError,
  };
}
