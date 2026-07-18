/** Reusable badge chip for feed items (FRIEND, YOUR STUFF, GLOBAL, DUEL, etc.) */

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
  const style = BADGE_STYLES[type] ?? BADGE_STYLES.global
  const text = label ?? type.replace(/_/g, ' ')

  return (
    <span
      style={{
        display: 'inline-block',
        background: style.bg,
        color: style.color,
        fontFamily: "'Courier Prime', monospace",
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: '2px 8px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
