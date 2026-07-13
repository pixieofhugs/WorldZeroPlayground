import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
// ticker never renders a half-built entry. Map keys mirror FEED_ITEM_TYPE_*
// in backend/services/activity_feed.py; values are home.json copy keys.
const VERB_KEYS = {
  friend_completion: 'ticker.verbs.friend_completion',
  foe_completion: 'ticker.verbs.foe_completion',
  friend_signup: 'ticker.verbs.friend_signup',
  global_task: 'ticker.verbs.global_task',
  vote_on_mine: 'ticker.verbs.vote_on_mine',
  collab_invite: 'ticker.verbs.collab_invite',
  duel_challenge: 'ticker.verbs.duel_challenge',
  era_announcement: 'ticker.verbs.era_announcement',
} as const

type VerbKey = (typeof VERB_KEYS)[keyof typeof VERB_KEYS]

interface TickerEntry {
  /** null → the system actor ("World Zero") — translated at render time. */
  player: string | null
  verbKey: VerbKey
  subject: string
  faction: string | null
}

function toEntry(item: ActivityFeedItem): TickerEntry | null {
  const verbKey =
    item.type in VERB_KEYS ? VERB_KEYS[item.type as keyof typeof VERB_KEYS] : null
  if (!verbKey) return null
  const subject =
    item.payload?.task_title ??
    item.payload?.title ??
    item.payload?.praxis_title ??
    item.payload?.era_name ??
    ''
  return { player: item.actor_display_name ?? null, verbKey, subject, faction: item.actor_faction_slug }
}

function TickerCard({ entry }: { entry: TickerEntry }) {
  const { t } = useTranslation('home')
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
        {entry.player ?? t('ticker.defaultActor')}
      </div>
      <div
        className="font-body"
        style={{ fontSize: 9, color: 'var(--color-text-tertiary)', lineHeight: 1 }}
      >
        {t(entry.verbKey)}
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
  const { t } = useTranslation('home')
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
          {t('ticker.live')}
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
          <TickerCard key={`${i}-${entry.player ?? 'wz'}`} entry={entry} />
        ))}
      </div>
    </div>
  )
}
