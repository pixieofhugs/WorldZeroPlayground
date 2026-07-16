/**
 * ImageEditModal (#514) — a client-side edit stage shown before an image is
 * uploaded. Pick an image → preview + crop + rotate + zoom → on Apply the
 * cropped/rotated region is drawn to a canvas and handed back as a Blob, which
 * the caller uploads through the EXISTING upload function. "Use original" skips
 * the canvas entirely and returns the untouched File.
 *
 * One reusable component drives both call sites: praxis media (free-form frame
 * that follows the image's natural ratio) and character avatars (locked 1:1).
 *
 * Modal chrome mirrors LevelUpPopup / InvitationLetterPopup: fixed radial-dim
 * overlay, role="dialog", Escape closes, the primary action autofocuses, no
 * focus trap. No literal hex — CSS vars only (CLAUDE.md).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, MediaSize, Point } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import {
  cropOutputSize,
  effectiveAspect,
  originalUpload,
  rotateSize,
  toRadians,
} from './imageEditHelpers'

const PAPER = 'var(--color-bg-page)'
const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const FAINT = 'var(--color-text-tertiary)'
const BORDER = 'var(--color-border-strong)'
const FONT_DISPLAY = 'var(--font-display)'
const FONT_BODY = 'var(--font-body)'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.01
const ROTATE_STEP = 90

export interface ImageEditModalProps {
  /** The picked source image. */
  file: File
  /**
   * Locked crop aspect (e.g. 1 for a square avatar). Omit for free-form: the
   * frame follows the image's natural ratio and the user adjusts by zoom/pan.
   */
  aspect?: number
  /** Receives the edited image (or the original File, via "use original"). */
  onConfirm: (blob: Blob) => void
  /** Dismiss without uploading. */
  onCancel: () => void
}

/** Load an <img> from an object URL (canvas source). Not unit-tested (needs DOM). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (event) => reject(event))
    image.src = src
  })
}

/**
 * Draw the rotated image into a bounding-box canvas, slice out the crop rect,
 * and return it as a Blob. Uses the pure geometry helpers so the sizing math is
 * tested independently of the canvas. Not itself unit-tested (needs a canvas).
 */
async function renderCroppedBlob(
  src: string,
  cropArea: Area,
  rotation: number,
  mimeType: string,
): Promise<Blob | null> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return null

  const boundingBox = rotateSize(image.width, image.height, rotation)
  canvas.width = boundingBox.width
  canvas.height = boundingBox.height

  // Rotate around the bounding-box centre, then draw the image centred.
  context.translate(boundingBox.width / 2, boundingBox.height / 2)
  context.rotate(toRadians(rotation))
  context.translate(-image.width / 2, -image.height / 2)
  context.drawImage(image, 0, 0)

  // croppedAreaPixels are bounding-box relative — lift that region out.
  const region = context.getImageData(
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
  )
  const output = cropOutputSize(cropArea)
  canvas.width = output.width
  canvas.height = output.height
  context.putImageData(region, 0, 0)

  // Keep PNG lossless; everything else (photos) exports as JPEG.
  const outType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), outType, 0.92)
  })
}

export default function ImageEditModal({
  file,
  aspect,
  onConfirm,
  onCancel,
}: ImageEditModalProps) {
  const { t } = useTranslation('common')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [rotation, setRotation] = useState(0)
  const [naturalAspect, setNaturalAspect] = useState<number | undefined>(undefined)
  const [applying, setApplying] = useState(false)
  const croppedAreaRef = useRef<Area | null>(null)

  // Object URL for the Cropper source; revoked on unmount / file change.
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    croppedAreaRef.current = areaPixels
  }, [])

  const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
    if (mediaSize.naturalHeight > 0) {
      setNaturalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight)
    }
  }, [])

  const rotateBy = (delta: number) =>
    setRotation((previous) => (previous + delta + 360) % 360)

  const handleApply = async () => {
    // Belt-and-suspenders for #569: a GIF should never be canvas-encoded (that
    // flattens it to its first frame), so short-circuit to the untouched file.
    if (file.type === 'image/gif') {
      onConfirm(originalUpload(file))
      return
    }
    const area = croppedAreaRef.current
    if (!objectUrl || !area) {
      // Nothing to slice yet — fall back to the untouched file.
      onConfirm(originalUpload(file))
      return
    }
    setApplying(true)
    try {
      const blob = await renderCroppedBlob(objectUrl, area, rotation, file.type)
      onConfirm(blob ?? originalUpload(file))
    } catch {
      onConfirm(originalUpload(file))
    } finally {
      setApplying(false)
    }
  }

  const frameAspect = effectiveAspect(aspect, naturalAspect)

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('imageEdit.dialogAria')}
      style={cardStyle}
    >
      <h2 style={headingStyle}>{t('imageEdit.heading')}</h2>

      {/* Crop surface — react-easy-crop fills this absolutely-positioned box. */}
      <div style={cropSurfaceStyle}>
        {objectUrl && (
          <Cropper
            image={objectUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={frameAspect}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
          />
        )}
      </div>

      {/* Zoom */}
      <label style={controlRowStyle}>
        <span style={controlLabelStyle}>{t('imageEdit.zoomLabel')}</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={zoom}
          aria-label={t('imageEdit.zoomLabel')}
          onChange={(event) => setZoom(Number(event.target.value))}
          style={{ flex: 1 }}
        />
      </label>

      {/* Rotate — 90° steps cover sideways phone photos. */}
      <div style={controlRowStyle}>
        <span style={controlLabelStyle}>{t('imageEdit.rotateLabel')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => rotateBy(-ROTATE_STEP)} style={ghostButtonStyle}>
            {t('imageEdit.rotateLeft')}
          </button>
          <button type="button" onClick={() => rotateBy(ROTATE_STEP)} style={ghostButtonStyle}>
            {t('imageEdit.rotateRight')}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={actionRowStyle}>
        <button
          type="button"
          autoFocus
          onClick={() => void handleApply()}
          disabled={applying}
          style={{ ...primaryButtonStyle, cursor: applying ? 'wait' : 'pointer' }}
        >
          {applying ? t('imageEdit.applying') : t('imageEdit.apply')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(originalUpload(file))}
          disabled={applying}
          style={ghostButtonStyle}
        >
          {t('imageEdit.useOriginal')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={applying}
          style={dismissButtonStyle}
        >
          {t('imageEdit.cancel')}
        </button>
      </div>
    </div>
  )

  return (
    <div onClick={onCancel} style={overlayStyle}>
      <div onClick={(event) => event.stopPropagation()}>{card}</div>
    </div>
  )
}

// --- styles (token-driven) --------------------------------------------------

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 1000,
  background: 'radial-gradient(ellipse at 50% 42%, rgba(26,18,9,0.30), rgba(26,18,9,0.66))',
}
const cardStyle: CSSProperties = {
  width: 420,
  maxWidth: '100%',
  boxSizing: 'border-box',
  background: PAPER,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: '24px 24px 20px',
  boxShadow: '0 18px 46px -14px rgba(26,18,9,0.5)',
  fontFamily: FONT_BODY,
}
const headingStyle: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontStyle: 'italic',
  fontWeight: 600,
  fontSize: 22,
  lineHeight: 1.1,
  color: INK,
  margin: '0 0 16px',
}
const cropSurfaceStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 300,
  background: 'var(--color-bg-surface)',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: 16,
}
const controlRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
}
const controlLabelStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: 9,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: FAINT,
  flex: 'none',
  width: 56,
}
const actionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 18,
}
const primaryButtonStyle: CSSProperties = {
  flex: 1,
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontSize: 11,
  fontWeight: 700,
  padding: '0.6rem 1.2rem',
  border: 'none',
  background: INK,
  color: PAPER,
}
const ghostButtonStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontSize: 10,
  padding: '0.5rem 0.9rem',
  border: `1px solid ${BORDER}`,
  background: 'transparent',
  color: INK,
  cursor: 'pointer',
}
const dismissButtonStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 10,
  padding: '0.5rem 0.6rem',
  border: 'none',
  background: 'transparent',
  color: MUTED,
  cursor: 'pointer',
}
