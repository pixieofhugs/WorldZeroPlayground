/**
 * Pure image-edit helpers (#514). No jsdom/canvas in this repo (see
 * vite.config.ts), so we test the geometry + decision logic directly and leave
 * the canvas drawing (ImageEditModal.renderCroppedBlob) to manual/e2e.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  AVATAR_ASPECT,
  CROP_RATIO_CHOICES,
  DEFAULT_CROP_RATIO,
  applyImageEdit,
  blobToFile,
  cropOutputSize,
  effectiveAspect,
  isCropEditableImage,
  isImageFile,
  originalUpload,
  partitionByEditability,
  rotateSize,
  showsRatioPicker,
} from '../imageEditHelpers'
import type { Area } from 'react-easy-crop'

describe('rotateSize — cropped-canvas bounding box', () => {
  it('is unchanged at 0°', () => {
    expect(rotateSize(100, 50, 0)).toEqual({ width: 100, height: 50 })
  })

  it('swaps width/height at 90°', () => {
    const box = rotateSize(100, 50, 90)
    expect(box.width).toBeCloseTo(50)
    expect(box.height).toBeCloseTo(100)
  })

  it('swaps width/height at 270° too', () => {
    const box = rotateSize(100, 50, 270)
    expect(box.width).toBeCloseTo(50)
    expect(box.height).toBeCloseTo(100)
  })

  it('is unchanged at 180°', () => {
    const box = rotateSize(100, 50, 180)
    expect(box.width).toBeCloseTo(100)
    expect(box.height).toBeCloseTo(50)
  })
})

describe('cropOutputSize — final canvas rect', () => {
  it('rounds the crop rect to integer pixels', () => {
    expect(cropOutputSize({ width: 199.4, height: 100.6 })).toEqual({
      width: 199,
      height: 101,
    })
  })

  it('mirrors the crop rect dimensions given whole numbers', () => {
    expect(cropOutputSize({ width: 640, height: 480 })).toEqual({
      width: 640,
      height: 480,
    })
  })
})

describe('effectiveAspect — avatar locks 1:1, praxis picks its ratio', () => {
  it('locks to the avatar aspect even for a wide image', () => {
    expect(effectiveAspect(AVATAR_ASPECT, 1.78)).toBe(1)
  })

  it('AVATAR_ASPECT is square', () => {
    expect(AVATAR_ASPECT).toBe(1)
  })

  it('follows the natural ratio on the default "original" choice', () => {
    expect(effectiveAspect(undefined, 1.5)).toBe(1.5)
    expect(effectiveAspect(undefined, 1.5, DEFAULT_CROP_RATIO)).toBe(1.5)
  })

  it('falls back to square before the media reports its size', () => {
    expect(effectiveAspect(undefined, undefined)).toBe(1)
  })

  /**
   * #1713: the crop frame used to be the photo's own shape and nothing else, so
   * a 4:3 iPhone photo could never yield a square. A picked ratio must beat the
   * natural one.
   */
  it('a picked ratio overrides the photo’s own shape (#1713)', () => {
    const iphonePortrait = 3 / 4
    expect(effectiveAspect(undefined, iphonePortrait, '1:1')).toBe(1)
    expect(effectiveAspect(undefined, iphonePortrait, '4:3')).toBeCloseTo(4 / 3)
    expect(effectiveAspect(undefined, iphonePortrait, '16:9')).toBeCloseTo(16 / 9)
  })

  it('a picked ratio still loses to a caller lock — avatars stay square', () => {
    for (const choice of CROP_RATIO_CHOICES) {
      expect(effectiveAspect(AVATAR_ASPECT, 1.78, choice)).toBe(1)
    }
  })

  it('a picked ratio needs no natural aspect to be usable', () => {
    expect(effectiveAspect(undefined, undefined, '16:9')).toBeCloseTo(16 / 9)
  })

  it('defaults to "original", so today’s behaviour is what you land on', () => {
    expect(DEFAULT_CROP_RATIO).toBe('original')
    expect(CROP_RATIO_CHOICES[0]).toBe('original')
  })
})

describe('showsRatioPicker — only the unlocked (praxis) call site gets it', () => {
  it('shows for praxis media, which supplies no aspect', () => {
    expect(showsRatioPicker(undefined)).toBe(true)
  })

  it('hides for avatars, which lock 1:1 — every avatar frame assumes square', () => {
    expect(showsRatioPicker(AVATAR_ASPECT)).toBe(false)
  })
})

describe('isImageFile / partitionByEditability — which files open the modal', () => {
  it('treats an image file as editable', () => {
    expect(isImageFile({ type: 'image/png' })).toBe(true)
    expect(isImageFile({ type: 'image/jpeg' })).toBe(true)
  })

  it('does not treat video or audio as editable', () => {
    expect(isImageFile({ type: 'video/mp4' })).toBe(false)
    expect(isImageFile({ type: 'audio/mpeg' })).toBe(false)
  })

  it('an image goes to the modal queue, a video uploads directly', () => {
    const image = { type: 'image/png', name: 'shot.png' }
    const video = { type: 'video/mp4', name: 'clip.mp4' }
    const { toEdit, toUploadDirect } = partitionByEditability([image, video])
    expect(toEdit).toEqual([image])
    expect(toUploadDirect).toEqual([video])
  })

  it('a GIF is still an image but is not crop-editable (#569)', () => {
    expect(isImageFile({ type: 'image/gif' })).toBe(true)
    expect(isCropEditableImage({ type: 'image/gif' })).toBe(false)
    expect(isCropEditableImage({ type: 'image/png' })).toBe(true)
  })

  it('a GIF uploads directly (untouched), never entering the crop queue (#569)', () => {
    const gif = { type: 'image/gif', name: 'party.gif' }
    const png = { type: 'image/png', name: 'shot.png' }
    const { toEdit, toUploadDirect } = partitionByEditability([png, gif])
    expect(toEdit).toEqual([png])
    expect(toUploadDirect).toEqual([gif])
  })
})

describe('originalUpload — "use original" returns the source File unchanged', () => {
  it('hands back the exact same File reference', () => {
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    expect(originalUpload(file)).toBe(file)
  })
})

describe('blobToFile — wrapping an edited blob for upload', () => {
  it('passes a File through untouched (the use-original path)', () => {
    const file = new File(['bytes'], 'photo.jpg', { type: 'image/jpeg' })
    expect(blobToFile(file, 'photo.jpg')).toBe(file)
  })

  it('names a jpeg blob from the original base name', () => {
    const blob = new Blob(['bytes'], { type: 'image/jpeg' })
    const file = blobToFile(blob, 'photo.png')
    expect(file.name).toBe('photo.jpg')
    expect(file.type).toBe('image/jpeg')
  })

  it('keeps png lossless with a .png name', () => {
    const blob = new Blob(['bytes'], { type: 'image/png' })
    expect(blobToFile(blob, 'sketch.png').name).toBe('sketch.png')
  })
})

/**
 * #1527: every failing branch of "Apply" used to end in a silent upload of the
 * untouched file. These pin which branches are failures (they report) and which
 * one is a deliberate pass-through (it confirms, silently).
 */
describe('applyImageEdit — a processing failure is reported, not swallowed', () => {
  const CROP_AREA: Area = { x: 0, y: 0, width: 100, height: 100 }
  const OBJECT_URL = 'blob:fake'

  function photo(type = 'image/jpeg'): File {
    return new File(['bytes'], 'photo.jpg', { type })
  }

  function harness(overrides: {
    file?: File
    objectUrl?: string | null
    cropArea?: Area | null
    render?: () => Promise<Blob | null>
    withFailureChannel?: boolean
  }) {
    const onConfirm = vi.fn()
    const onFailure = vi.fn()
    const file = overrides.file ?? photo()
    return {
      file,
      onConfirm,
      onFailure,
      run: () =>
        applyImageEdit({
          file,
          objectUrl: overrides.objectUrl === undefined ? OBJECT_URL : overrides.objectUrl,
          cropArea: overrides.cropArea === undefined ? CROP_AREA : overrides.cropArea,
          render: overrides.render ?? (async () => new Blob(['cropped'], { type: 'image/jpeg' })),
          onConfirm,
          onFailure: overrides.withFailureChannel === false ? undefined : onFailure,
        }),
    }
  }

  it('confirms the rendered blob when the crop succeeds', async () => {
    const cropped = new Blob(['cropped'], { type: 'image/jpeg' })
    const { onConfirm, onFailure, run } = harness({ render: async () => cropped })
    await run()
    expect(onConfirm).toHaveBeenCalledWith(cropped)
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('reports not-ready when the object URL has not been minted yet', async () => {
    const { onConfirm, onFailure, run } = harness({ objectUrl: null })
    await run()
    expect(onFailure).toHaveBeenCalledWith('not-ready')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('reports not-ready when the cropper has reported no crop rect', async () => {
    // The undecodable-image case: onCropComplete never fires, so this stays null.
    const { onConfirm, onFailure, run } = harness({ cropArea: null })
    await run()
    expect(onFailure).toHaveBeenCalledWith('not-ready')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('reports render-failed when the canvas hands back no blob', async () => {
    const { onConfirm, onFailure, run } = harness({ render: async () => null })
    await run()
    expect(onFailure).toHaveBeenCalledWith('render-failed')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('reports render-failed when the render throws (image never decoded)', async () => {
    const { onConfirm, onFailure, run } = harness({
      render: async () => {
        throw new Error('decode failed')
      },
    })
    await run()
    expect(onFailure).toHaveBeenCalledWith('render-failed')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('never uploads the unprocessed file on any failure path', async () => {
    for (const overrides of [
      { objectUrl: null },
      { cropArea: null },
      { render: async () => null },
      {
        render: async () => {
          throw new Error('decode failed')
        },
      },
    ]) {
      const { file, onConfirm, run } = harness(overrides)
      await run()
      expect(onConfirm).not.toHaveBeenCalledWith(file)
    }
  })

  it('keeps the GIF pass-through silent — it is a choice, not a failure (#569)', async () => {
    const gif = new File(['bytes'], 'party.gif', { type: 'image/gif' })
    const render = vi.fn(async () => new Blob(['cropped'], { type: 'image/jpeg' }))
    const { onConfirm, onFailure, run } = harness({ file: gif, render })
    await run()
    expect(onConfirm).toHaveBeenCalledWith(gif)
    expect(onFailure).not.toHaveBeenCalled()
    expect(render).not.toHaveBeenCalled()
  })

  it('falls back to the untouched file when no failure channel is supplied', async () => {
    // Praxis media still mounts the modal without an error line (#1527 scope).
    const { file, onConfirm, run } = harness({
      render: async () => null,
      withFailureChannel: false,
    })
    await run()
    expect(onConfirm).toHaveBeenCalledWith(file)
  })
})
