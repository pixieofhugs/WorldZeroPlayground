/**
 * ImageEditModal (#514) — a client-side edit stage shown before an image is
 * uploaded. Pick an image → preview + crop + rotate + zoom → on Apply the
 * cropped/rotated region is drawn to a canvas and handed back as a Blob, which
 * the caller uploads through the EXISTING upload function. "Use original" skips
 * the canvas entirely and returns the untouched File.
 *
 * "Use original" is the ONLY silent pass-through a player can be given without
 * being told: it is their choice. When processing fails instead, the modal
 * reports through `onError` rather than uploading the unprocessed file behind
 * their back (#1527) — the decision table lives in `applyImageEdit`.
 *
 * One reusable component drives both call sites: praxis media (no locked
 * aspect, so it gets the crop-shape picker — #1713) and character avatars
 * (locked 1:1, no picker: every avatar frame on the site assumes square).
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
  CROP_RATIO_CHOICES,
  DEFAULT_CROP_RATIO,
  applyImageEdit,
  cropOutputSize,
  effectiveAspect,
  originalUpload,
  rotateSize,
  showsRatioPicker,
  toRadians,
} from './imageEditHelpers'
import type { ApplyFailureReason, CropRatioChoice } from './imageEditHelpers'

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
const NO_PAN: Point = { x: 0, y: 0 }

/** Ratio button copy — keys, not strings, so the catalog stays the only text (ADR-0032). */
const RATIO_LABEL_KEY = {
  original: 'imageEdit.ratioOriginal',
  '1:1': 'imageEdit.ratio1x1',
  '4:3': 'imageEdit.ratio4x3',
  '16:9': 'imageEdit.ratio16x9',
  '9:16': 'imageEdit.ratio9x16',
} as const satisfies Record<CropRatioChoice, string>

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
  /**
   * Report a processing failure as a caller-scoped message (#1527). Both call
   * sites pass one, and both land the failure on the line an over-size pick
   * already uses — the character screens their picker's `setAvatarError` (#985),
   * the praxis composer its tray's `fileError` (#1545) — with the modal closing
   * so that line is visible.
   *
   * Still optional, and omitting it still keeps the historical behaviour (the
   * untouched file is uploaded silently), because that is the fallback
   * `applyImageEdit` is written around. No caller relies on it.
   */
  onError?: (message: string) => void
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
  onError,
}: ImageEditModalProps) {
  const { t } = useTranslation('common')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>(NO_PAN)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [rotation, setRotation] = useState(0)
  const [ratioChoice, setRatioChoice] = useState<CropRatioChoice>(DEFAULT_CROP_RATIO)
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

  /**
   * Picking a ratio re-locks the frame. "Original" is also the reset the owner
   * asked for (#1713) — back to the photo's own shape, upright and unzoomed —
   * so it clears zoom, rotation and pan even when it is already selected.
   */
  const pickRatio = (choice: CropRatioChoice) => {
    setRatioChoice(choice)
    if (choice === DEFAULT_CROP_RATIO) {
      setZoom(MIN_ZOOM)
      setRotation(0)
      setCrop(NO_PAN)
    }
  }

  const failureMessage = (reason: ApplyFailureReason): string =>
    reason === 'not-ready' ? t('imageEdit.errorNotReady') : t('imageEdit.errorFailed')

  // A failure reports on the caller's error line and closes, so the message is
  // not hidden behind this overlay (#1527). Without a channel to report on, the
  // helper keeps the old silent pass-through.
  const handleFailure = onError
    ? (reason: ApplyFailureReason) => {
        onError(failureMessage(reason))
        onCancel()
      }
    : undefined

  const handleApply = async () => {
    setApplying(true)
    try {
      await applyImageEdit({
        file,
        objectUrl,
        cropArea: croppedAreaRef.current,
        render: (source, area) => renderCroppedBlob(source, area, rotation, file.type),
        onConfirm,
        onFailure: handleFailure,
      })
    } finally {
      setApplying(false)
    }
  }

  const frameAspect = effectiveAspect(aspect, naturalAspect, ratioChoice)

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

      {/* Crop shape (#1713) — only where nothing is locked. Before this the frame
          was the photo's own ratio and only ever that, so an iPhone's 4:3 could
          never yield a square. Avatars lock 1:1 and show no picker: every avatar
          frame on the site assumes square. */}
      {showsRatioPicker(aspect) && (
        <div style={controlRowStyle}>
          <span style={controlLabelStyle}>{t('imageEdit.ratioLabel')}</span>
          <div role="group" aria-label={t('imageEdit.ratioGroupAria')} style={ratioGroupStyle}>
            {CROP_RATIO_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={choice === ratioChoice}
                aria-label={
                  choice === DEFAULT_CROP_RATIO ? t('imageEdit.ratioOriginalAria') : undefined
                }
                onClick={() => pickRatio(choice)}
                style={choice === ratioChoice ? selectedRatioButtonStyle : ratioButtonStyle}
              >
                {t(RATIO_LABEL_KEY[choice])}
              </button>
            ))}
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
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
  padding: 'var(--space-xl)',
  zIndex: 1000,
  background: 'var(--color-overlay-strong)',
}
const cardStyle: CSSProperties = {
  width: 420,
  maxWidth: '100%',
  boxSizing: 'border-box',
  background: PAPER,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  // §4a asymmetric-inset exception: the tie at 20 rounds DOWN so the shorter
  // bottom inset survives instead of flattening into a uniform box.
  padding: 'var(--space-xl) var(--space-xl) var(--space-lg)',
  boxShadow: '0 18px 46px -14px var(--color-cast-shadow)',
  fontFamily: FONT_BODY,
}
const headingStyle: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontStyle: 'italic',
  fontWeight: 600,
  fontSize: 'var(--text-title)',
  lineHeight: 1.1,
  color: INK,
  margin: '0 0 var(--space-lg)',
}
const cropSurfaceStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 300,
  background: 'var(--color-bg-surface)',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: 'var(--space-lg)',
}
const controlRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  marginBottom: 'var(--space-md)',
}
const controlLabelStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: FAINT,
  flex: 'none',
  width: 56,
}
const ratioGroupStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-sm)',
}
// Same ghost button, tightened to fit beside the label; the group wraps, which
// is what absorbs the fifth (9:16, #1968) on a narrow card.
const ratioButtonStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontSize: 'var(--text-base)',
  padding: 'var(--space-xs) var(--space-md)',
  border: `1px solid ${BORDER}`,
  background: 'transparent',
  color: INK,
  cursor: 'pointer',
}
// Selection reads as the same ink/paper inversion the primary action uses.
const selectedRatioButtonStyle: CSSProperties = {
  ...ratioButtonStyle,
  background: INK,
  color: PAPER,
  fontWeight: 700,
}
const actionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  marginTop: 'var(--space-lg)',
}
const primaryButtonStyle: CSSProperties = {
  flex: 1,
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontSize: 'var(--text-md)',
  fontWeight: 700,
  padding: 'var(--space-sm) var(--space-lg)',
  border: 'none',
  background: INK,
  color: PAPER,
}
const ghostButtonStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontSize: 'var(--text-base)',
  padding: 'var(--space-sm) var(--space-lg)',
  border: `1px solid ${BORDER}`,
  background: 'transparent',
  color: INK,
  cursor: 'pointer',
}
const dismissButtonStyle: CSSProperties = {
  fontFamily: FONT_BODY,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 'var(--text-base)',
  padding: 'var(--space-sm) var(--space-sm)',
  border: 'none',
  background: 'transparent',
  color: MUTED,
  cursor: 'pointer',
}
