import { useEffect, useState } from 'react'
import { getActivityFeed, type ActivityFeedItem } from '../../api/activityFeed'
import { factionCssVar } from '../../utils/factions'

/**
 * Live activity marquee for the homepage hero area.
 *
 * Logged-in only — the /activity-feed endpoint requires auth. Each player's
 * name renders in their faction's display font (the card-font CSS var), so the
 * strip reads as a collage of faction identities scrolling past, echoing the
 * faction-card aesthetic (Style Guide §6).
 */

// Feed types we know how to phrase. Anything not listed is skipped so the
// ticker never renders a half-built entry. Values mirror FEED_ITEM_TYPE_* in
// backend/services/activity_feed.py.
const VERBS: Record<string, string> = {
  friend_completion: 'completed',
  foe_completion: 'completed',
  friend_signup: 'signed up for',
  global_task: 'new task',
  vote_on_mine: 'voted on',
  collab_invite: 'started a collab on',
  duel_challenge: 'challenged a duel on',
  era_announcement: 'new era',
}

interface TickerEntry {
  player: string
  verb: string
  subject: string
  faction: string | null
}

function toEntry(item: ActivityFeedItem): TickerEntry | null {
  const verb = VERBS[item.type]
  if (!verb) return null
  const player = item.actor_display_name ?? 'World Zero'
  const subject =
    item.payload?.task_title ??
    item.payload?.title ??
    item.payload?.praxis_title ??
    item.payload?.era_name ??
    ''
  return { player, verb, subject, faction: item.actor_faction_slug }
}

function TickerCard({ entry }: { entry: TickerEntry }) {
  const accent = factionCssVar(entry.faction)
  return (
    <div
      style={{
        flexShrink: 0,
        width: 236,
        background: 'var(--color-bg-surface)',
        borderLeft: `3px solid ${accent}`,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: factionCssVar(entry.faction, 'card-font'),
          fontSize: 17,
          color: 'var(--color-text-primary)',
          lineHeight: 1.05,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {entry.player}
      </div>
      <div
        className="font-body"
        style={{ fontSize: 9, color: 'var(--color-text-tertiary)', lineHeight: 1 }}
      >
        {entry.verb}
      </div>
      {entry.subject && (
        <div
          className="font-body"
          style={{
            fontSize: 10,
            color: accent,
            fontStyle: 'italic',
            lineHeight: 1.25,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {entry.subject}
        </div>
      )}
    </div>
  )
}

export default function ActivityTicker() {
  const [entries, setEntries] = useState<TickerEntry[]>([])

  useEffect(() => {
    getActivityFeed({ filter: 'all', limit: 20 })
      .then((res) => {
        const mapped = res.items
          .map((item) => toEntry(item))
          .filter((e): e is TickerEntry => e !== null)
        setEntries(mapped)
      })
      .catch(() => setEntries([]))
  }, [])

  if (entries.length === 0) return null

  // Duplicate so the -50% translate loops seamlessly.
  const doubled = [...entries, ...entries]

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-bg-surface-alt)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 0',
      }}
    >
      {/* LIVE badge — fades into the strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          padding: '0 22px 0 18px',
          background:
            'linear-gradient(to right, var(--color-bg-surface-alt) 65%, transparent)',
        }}
      >
        <div
          className="eyebrow"
          style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--faction-wow)' }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--faction-wow)',
              display: 'inline-block',
              animation: 'wz-blink 1.4s ease-in-out infinite',
            }}
          />
          Live
        </div>
      </div>

      {/* Right-edge fade */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 80,
          zIndex: 3,
          background: 'linear-gradient(to left, var(--color-bg-surface-alt), transparent)',
        }}
      />

      {/* Scrolling row */}
      <div
        style={{
          display: 'inline-flex',
          gap: 10,
          paddingLeft: 84,
          animation: 'ticker-roll 90s linear infinite',
          willChange: 'transform',
        }}
      >
        {doubled.map((entry, i) => (
          <TickerCard key={`${i}-${entry.player}`} entry={entry} />
        ))}
      </div>
    </div>
  )
}
