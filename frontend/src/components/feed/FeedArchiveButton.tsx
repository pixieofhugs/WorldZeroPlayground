import { useState } from 'react'
import i18n from '../../i18n'

/**
 * The chassis's dismiss / restore control: one-tap, no confirm. Built once and
 * handed to every frame as `FeedFrameProps.archive`; it paints in `currentColor`,
 * so a frame tints it by setting `color` on its container.
 *
 * Full-strength ink, never dimmed (#2091): at 40% opacity nine of fourteen band
 * pairings failed WCAG 1.4.11's 3:1; at 100% all clear even 4.5:1
 * (`__tests__/feedArchiveControl.test.tsx` re-measures them). Hover/focus — the
 * keyboard route to archive — lifts a wash of the ink instead (worst 3.78:1).
 * The `currentColor` hairline box makes the ✕ read as a control. 44px target (§6,
 * #2100); bands size to fit it.
 */
/**
 * The hover/focus wash as a % of the control's ink. Exported so the test measures
 * the lit state without restating the number.
 */
export const LIT_WASH_PCT = 12

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
        // The drawn square's own box, raw px off the --space-* ramp (§4a).
        boxSizing: 'border-box',
        minWidth: 44,
        minHeight: 44,
        background: lit
          ? `color-mix(in srgb, currentColor ${LIT_WASH_PCT}%, transparent)`
          : 'transparent',
        border: '1px solid currentColor',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-xs)',
        cursor: 'pointer',
        color: 'currentColor',
        fontFamily: "var(--font-body)",
        // Same tier as the timestamp beside it (#2091).
        fontSize: 'var(--text-lg)',
        lineHeight: 1,
        transition: 'background-color 120ms',
      }}
    >
      <span aria-hidden>{variant === 'restore' ? '↺' : '✕'}</span>
    </button>
  )
}
