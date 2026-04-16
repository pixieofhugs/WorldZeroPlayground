import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { factionColor, factionCssVar } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'

interface Props {
  item: ActivityFeedItem
}

export default function FeedCardFoeTaunt({ item }: Props) {
  const { message, trigger_type, from_character_id } = item.payload
  const color = factionColor(item.actor_faction_slug)

  const triggerLabel =
    trigger_type === 'score_overtake' ? 'Score overtake'
    : trigger_type === 'level_up' ? 'Level up'
    : trigger_type === 'praxis_complete' ? 'Completed a task'
    : trigger_type

  return (
    <div
      className="sidebar-card"
      style={{
        background: factionCssVar(item.actor_faction_slug, 'card-bg'),
        borderLeft: `4px solid ${factionCssVar(item.actor_faction_slug, 'card-accent')}`,
        padding: '16px 20px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>&#x1F43A;</span>
        <span
          className="eyebrow"
          style={{ color: 'var(--faction-journeymen)', fontSize: 8 }}
        >
          From Your Foe
        </span>
        <span style={{ margin: '0 2px', color: 'var(--color-text-tertiary)', fontSize: 8 }}>·</span>
        <Link
          to={`/characters/${from_character_id}`}
          className="eyebrow"
          style={{ color, fontSize: 8, textDecoration: 'none' }}
        >
          {item.actor_display_name}
        </Link>
        <span
          className="eyebrow"
          style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)', fontSize: 8 }}
        >
          {relativeTime(item.timestamp)}
        </span>
      </div>

      {/* Taunt quote */}
      <p
        className="font-display italic"
        style={{
          fontSize: 14,
          color: 'var(--color-text-primary)',
          lineHeight: 1.4,
          marginBottom: 8,
        }}
      >
        &ldquo;{message}&rdquo;
      </p>

      {/* Trigger context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', fontSize: 8 }}>
          {triggerLabel}
        </span>
        <span
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--color-danger)',
          }}
        >
          {/* Score comparison would need additional data — placeholder */}
        </span>
      </div>
    </div>
  )
}
