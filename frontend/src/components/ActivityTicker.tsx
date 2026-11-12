import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getActivityFeed, type ActivityFeedItem } from '../api/activityFeed'
import { factionCssVar } from '../utils/factions'

/** Homepage activity marquee (logged-in only). Names wear their faction's card font (Style Guide §6). */

// Unlisted types are skipped. Keys mirror FEED_ITEM_TYPE_* in backend/services/activity_feed.py.
const VERB_KEYS = {
  friend_completion: 'ticker.verbs.friend_completion',
  foe_completion: 'ticker.verbs.foe_completion',
  friend_signup: 'ticker.verbs.friend_signup',
  global_task: 'ticker.verbs.global_task',
  vote_on_mine: 'ticker.verbs.vote_on_mine',
  vote_changed_on_mine: 'ticker.verbs.vote_changed_on_mine',
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
  return {
    player: item.actor_display_name,
    verbKey,
    subject,
    faction: item.actor_faction_slug,
  }
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
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
      }}
    >
      <div
        style={{
          fontFamily: factionCssVar(entry.faction, 'card-font'),
          fontSize: 'var(--text-content)',
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
        style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-tertiary)', lineHeight: 1 }}
      >
        {t(entry.verbKey)}
      </div>
      {entry.subject && (
        <div
          className="font-body"
          style={{
            fontSize: 'var(--text-content)',
            // Hue stays on the spine; as ink it fails 4.5:1 (#2108).
            color: 'var(--color-text-secondary)',
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
        padding: 'var(--space-lg) 0',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-xl) 0 var(--space-lg)',
          background:
            'linear-gradient(to right, var(--color-bg-surface-alt) 65%, transparent)',
        }}
      >
        <div
          className="label-heading"
          /* Neutral ink; the hue stays on the dot, a fill (#2108). */
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}
        >
          {/* Motion via CLASS, never inline `animation:`, so reduced-motion can gate it (#2104). */}
          <span
            className="ticker-live-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--faction-coven)',
              display: 'inline-block',
            }}
          />
          {t('ticker.live')}
        </div>
      </div>

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

      {/* Class-driven motion, same as the dot (#2104).
          ponytail: stilled, only the leading cards show; upgrade is
          `overflow-x: auto` on the parent under `prefers-reduced-motion: reduce`. */}
      <div
        className="ticker-roll"
        style={{
          display: 'inline-flex',
          gap: 'var(--space-md)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: clears the LIVE badge + its fade; 64/96 rungs misfit
          paddingLeft: 84,
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
