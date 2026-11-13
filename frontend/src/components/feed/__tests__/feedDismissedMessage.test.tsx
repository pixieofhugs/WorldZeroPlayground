/**
 * The undo strip's line after a dismissal (#1458): "Not now" on the letter is
 * a deferral (ADR-0070), so it gets `feed:invitationLetter.setAside`, not the
 * shared archive line. Pins the override (letter only) AND that `FeedItemSlot`
 * calls it — the acted branch is unreachable without a DOM, so that half reads
 * the source.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import FeedUndoStrip from '../FeedUndoStrip'
import { feedDismissedMessage, feedItemTitle, feedKicker } from '../feedItemLabels'
import type { ActivityFeedItem } from '../../../api/activityFeed'

function item(type: string, payload: Record<string, unknown> = {}): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:1`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: null,
    actor_avatar_url: null,
    payload,
    context_faction_slug: null,
  }
}

const LETTER = item('invitation_letter', { faction_slug: 'snide' })
const NUDGE = item('nudge', { task_title: 'Sweep the yard' })

function archived(it: ActivityFeedItem): string {
  return i18n.t('feed:archive.archived', { title: feedItemTitle(it) })
}

function strip(message: string): string {
  return renderToStaticMarkup(
    <FeedUndoStrip
      message={message}
      actionLabel={i18n.t('feed:archive.undo')}
      phase="undo"
      onAct={() => {}}
      error={null}
    />,
  )
}

describe('the dismissal line', () => {
  it('gives the invitation letter its own sentence, not "Archived"', () => {
    const message = feedDismissedMessage(LETTER)

    // Resolved, not the key echoed back by a missing entry.
    expect(message).not.toBe('feed:invitationLetter.setAside')
    expect(message).toBe(i18n.t('feed:invitationLetter.setAside'))
    expect(message).toMatch(/still stands/i)

    expect(message).not.toMatch(/archiv/i)

    expect(strip(message)).toContain('still stands')
  })

  it('leaves every other type on the shared archive line', () => {
    const message = feedDismissedMessage(NUDGE)

    expect(message).toBe(i18n.t('feed:archive.archived', { title: 'Sweep the yard' }))
    expect(message).toContain('Sweep the yard')
    expect(message).toContain('Sweep the yard')
    expect(strip(message)).toContain('Sweep the yard')

    expect(feedDismissedMessage(item('duel_challenge'))).toBe(archived(item('duel_challenge')))
    expect(feedDismissedMessage(item('collab_invite'))).toBe(archived(item('collab_invite')))
    const era = item('era_announcement', { era_name: 'Era Two' })
    expect(feedDismissedMessage(era)).toBe(archived(era))
  })

  it('overrides the dismissal only — an unknown type still has a line', () => {
    // An unknown type degrades to the fallback kicker, never an empty strip.
    expect(feedDismissedMessage(item('some_future_type'))).toBe(archived(item('some_future_type')))
  })
})

describe('the slot asks for it', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../FeedItemSlot.tsx', import.meta.url)),
    'utf8',
  )

  it('builds the dismissal message through the shared override, not inline', () => {
    expect(source).toContain('feedDismissedMessage(item)')
    // Naming `feed:archive.archived` here again would put the letter back on the shared line.
    expect(source).not.toContain('feed:archive.archived')
  })

  it('still restores with one sentence for all sixteen types', () => {
    expect(source).toContain("feed:archive.restored")
  })
})

describe('feedItemTitle: an empty title is absent, not a title', () => {
  const bare = { ...item('nudge'), actor_display_name: null } as unknown as ActivityFeedItem
  const withPayload = (payload: Record<string, unknown>) => ({ ...bare, payload })

  it.each(['', '   '])('falls back to the kicker for the title %j', (empty) => {
    expect(feedItemTitle(withPayload({ praxis_title: empty }))).toBe(feedKicker('nudge'))
  })

  it('takes the next non-empty candidate past an empty first one', () => {
    expect(feedItemTitle(withPayload({ task_title: '', praxis_title: 'Proof' }))).toBe('Proof')
  })
})
