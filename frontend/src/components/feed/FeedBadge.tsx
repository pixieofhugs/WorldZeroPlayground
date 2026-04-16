/** Reusable badge chip for feed items (FRIEND, YOUR STUFF, GLOBAL, DUEL, etc.) */

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  friend:    { bg: 'var(--badge-friend)',     color: '#fff' },
  your_stuff: { bg: 'var(--badge-your-stuff)', color: '#fff' },
  global:    { bg: 'var(--badge-global)',     color: '#fff' },
  duel:      { bg: 'var(--badge-duel)',       color: '#fff' },
  collab:    { bg: 'var(--badge-collab)',     color: '#fff' },
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
        fontSize: 8,
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
