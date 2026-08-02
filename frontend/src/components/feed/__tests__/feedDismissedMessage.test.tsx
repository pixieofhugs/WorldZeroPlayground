/**
 * WHAT THE UNDO STRIP SAYS AFTER A DISMISSAL (#1458).
 *
 * `feed:invitationLetter.setAside` — "Set aside — the invitation still stands"
 * — was authored by #1421 and read by nothing: #1424 routed the letter's
 * **Not now** through `FeedItemSlot`'s shared strip, which says `Archived
 * "{title}"`. That routing was the right call (one dismiss implementation for
 * eight skins), but the shared line states a decision the player did not make:
 * "Not now" is a deferral and the letter stays valid (ADR-0065/0066). Same
 * class of defect as #1342.
 *
 * The fix is a per-type override, so this pins BOTH halves of it:
 *
 *  1. the override fires for `invitation_letter` and only for it — every other
 *     type still gets the shared archive vocabulary; and
 *  2. `FeedItemSlot` actually asks for it. The harness has no DOM, so the
 *     strip's `phase === 'acted'` branch cannot be reached by clicking — the
 *     wiring is asserted against the source instead. Without that half, a
 *     correct override wired to nothing would pass the first three tests.
 *
 * The strip itself is rendered to prove the sentence survives to markup rather
 * than only existing as a return value.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import FeedUndoStrip from '../FeedUndoStrip'
import { feedDismissedMessage } from '../feedItemLabels'
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

/** The strip's own markup for a given message — what the reader actually sees. */
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

    // The authored line, resolved — not the key echoed back by a missing
    // catalog entry, which would make every assertion below pass vacuously.
    expect(message).not.toBe('feed:invitationLetter.setAside')
    expect(message).toBe(i18n.t('feed:invitationLetter.setAside'))
    expect(message).toMatch(/still stands/i)

    // The point of the issue: the word that read as an answer is gone.
    expect(message).not.toMatch(/archiv/i)

    // ...and it reaches the strip the player is looking at.
    expect(strip(message)).toContain('still stands')
  })

  it('leaves every other type on the shared archive line', () => {
    const message = feedDismissedMessage(NUDGE)

    expect(message).toBe(i18n.t('feed:archive.archived', { title: 'Sweep the yard' }))
    expect(message).toMatch(/^Archived/)
    expect(message).toContain('Sweep the yard')
    expect(strip(message)).toContain('Archived')

    // The override is keyed on one type, not switched on by having a payload.
    expect(feedDismissedMessage(item('duel_challenge'))).toMatch(/^Archived/)
    expect(feedDismissedMessage(item('collab_invite'))).toMatch(/^Archived/)
    expect(feedDismissedMessage(item('era_announcement', { era_name: 'Era Two' }))).toMatch(
      /^Archived/,
    )
  })

  it('overrides the dismissal only — an unknown type still has a line', () => {
    // A type this build has never heard of must not fall through to an empty
    // strip; `feedItemTitle` degrades to the fallback kicker.
    expect(feedDismissedMessage(item('some_future_type'))).toMatch(/^Archived/)
  })
})

describe('the slot asks for it', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../FeedItemSlot.tsx', import.meta.url)),
    'utf8',
  )

  it('builds the dismissal message through the shared override, not inline', () => {
    expect(source).toContain('feedDismissedMessage(item)')
    // The old call site read `i18n.t(archivedView ? 'feed:archive.restored' :
    // 'feed:archive.archived', ...)`. If `feed:archive.archived` is named in
    // this file again, the letter is back on the shared line.
    expect(source).not.toContain('feed:archive.archived')
  })

  it('still restores with one sentence for all fifteen types', () => {
    // Restoring is the same act whatever the type — the row comes back. Only
    // the dismiss direction takes overrides.
    expect(source).toContain("feed:archive.restored")
  })
})
