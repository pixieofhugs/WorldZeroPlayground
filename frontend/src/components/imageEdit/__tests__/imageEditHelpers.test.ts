/**
 * Pure image-edit helpers (#514). No jsdom/canvas in this repo (see
 * vite.config.ts), so we test the geometry + decision logic directly and leave
 * the canvas drawing (ImageEditModal.renderCroppedBlob) to manual/e2e.
 */
import { describe, it, expect } from 'vitest'
import {
  AVATAR_ASPECT,
  blobToFile,
  cropOutputSize,
  effectiveAspect,
  isCropEditableImage,
  isImageFile,
  originalUpload,
  partitionByEditability,
  rotateSize,
} from '../imageEditHelpers'

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

describe('effectiveAspect — avatar locks 1:1, praxis is free-form', () => {
  it('locks to the avatar aspect even for a wide image', () => {
    expect(effectiveAspect(AVATAR_ASPECT, 1.78)).toBe(1)
  })

  it('AVATAR_ASPECT is square', () => {
    expect(AVATAR_ASPECT).toBe(1)
  })

  it('follows the natural ratio when unlocked (free-form praxis)', () => {
    expect(effectiveAspect(undefined, 1.5)).toBe(1.5)
  })

  it('falls back to square before the media reports its size', () => {
    expect(effectiveAspect(undefined, undefined)).toBe(1)
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
