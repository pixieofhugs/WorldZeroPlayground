import type { CSSProperties } from 'react'

/**
 * The count of unanswered obligations, drawn as the one badge shape the app has.
 *
 * Extracted at #1457, when the same fifteen-pixel pill acquired its third and
 * fourth call site — the mobile bell, the desktop sidebar handle (in BOTH
 * states now), and NavBar's `Updates` link. Four hand-copies of the same
 * geometry is four places for it to drift apart, and a badge that means "there
 * are three things waiting on you" has to look identical everywhere or it stops
 * reading as one fact about one queue.
 *
 * DECORATIVE BY CONTRACT. This is `aria-hidden` and carries its meaning in
 * colour and position, so the count MUST also reach assistive tech through the
 * accessible name of whatever interactive element wraps it — every caller does
 * that with an `aria-label`, and a caller that forgets shows the number to
 * sighted users only.
 *
 * Renders nothing at zero, so callers need no `count > 0 &&` guard of their own.
 * That is deliberate: the guard is the thing most easily forgotten in a fifth
 * copy, and "0 waiting" must never draw a badge.
 */
const BADGE_STYLE: CSSProperties = {
  minWidth: 15,
  height: 15,
  padding: '0 var(--space-xs)',
  borderRadius: 999,
  fontSize: 'var(--text-md)',
  fontWeight: 700,
  lineHeight: 1,
  color: 'var(--color-text-on-accent)',
  background: 'var(--badge-collab)',
}

interface PendingBadgeProps {
  readonly count: number
  /** Positioning only — the mobile bell pins its badge over the icon. */
  readonly className?: string
  /** Positioning offsets only; the badge owns its own colour, size and type. */
  readonly style?: CSSProperties
}

export default function PendingBadge({ count, className, style }: PendingBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      aria-hidden="true"
      // The space before `${` is load-bearing (#2918): Tailwind v4's scanner
      // drops a utility glued to an interpolation, and `font-body` survived
      // that only because it is written unglued elsewhere in the tree.
      className={`flex items-center justify-center font-body ${className ?? ''}`}
      style={style ? { ...BADGE_STYLE, ...style } : BADGE_STYLE}
    >
      {count}
    </span>
  )
}
