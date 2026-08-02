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
 * The aspect the crop frame should lock to. A caller-supplied `lockAspect`
 * (e.g. 1 for a square avatar) always wins; otherwise the frame follows the
 * image's natural ratio so nothing is force-cropped (the "free-form" praxis
 * case). Falls back to square before the media reports its size.
 */
export function effectiveAspect(
  lockAspect: number | undefined,
  naturalAspect: number | undefined,
): number {
  if (lockAspect && lockAspect > 0) return lockAspect
  if (naturalAspect && naturalAspect > 0) return naturalAspect
  return 1
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

export interface ApplyImageEditOptions {
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
 * line, #985).
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
