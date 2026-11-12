import { useId, useRef, type ChangeEvent, type CSSProperties, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Portrait file control for the character screens (#1149).
 *
 * `useAvatarPicker` clears `input.value` on pick (so re-picking the same file
 * still fires `change`), which makes the native "No file chosen" chrome lie to
 * screen readers. So the input is `display: none` and a button plus a
 * `role="status"` line (via `aria-describedby`) report React state instead.
 */

interface PortraitPickerProps {
  /** The picker hook's input handler — validates size, then opens the cropper. */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  /** Cropped file awaiting upload; null if nothing confirmed (incl. a cancelled crop). */
  chosenFile: File | null
  /** True on the edit screen when the character already has a saved portrait. */
  hasCurrentPortrait?: boolean
  /** Avatar-scoped error (over-size, upload failure) — rendered under the row. */
  error?: string
  /** Share the hidden input so another trigger (create's card portrait) can open it. */
  inputRef?: RefObject<HTMLInputElement | null>
  /** Wrapper override, for a surface that owns the surrounding spacing. */
  style?: CSSProperties
  buttonStyle?: CSSProperties
  statusStyle?: CSSProperties
  /**
   * Error ink for grounds the neutral doesn't clear (#2346): `--color-danger` is
   * 3.54:1 on the Ephemerists plate and 3.42:1 on washed na, in light. Archetypes
   * pass their `--faction-{key}-card-alarm` (#1302). Hue stays platform (ADR-0061).
   */
  errorStyle?: CSSProperties
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  flexWrap: 'wrap',
}

/**
 * Reads the `--label-ink` seam, not a global tier (#2489): this mounts on nine
 * grounds, and a frame that repoints the seam reaches it while an inline value
 * could not (#1783, #1819). Archetype `statusStyle` overrides stay: each pairs
 * its own face and ground-specific ink.
 */
const defaultStatusStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--label-ink)',
  // Long filenames wrap rather than push the button off the row.
  minWidth: 0,
  wordBreak: 'break-word',
}

/**
 * Error stays `--color-danger` deliberately (#2489, ADR-0061): danger is the
 * platform speaking. Archetypes pass card-alarm via `errorStyle`; only Edit
 * Character (app page) passes nothing.
 */
const defaultErrorStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-danger)',
  margin: 'var(--space-sm) 0 0',
}

export default function PortraitPicker({
  onChange,
  chosenFile,
  hasCurrentPortrait = false,
  error,
  inputRef,
  style,
  buttonStyle,
  statusStyle,
  errorStyle,
}: PortraitPickerProps) {
  const { t } = useTranslation('forms')
  // Always called, then discarded when the caller supplied its own (hooks order).
  const ownRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? ownRef
  // Generated id: two pickers could share a page.
  const generatedId = useId()
  const statusId = `portrait-status-${generatedId}`

  const statusText = chosenFile
    ? t('portrait.chosen', { name: chosenFile.name })
    : hasCurrentPortrait
      ? t('portrait.keepingCurrent')
      : t('portrait.noneChosen')

  return (
    <div style={style}>
      <div style={rowStyle}>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          aria-describedby={statusId}
          className="btn-outline"
          style={buttonStyle}
        >
          {chosenFile || hasCurrentPortrait ? t('portrait.changeAction') : t('portrait.chooseAction')}
        </button>
        {/* `role="status"` announces a confirmed crop without stealing focus. */}
        <span
          id={statusId}
          role="status"
          className="content-text"
          style={{ ...defaultStatusStyle, ...statusStyle }}
        >
          {statusText}
        </span>
      </div>
      {/* Hidden: removes the stale native chrome from the a11y tree too. */}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={onChange}
        style={{ display: 'none' }}
      />
      {error && (
        <p className="content-text" style={{ ...defaultErrorStyle, ...errorStyle }}>
          {error}
        </p>
      )}
    </div>
  )
}
