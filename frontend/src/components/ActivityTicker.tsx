import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getActivityFeed, type ActivityFeedItem } from '../api/activityFeed'
import { factionCssVar } from '../utils/factions'

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
        padding: 'var(--space-lg) 0',
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
          padding: '0 var(--space-xl) 0 var(--space-lg)',
          background:
            'linear-gradient(to right, var(--color-bg-surface-alt) 65%, transparent)',
        }}
      >
        <div
          className="label-heading"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--faction-coven)' }}
        >
          {/* The blink is a CLASS, never an inline `animation:` — a style
              attribute is not in a stylesheet, so nothing can wrap it in the
              reduced-motion gate and the dot pulsed forever for a reader who
              asked for none (#2104). Geometry stays inline; only the motion
              travels. Stilled, the dot is still drawn and the word LIVE beside
              it carries the meaning on its own. */}
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
      {/* Same reason as the dot, and the louder half of it: a 90s infinite
          translate on the homepage is exactly what someone sets the preference
          to stop, and an inline `animation:` ran it regardless (#2104).
          ponytail: stilled, the strip shows its leading cards and no more —
          the marquee is the only way to reach the rest of them. That is the
          state a reduced-motion reader now gets, and the full list is a click
          away on the activity feed. If it ever needs to be reachable without
          motion, the upgrade is `overflow-x: auto` on the clipping parent
          under `prefers-reduced-motion: reduce`, not an ungated animation. */}
      <div
        className="ticker-roll"
        style={{
          display: 'inline-flex',
          gap: 'var(--space-md)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: clears the absolutely-positioned LIVE badge + its gradient mask; the nearest rungs (64/96) either tuck the first card under the badge or leave a visible hole.
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
