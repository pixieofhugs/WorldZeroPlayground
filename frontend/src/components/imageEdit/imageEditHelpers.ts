/**
 * Pure helpers for the client-side image edit stage (#514).
 *
 * Everything here is DOM-free so it can be unit-tested without a canvas or
 * jsdom (this repo runs Vitest in the `node` environment — see vite.config.ts).
 * The canvas drawing itself lives in ImageEditModal.tsx; only the geometry and
 * the decision logic it depends on live here.
 */
import type { Area, Size } from 'react-easy-crop'

/** Locked square aspect for avatars — a portrait crop is always 1:1 (#514). */
export const AVATAR_ASPECT = 1

/** Degrees → radians. */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Bounding box of a `width`×`height` image rotated by `rotation` degrees. The
 * cropped-canvas pipeline draws the rotated image into a canvas this size
 * before slicing out the crop rect, so react-easy-crop's `croppedAreaPixels`
 * (which are bounding-box relative) line up.
 */
export function rotateSize(width: number, height: number, rotation: number): Size {
  const rad = toRadians(rotation)
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  }
}

/**
 * The final output canvas dimensions for a crop rect — integer pixels, since a
 * canvas can't be a fractional size. This is the "cropped-canvas pixel rect"
 * the modal renders the confirmed blob at.
 */
export function cropOutputSize(cropArea: Pick<Area, 'width' | 'height'>): Size {
  return {
    width: Math.round(cropArea.width),
    height: Math.round(cropArea.height),
  }
}

/**
 * The crop shapes the ratio picker offers when nothing is locked (#1713).
 * `original` is the image's own ratio — the pre-#1713 behaviour, and still the
 * default, so the picker unlocks rather than changes what you land on.
 *
 * `9:16` is the one taller-than-wide shape (#1968). Until it landed every named
 * choice was square or landscape, so a player cropping a vertical subject — one
 * person standing — out of a square photo had nothing to pick. It is the phone
 * portrait ratio and the exact mirror of `16:9`; `3:4` (the mirror of `4:3`) is
 * deliberately absent, because the ask was for one standard phone shape and a
 * sixth button would wrap the row.
 *
 * ponytail: there is no `free` (drag-any-rectangle) choice. react-easy-crop
 * 6.2.2 — the installed version — takes `aspect` as a plain number with a
 * default and exposes no resize handles, so a user-draggable rect is not in its
 * API at all; its one escape hatch, `cropSize`, is documented "you should
 * probably not use this option" and is still not user-draggable. A free crop
 * therefore needs a different cropper, which is a dependency decision, not this
 * fix. Upgrade path: swap the cropper, then add 'free' here and let
 * {@link effectiveAspect} return undefined for it.
 */
export const CROP_RATIO_CHOICES = ['original', '1:1', '4:3', '16:9', '9:16'] as const

export type CropRatioChoice = (typeof CROP_RATIO_CHOICES)[number]

/** Land on the image's own shape — what every praxis crop did before #1713. */
export const DEFAULT_CROP_RATIO: CropRatioChoice = 'original'

/** The numeric aspect each named ratio locks to. `original` has none — it defers. */
const RATIO_ASPECTS: Readonly<Record<CropRatioChoice, number | undefined>> = {
  original: undefined,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

/**
 * The aspect the crop frame should lock to. A caller-supplied `lockAspect`
 * (e.g. 1 for a square avatar) always wins. Otherwise the player's picked ratio
 * decides, and `original` — the default — follows the image's natural ratio so
 * nothing is force-cropped. Falls back to square before the media reports its
 * size.
 *
 * Before #1713 there was no picked ratio: the frame was the photo's own shape
 * and only ever that, so a 4:3 phone photo could never yield a square.
 */
export function effectiveAspect(
  lockAspect: number | undefined,
  naturalAspect: number | undefined,
  ratioChoice: CropRatioChoice = DEFAULT_CROP_RATIO,
): number {
  if (lockAspect && lockAspect > 0) return lockAspect
  const picked = RATIO_ASPECTS[ratioChoice]
  if (picked && picked > 0) return picked
  if (naturalAspect && naturalAspect > 0) return naturalAspect
  return 1
}

/**
 * Whether the modal offers the ratio picker. Only the call site that locks
 * nothing gets it: avatars pass {@link AVATAR_ASPECT} and stay square, because a
 * non-square avatar would need every avatar frame on the site to cope (#1713).
 */
export function showsRatioPicker(lockAspect: number | undefined): boolean {
  return !(lockAspect && lockAspect > 0)
}

/** True when a picked file is an image — only images get the edit modal. */
export function isImageFile(file: { type: string }): boolean {
  return file.type.startsWith('image/')
}

/**
 * The one format that must never be canvas-encoded (#569) — see
 * {@link isCropEditableImage} and {@link applyImageEdit}.
 */
export const GIF_MIME_TYPE = 'image/gif'

/**
 * True when an image can safely go through the crop/rotate stage. Animated GIFs
 * are excluded (#569): the edit modal canvas-encodes on "Apply", which only ever
 * captures the first frame, so a cropped GIF loses its animation. GIFs upload
 * straight through untouched instead.
 */
export function isCropEditableImage(file: { type: string }): boolean {
  return isImageFile(file) && file.type !== GIF_MIME_TYPE
}

/**
 * Split picked files into the ones that open the edit modal (crop-editable
 * images) and the ones that upload straight through (video/audio, and animated
 * GIFs — see #569). Keeps original order within each bucket so the sequential
 * image queue stays predictable.
 */
export function partitionByEditability<T extends { type: string }>(
  files: readonly T[],
): { toEdit: T[]; toUploadDirect: T[] } {
  const toEdit: T[] = []
  const toUploadDirect: T[] = []
  for (const file of files) {
    if (isCropEditableImage(file)) toEdit.push(file)
    else toUploadDirect.push(file)
  }
  return { toEdit, toUploadDirect }
}

/**
 * "Use original" outcome: the upload is the untouched source File, byte-for-byte
 * (a File already IS a Blob). Extracted so the identity is unit-testable.
 */
export function originalUpload(file: File): Blob {
  return file
}

/**
 * Wrap an edited canvas Blob as an uploadable File, keeping the original base
 * name so the server records a sensible filename. A Blob that is already a File
 * ("use original") passes straight through untouched.
 */
export function blobToFile(blob: Blob, originalName: string): File {
  if (blob instanceof File) return blob
  const extension = blob.type === 'image/png' ? 'png' : 'jpg'
  const base = originalName.replace(/\.[^./\\]+$/, '') || 'image'
  return new File([blob], `${base}.${extension}`, { type: blob.type })
}

/**
 * Why "Apply" could not produce a cropped image (#1527). Reasons, not messages:
 * the copy lives in the i18n catalog, so this stays DOM- and locale-free.
 *
 * - `not-ready` — no object URL or no crop rect yet. The cropper reports the rect
 *   through `onCropComplete`, which only fires once the image has decoded, so an
 *   image the browser cannot decode sits here forever.
 * - `render-failed` — the canvas pipeline gave up: no 2d context, `toBlob`
 *   returned null, or the source image failed to load and the render threw.
 */
export type ApplyFailureReason = 'not-ready' | 'render-failed'

interface ApplyImageEditOptions {
  /** The picked source image. */
  file: File
  /** Object URL backing the cropper, null before the effect has minted it. */
  objectUrl: string | null
  /** The crop rect the cropper last reported, null before it has reported one. */
  cropArea: Area | null
  /** Draw the crop to a canvas and hand back the encoded blob (null on failure). */
  render: (objectUrl: string, cropArea: Area) => Promise<Blob | null>
  /** Hand the upload to the caller — a cropped blob, or the untouched File. */
  onConfirm: (blob: Blob) => void
  /**
   * Report a processing failure. Omit and a failure falls back to uploading the
   * untouched file, which is what every path did before #1527.
   */
  onFailure?: (reason: ApplyFailureReason) => void
}

/**
 * Decide what "Apply" does, with the canvas injected so the decision is testable
 * without a DOM.
 *
 * Before #1527 every one of these branches ended in `onConfirm(originalUpload)`:
 * a file the browser could not process was uploaded untouched, with nothing
 * distinguishing "cropped" from "gave up". The player saw a portrait that never
 * changed and no error anywhere. Failures now report instead of confirming — the
 * caller decides where that shows (the avatar screens use their `avatarError`
 * line, #985; the praxis composer its media tray's `fileError`, #1545).
 *
 * The GIF short-circuit is NOT a failure and keeps its silent pass-through:
 * canvas-encoding a GIF flattens it to its first frame (#569).
 */
export async function applyImageEdit({
  file,
  objectUrl,
  cropArea,
  render,
  onConfirm,
  onFailure,
}: ApplyImageEditOptions): Promise<void> {
  if (file.type === GIF_MIME_TYPE) {
    onConfirm(originalUpload(file))
    return
  }
  const fail = (reason: ApplyFailureReason): void => {
    if (onFailure) onFailure(reason)
    else onConfirm(originalUpload(file))
  }
  if (!objectUrl || !cropArea) {
    fail('not-ready')
    return
  }
  let blob: Blob | null
  try {
    blob = await render(objectUrl, cropArea)
  } catch {
    fail('render-failed')
    return
  }
  if (!blob) {
    fail('render-failed')
    return
  }
  onConfirm(blob)
}
