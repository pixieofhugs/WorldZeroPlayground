/** Reusable badge chip for feed items (FRIEND, YOUR STUFF, GLOBAL, DUEL, etc.) */
import { hasOwnKey } from '../../utils/hasOwnKey'

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  friend:    { bg: 'var(--badge-friend)',     color: 'var(--color-text-on-accent)' },
  your_stuff: { bg: 'var(--badge-your-stuff)', color: 'var(--color-text-on-accent)' },
  global:    { bg: 'var(--badge-global)',     color: 'var(--color-text-on-accent)' },
  duel:      { bg: 'var(--badge-duel)',       color: 'var(--color-text-on-accent)' },
  collab:    { bg: 'var(--badge-collab)',     color: 'var(--color-text-on-accent)' },
  admin:     { bg: 'var(--badge-admin-bg)',   color: 'var(--badge-admin-text)' },
}

interface FeedBadgeProps {
  type: string
  label?: string
}

export default function FeedBadge({ type, label }: FeedBadgeProps) {
  // Own-property-only (#1821): a bracket read reaches `Object.prototype`, and
  // `??` cannot catch the function it finds, so a `constructor` type painted the
  // chip with `background: undefined` instead of falling through to `global`.
  const style = hasOwnKey(BADGE_STYLES, type) ? BADGE_STYLES[type] : BADGE_STYLES.global
  const text = label ?? type.replace(/_/g, ' ')

  return (
    <span
      style={{
        display: 'inline-block',
        background: style.bg,
        color: style.color,
        fontFamily: "'Courier Prime', monospace",
        fontSize: 'var(--text-md)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: 'var(--space-xs) var(--space-sm)',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
