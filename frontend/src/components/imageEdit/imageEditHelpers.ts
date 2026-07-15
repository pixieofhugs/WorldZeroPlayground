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
 * Split picked files into the ones that open the edit modal (images) and the
 * ones that upload straight through (video/audio). Keeps original order within
 * each bucket so the sequential image queue stays predictable.
 */
export function partitionByEditability<T extends { type: string }>(
  files: readonly T[],
): { toEdit: T[]; toUploadDirect: T[] } {
  const toEdit: T[] = []
  const toUploadDirect: T[] = []
  for (const file of files) {
    if (isImageFile(file)) toEdit.push(file)
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
