import { useState } from 'react'
import i18n from '../../i18n'

/**
 * The chassis's dismiss / restore control (Unaffiliated sheet §2a).
 *
 * "Dismissing is a one-tap, no-confirm action" — so this is a plain button with
 * no dialog behind it. It sits DORMANT at 40% opacity and comes up to full on
 * hover **or focus**: the focus half is not decoration, it is the keyboard and
 * screen-reader route to the archive, which swipe alone would not provide.
 *
 * Built once, centrally, and handed to every faction frame as a ready node
 * (`FeedFrameProps.archive`) so eight skins share one accessible control instead
 * of writing eight. It paints in `currentColor`; a frame tints it by setting
 * `color` on whatever it places the node inside.
 */
export default function FeedArchiveButton({
  onAct,
  variant = 'archive',
}: {
  onAct: () => void
  /** `archive` draws the ✕; `restore` draws the archive's take-it-back arrow. */
  variant?: 'archive' | 'restore'
}) {
  const [lit, setLit] = useState(false)
  const label = i18n.t(
    variant === 'restore' ? 'feed:archive.restoreLabel' : 'feed:archive.dismissLabel',
  )

  return (
    <button
      type="button"
      onClick={onAct}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      onFocus={() => setLit(true)}
      onBlur={() => setLit(false)}
      aria-label={label}
      title={label}
      data-feed-archive={variant}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        padding: 'var(--space-xs)',
        cursor: 'pointer',
        color: 'currentColor',
        fontFamily: "'Courier Prime', monospace",
        fontSize: 'var(--text-base)',
        lineHeight: 1,
        opacity: lit ? 1 : 0.4,
        transition: 'opacity 120ms',
      }}
    >
      <span aria-hidden>{variant === 'restore' ? '↺' : '✕'}</span>
    </button>
  )
}
