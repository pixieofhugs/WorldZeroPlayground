/** DOM-free helpers for the image edit stage (#514); canvas drawing is in ImageEditModal.tsx. */
import type { Area, Size } from 'react-easy-crop'

/** Avatars are always 1:1 (#514). */
export const AVATAR_ASPECT = 1

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Bounding box of the rotated image; the canvas is drawn this size so
 * react-easy-crop's bounding-box-relative `croppedAreaPixels` line up.
 */
export function rotateSize(width: number, height: number, rotation: number): Size {
  const rad = toRadians(rotation)
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  }
}

/** Integer pixels: a canvas can't be fractional. */
export function cropOutputSize(cropArea: Pick<Area, 'width' | 'height'>): Size {
  return {
    width: Math.round(cropArea.width),
    height: Math.round(cropArea.height),
  }
}

/**
 * Picker shapes when nothing is locked (#1713). `original` (the default) is the
 * image's own ratio. `9:16` is the one portrait shape (#1968); `3:4` omitted so
 * the row doesn't wrap a sixth button.
 *
 * ponytail: no `free` drag-any-rect choice; react-easy-crop 6.2.2 has no resize
 * handles. Upgrade: swap the cropper, add 'free', return undefined for it in
 * {@link effectiveAspect}.
 */
export const CROP_RATIO_CHOICES = ['original', '1:1', '4:3', '16:9', '9:16'] as const

export type CropRatioChoice = (typeof CROP_RATIO_CHOICES)[number]

export const DEFAULT_CROP_RATIO: CropRatioChoice = 'original'

/** `original` has no fixed aspect; it defers to the image. */
const RATIO_ASPECTS: Readonly<Record<CropRatioChoice, number | undefined>> = {
  original: undefined,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

/** Caller lock wins, then the picked ratio, then natural; square until media loads. */
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

/** Avatars lock {@link AVATAR_ASPECT} and get no picker (#1713). */
export function showsRatioPicker(lockAspect: number | undefined): boolean {
  return !(lockAspect && lockAspect > 0)
}

export function isImageFile(file: { type: string }): boolean {
  return file.type.startsWith('image/')
}

/** Never canvas-encoded (#569). */
export const GIF_MIME_TYPE = 'image/gif'

/** GIFs excluded (#569): canvas encoding keeps only the first frame. */
export function isCropEditableImage(file: { type: string }): boolean {
  return isImageFile(file) && file.type !== GIF_MIME_TYPE
}

/** Crop-editable images vs. direct uploads (video/audio, GIFs); order preserved. */
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

/** "Use original": the untouched File (a File is a Blob). Extracted to test identity. */
export function originalUpload(file: File): Blob {
  return file
}

/** Keep the original base name; a File ("use original") passes through. */
export function blobToFile(blob: Blob, originalName: string): File {
  if (blob instanceof File) return blob
  const extension = blob.type === 'image/png' ? 'png' : 'jpg'
  const base = originalName.replace(/\.[^./\\]+$/, '') || 'image'
  return new File([blob], `${base}.${extension}`, { type: blob.type })
}

/**
 * Why "Apply" failed (#1527); reasons, not copy.
 * - `not-ready`: no object URL or crop rect yet (an undecodable image stays here
 *   forever, since `onCropComplete` never fires).
 * - `render-failed`: no 2d context, `toBlob` null, or the render threw.
 */
export type ApplyFailureReason = 'not-ready' | 'render-failed'

interface ApplyImageEditOptions {
  file: File
  objectUrl: string | null
  cropArea: Area | null
  render: (objectUrl: string, cropArea: Area) => Promise<Blob | null>
  onConfirm: (blob: Blob) => void
  /** Omit and failures upload the untouched file (pre-#1527 behaviour). */
  onFailure?: (reason: ApplyFailureReason) => void
}

/**
 * "Apply" decision, canvas injected for testability. Failures report rather
 * than silently uploading the original (#1527). The GIF short-circuit is not a
 * failure (#569).
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
