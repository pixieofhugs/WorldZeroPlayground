import { useId, useRef, type ChangeEvent, type CSSProperties, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The portrait file control for the character screens (#1149).
 *
 * Both desktop screens used to render a naked `<input type="file">`, which draws
 * the browser's own "No file chosen" text beside it. That text is a report on the
 * INPUT's `files` list, and {@link useAvatarPicker}'s `handleAvatarChange`
 * deliberately clears it (`event.target.value = ''`) the instant a file arrives —
 * it has to, or re-picking the same path would fire no `change` event and the
 * crop modal would never reopen. So the chrome went on saying "No file chosen"
 * over a portrait that was plainly sitting in the preview: the label was telling
 * the truth about an input we had emptied on purpose, and lying about the state
 * the player cares about.
 *
 * That is an accessibility defect before it is a cosmetic one — a screen reader
 * got told nothing was chosen. So the fix is not to hide the chrome and stop
 * there: the native input goes `display: none` (removing it from the
 * accessibility tree along with its stale label), and a real button plus a live
 * status line take over. The button's accessible name IS its visible text, and
 * the status line — a `role="status"` region the button points at through
 * `aria-describedby` — reads the picker's React state, never `input.files`. What
 * is announced and what is on screen are the same two strings.
 *
 * The mobile skins were never wrong here: they already hid the input behind a
 * photo ring with its own caption. They keep their bespoke ring (each faction
 * owns its archetype) and only gained the accessible name the ring was missing.
 */

interface PortraitPickerProps {
  /** The picker hook's input handler — validates size, then opens the cropper. */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  /**
   * The cropped file awaiting upload, from React state. Null while nothing has
   * been confirmed — including after a pick whose crop was cancelled, which is a
   * genuine "nothing chosen" and reads as one.
   */
  chosenFile: File | null
  /** True on the edit screen when the character already has a saved portrait. */
  hasCurrentPortrait?: boolean
  /** Avatar-scoped error (over-size, upload failure) — rendered under the row. */
  error?: string
  /**
   * Share the hidden input so the surface can open it from elsewhere too — the
   * create screen's credential-card portrait is a second trigger for it. Omit and
   * the control keeps its own.
   */
  inputRef?: RefObject<HTMLInputElement | null>
  /** Wrapper override, for a surface that owns the surrounding spacing. */
  style?: CSSProperties
  buttonStyle?: CSSProperties
  statusStyle?: CSSProperties
  /**
   * The avatar error's ink, for a surface whose ground the neutral does not
   * clear (#2346). Same shape and same reason as `ErrorBanner`'s `style`: the
   * danger hue itself stays the platform's (ADR-0061), but WHICH ink reads on it
   * is a property of the ground, and this control is mounted on eight of them.
   *
   * Measured, because it is the reason this prop exists: `--color-danger` is
   * 3.54:1 on the Ephemerists plate and 3.42:1 on the na page under its
   * backdrop wash, both in light. Each archetype passes its own
   * `--faction-{key}-card-alarm`, which is #1302's shape and clears both.
   *
   * Optional — a caller that passes nothing renders byte-identically to before.
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
 * THE STATUS LINE READS THE LABEL SEAM, NOT THE GLOBAL TIER (#2489).
 *
 * This control is mounted on nine grounds — the eight character-creation
 * archetypes and the neutral Edit Character page — and it used to state
 * `--color-text-secondary` unconditionally. That is a real token at the wrong
 * TIER on eight of the nine, and it is what `local/no-global-ink-on-faction-
 * surface` bans: the rule's own message carries the measurements (2.19:1 on
 * S.N.I.D.E., 2.27 on Singularity, 2.01 on the Ephemerists plate).
 *
 * `--label-ink` is the seam the house already has for exactly this — declared
 * once in `index.css`, unset to the neutral tier, and repointed by any frame
 * that dresses its own root. Reading it means a faction root that repoints the
 * seam now reaches this line, an unrepointed root gets the same neutral it got
 * before, and NOTHING new is minted. It is not a new prop and not a new class:
 * an inline value is precisely what a frame cannot reach past (#1783, #1819).
 *
 * WHAT THIS DOES NOT DO, on purpose. It does not delete the seven archetypes'
 * `statusStyle` overrides. They are not seven restatements of one default —
 * each passes its own FACE as well as its own ink, and the inks differ by
 * ground (UA's `-card-body`, Singularity's `-term-ink`, Everymen's `-quiet`,
 * …), which is §3's "contrast is a pairing" and not duplication. Dropping them
 * in favour of the unset seam would repaint six faction plates with a neutral
 * measured on the app's own page.
 */
const defaultStatusStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--label-ink)',
  // Long filenames wrap rather than push the button off the row.
  minWidth: 0,
  wordBreak: 'break-word',
}

/**
 * The error ink stays `--color-danger`, and that is a decision rather than an
 * oversight (#2489, ADR-0061).
 *
 * Danger is the PLATFORM speaking, not a faction, so the hue is neutral by rule
 * — the tier arm bans `--color-text-*` and says nothing about the functional
 * family, for that reason. What is faction-aware is which ink reads on a given
 * ground, and that is what {@link PortraitPickerProps.errorStyle} is for; all
 * eight character archetypes pass their own `--faction-{key}-card-alarm`
 * through it, `na` included. The one mount that passes nothing is Edit
 * Character, which is app page and where the neutral is the right answer.
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
  // The button's aria-describedby has to point at the status line by id, and two
  // pickers could in principle share a page, so the id is generated.
  const generatedId = useId()
  const statusId = `portrait-status-${generatedId}`

  // One expression, two consumers: the visible line and the button's description.
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
        {/* The state of record. `role="status"` so a confirmed crop is announced
            without stealing focus; the text comes from React, not input.files. */}
        <span
          id={statusId}
          role="status"
          className="content-text"
          style={{ ...defaultStatusStyle, ...statusStyle }}
        >
          {statusText}
        </span>
      </div>
      {/* Hidden, so the browser's stale "no file chosen" chrome is gone from the
          page AND from the accessibility tree. The button above is the control. */}
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
