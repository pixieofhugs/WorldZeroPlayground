/**
 * THE CHASSIS AND THE ARCHIVE (F2, #1194).
 *
 * The acceptance criteria of the load-bearing frontend issue of epic #1192,
 * each pinned by name. The harness is `renderToStaticMarkup` — no DOM, so no
 * effect runs and no pointer event fires. What that can prove is exactly what
 * matters most here and cannot be checked any other way: WHICH CONTROLS EXIST on
 * which card. The six-second timer and the swipe gesture are asserted at their
 * seams (the strip's two label phases, the commit fraction) rather than driven.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import FeedCardRouter from '../feed/FeedCardRouter'
import FeedUndoStrip from '../feed/FeedUndoStrip'
import FeedBulkArchiveButton from '../feed/FeedBulkArchiveButton'
import { feedKicker, isArchivable, NON_ARCHIVABLE_TYPES } from '../feed/feedItemLabels'
import { normalizeFeedItem } from '../feed/normalizeFeedItem'
import feedCatalog from '../../locales/en/feed.json'
import type { ActivityFeedItem } from '../../api/activityFeed'

/** Every type the backend emits (#1193 seeds one of each in its fixture). */
const ALL_FEED_TYPES = [
  'friend_completion',
  'foe_completion',
  'vote_on_mine',
  'vote_changed_on_mine',
  'foe_taunt',
  'friend_signup',
  'friend_defection',
  'global_task',
  'collaborator_submitted',
  'awaiting_submission',
  'nudge',
  'era_announcement',
  'invitation_letter',
  'duel_challenge',
  'collab_invite',
  'comment_mention',
]

function item(
  type: string,
  payload: Record<string, unknown> = {},
  slug: string | null = 'coven',
): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:1`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: slug,
    actor_avatar_url: null,
    payload,
    context_faction_slug: slug,
  }
}

function render(feedItem: ActivityFeedItem, archivedView = false): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FeedCardRouter item={feedItem} archivedView={archivedView} />
    </MemoryRouter>,
  )
}

const ARCHIVE_LABEL = i18n.t('feed:archive.dismissLabel')
const RESTORE_LABEL = i18n.t('feed:archive.restoreLabel')

/** A payload rich enough for whichever type is asking. */
const FAT_PAYLOAD = {
  character_id: 3,
  praxis_id: 7,
  task_id: 9,
  task_title: 'Reforest the verge',
  task_point_value: 40,
  task_level_required: 2,
  value: 4,
  praxis_title: 'A returned proof',
  praxis_type: 'collab',
  from_character_id: 4,
  from_name: 'Ada',
  to_name: 'Bo',
  faction_slug: 'coven',
  old_faction_slug: 'coven',
  new_faction_slug: 'snide',
  era_name: 'Era One',
  duel_id: 5,
  challenger_praxis_id: 6,
  challenger_character_id: 3,
  invite_id: 8,
  inviter_character_id: 3,
  task_faction_slug: 'coven',
  comment_id: 11,
  excerpt: 'your name came up',
}

describe('the archive control: which cards offer one', () => {
  it('draws an archive control on every archivable type', () => {
    for (const type of ALL_FEED_TYPES) {
      if (NON_ARCHIVABLE_TYPES.has(type)) continue
      expect(render(item(type, FAT_PAYLOAD)), `${type} offers the ✕`).toContain(
        ARCHIVE_LABEL,
      )
    }
  })

  it('draws NO archive control on awaiting_submission, and none disabled', () => {
    // It is state, not an event: it exists exactly while `has_submitted` is
    // false and clears itself the moment you file, so a dismissal would silence
    // a standing obligation forever. The backend 400s on it. Repo convention is
    // to hide a control the player cannot use — never to draw it disabled.
    const html = render(item('awaiting_submission', FAT_PAYLOAD))
    expect(html).not.toContain(ARCHIVE_LABEL)
    expect(html).not.toContain(RESTORE_LABEL)
    expect(html).not.toContain('disabled')
    expect(isArchivable(item('awaiting_submission'))).toBe(false)
  })

  it('offers RESTORE, not archive, in the archived view', () => {
    const html = render(item('friend_completion', FAT_PAYLOAD), true)
    expect(html).toContain(RESTORE_LABEL)
    expect(html).not.toContain(ARCHIVE_LABEL)
  })
})

describe('the chassis', () => {
  it('names every one of the 15 types with a real label, never a raw key', () => {
    for (const type of ALL_FEED_TYPES) {
      const kicker = feedKicker(type)
      expect(kicker, type).not.toContain('feed:')
      expect(kicker, type).not.toContain('kicker.')
      expect(kicker.length, type).toBeGreaterThan(0)
    }
  })

  it('draws the kicker and the timestamp once each, on the chassis', () => {
    const html = render(item('friend_completion', FAT_PAYLOAD))
    const kicker = feedKicker('friend_completion')
    expect(html.split(kicker).length - 1, 'kicker drawn exactly once').toBe(1)
    // The row stopped drawing its own time in #1194 — two timestamps on one card
    // is what that removal fixed.
    expect(html.split('ago').length - 1).toBeLessThanOrEqual(1)
  })

  it('puts the three interactive companions INSIDE the chassis, handlers intact', () => {
    // Epic decision 9. `FeedCardRouter` used to warn that these own real
    // accept/decline handlers that "must NOT collapse into slots"; the chassis
    // takes arbitrary children, so this was a strip-the-wrapper refactor.
    const duel = render(item('duel_challenge', FAT_PAYLOAD))
    expect(duel, 'chassis kicker').toContain(feedKicker('duel_challenge'))
    expect(duel, 'accept survives').toContain(i18n.t('feed:duelChallenge.accept'))
    expect(duel, 'decline survives').toContain(i18n.t('feed:duelChallenge.decline'))

    const collab = render(item('collab_invite', FAT_PAYLOAD))
    expect(collab).toContain(feedKicker('collab_invite'))
    expect(collab, 'accept survives').toContain(i18n.t('feed:collabInvite.accept'))
    expect(collab, 'decline survives').toContain(i18n.t('feed:collabInvite.decline'))

    const letter = render(item('invitation_letter', FAT_PAYLOAD))
    expect(letter).toContain(feedKicker('invitation_letter'))
    expect(letter, 'the letter keeps its way out').toContain(
      i18n.t('feed:invitationLetter.viewFactions'),
    )
  })

  it('leaves era_announcement OUTSIDE the chassis, with only the ✕ added', () => {
    // Epic decision 6: it is the one factionless type and must stay that way. An
    // era turn can strip a player of their faction, so speaking that card in
    // their faction's voice is exactly backwards.
    const html = render(item('era_announcement', FAT_PAYLOAD, null))
    expect(html, 'keeps its own always-dark chrome').toContain('--badge-admin-bg')
    // The chassis's own tint and edge rule. Asserted on the tokens rather than
    // on the kicker's WORD, because the card's own copy says "Era Announcement"
    // and "Era Archive" — the word proves nothing here, the chrome does.
    //
    // The edge half was `not.toContain('card-accent')` until #1148 stopped the
    // chassis painting that ink at all, which left it unable to fail. It names
    // what the chassis draws NOW: a null slug resolves to `default`, so the frame
    // this card must not be wearing would put the vertical spectrum down its left
    // edge. A guard aimed at a token nobody emits is not a guard.
    expect(html, 'no chassis tint').not.toContain('card-bg')
    expect(html, 'no chassis edge rule').not.toContain('--faction-default-rainbow-vertical')
    expect(html, 'gains the ✕').toContain(ARCHIVE_LABEL)
  })

  // REVERSED in #1196, deliberately. This asserted `render(comment_mention) ===
  // ''` — a true description of a bug, pinned as if it were a rule. Every
  // @mention anyone had ever received drew a blank card, and this is the
  // assertion that would have caught it on day one had it been written the other
  // way round. There is now no feed type the backend emits that renders nothing.
  it('draws a real card for every one of the 15 types the backend emits', () => {
    for (const type of ALL_FEED_TYPES) {
      expect(render(item(type, FAT_PAYLOAD)), `${type} renders`).not.toBe('')
    }
  })

  it('gives comment_mention the chassis with no change to the router (#1196)', () => {
    // The seam's first customer: a body in `normalizeFeedItem` and the card
    // inherits the kicker, the timestamp and the ✕ for free.
    const html = render(item('comment_mention', FAT_PAYLOAD))
    expect(html, 'the kicker band').toContain(feedKicker('comment_mention'))
    expect(html, 'the archive route').toContain(ARCHIVE_LABEL)
    expect(html, 'the coven chassis').toContain('--faction-coven')
  })
})

describe('archiving never answers anything (ADR-0070)', () => {
  const stillWaiting = i18n.t('feed:archive.stillWaiting')

  it('tags an archived duel challenge and collab invite "still waiting"', () => {
    expect(render(item('duel_challenge', FAT_PAYLOAD), true)).toContain(stillWaiting)
    expect(render(item('collab_invite', FAT_PAYLOAD), true)).toContain(stillWaiting)
  })

  it('does not tag them in the live feed — their own buttons say it there', () => {
    expect(render(item('duel_challenge', FAT_PAYLOAD))).not.toContain(stillWaiting)
  })

  it('does not tag a plain event, archived or not', () => {
    expect(render(item('friend_completion', FAT_PAYLOAD), true)).not.toContain(
      stillWaiting,
    )
  })

  it('keeps the tag while the request is genuinely pending (ADR-0070)', () => {
    const pending = [
      ['collab_invite', { ...FAT_PAYLOAD, invite_status: 'pending' }],
      ['duel_challenge', { ...FAT_PAYLOAD, duel_status: 'pending' }],
    ] as const
    for (const [type, payload] of pending) {
      expect(render(item(type, payload), true), `${type} pending`).toContain(stillWaiting)
    }
  })

  it('drops the tag once the request WAS answered (#1342)', () => {
    // Archiving still is not an answer — but an answer is. The tag reads the
    // source row's status off the per-type payload key, never the card's
    // session-local response state, which is empty on a fresh archive load.
    const answered = [
      ['collab_invite', 'invite_status', 'accepted'],
      ['collab_invite', 'invite_status', 'declined'],
      // A duel reports 'active' rather than 'accepted' once taken up.
      ['duel_challenge', 'duel_status', 'active'],
      ['duel_challenge', 'duel_status', 'declined'],
    ] as const
    for (const [type, key, status] of answered) {
      const html = render(item(type, { ...FAT_PAYLOAD, [key]: status }), true)
      expect(html, `${type} ${status}`).not.toContain(stillWaiting)
    }
  })
})

describe('the undo strip degrades rather than vanishing', () => {
  const strip = (phase: 'undo' | 'expired', actionLabel: string) =>
    renderToStaticMarkup(
      <FeedUndoStrip
        message={i18n.t('feed:archive.archived', { title: 'Reforest the verge' })}
        actionLabel={actionLabel}
        phase={phase}
        onAct={() => {}}
        error={null}
      />,
    )

  it('reads Archived "{title}" with Undo inside the window', () => {
    const html = strip('undo', i18n.t('feed:archive.undo'))
    expect(html).toContain('Reforest the verge')
    expect(html).toContain(i18n.t('feed:archive.undo'))
  })

  it('offers Restore once the window has lapsed, still standing in the slot', () => {
    // The sheet degrades the slot instead of collapsing it, which keeps the list
    // stable for a reader who looked away.
    const html = strip('expired', i18n.t('feed:archive.restore'))
    expect(html).toContain('Reforest the verge')
    expect(html).toContain(i18n.t('feed:archive.restore'))
    expect(html).toContain('data-feed-undo-strip="expired"')
  })

  it('shows an error in place of the message when the reversal fails', () => {
    const html = renderToStaticMarkup(
      <FeedUndoStrip
        message="Archived “x”"
        actionLabel="Undo"
        phase="undo"
        onAct={() => {}}
        error="Couldn't restore that update."
      />,
    )
    // The apostrophe comes back HTML-escaped, so match the unambiguous tail.
    expect(html).toContain('restore that update.')
    expect(html).not.toContain('Archived')
  })
})

describe('the bulk controls', () => {
  const bulk = (archivedView: boolean) =>
    renderToStaticMarkup(
      <FeedBulkArchiveButton archivedView={archivedView} onAct={() => {}} pending={false} />,
    )

  it('is Archive all on the feed and Restore all in the archive', () => {
    expect(bulk(false)).toContain(i18n.t('feed:archive.archiveAll'))
    expect(bulk(true)).toContain(i18n.t('feed:archive.restoreAll'))
  })

  it('draws them at different weights — a pill vs an underlined text button', () => {
    expect(bulk(false)).toContain('border-radius:999px')
    expect(bulk(true)).toContain('text-decoration:underline')
  })
})

describe('the row action slot (epic §2b)', () => {
  it('offers File it AND Drop out on a collab awaiting submission', () => {
    const row = normalizeFeedItem(
      item('awaiting_submission', { praxis_id: 7, praxis_type: 'collab', task_title: 'x' }),
    )!
    expect(row.actions.map((action) => action.id)).toEqual(['fileIt', 'dropOut'])
  })

  it('offers only File it on a DUEL side — leave_praxis refuses any other type', () => {
    // `leave_praxis` opens with "Only collab memberships can be left.", so on a
    // duel side "Drop out" could only ever 400. Hide it there.
    const row = normalizeFeedItem(
      item('awaiting_submission', { praxis_id: 7, praxis_type: 'duel', task_title: 'x' }),
    )!
    expect(row.actions.map((action) => action.id)).toEqual(['fileIt'])
  })

  it('renders the CTAs inside the card', () => {
    const html = render(
      item('awaiting_submission', { praxis_id: 7, praxis_type: 'collab', task_title: 'x' }),
    )
    expect(html).toContain(i18n.t('feed:rowAction.fileIt'))
    expect(html).toContain(i18n.t('feed:rowAction.dropOut'))
  })

  it('builds no action a payload cannot address', () => {
    const row = normalizeFeedItem(item('awaiting_submission', { task_title: 'x' }))!
    expect(row.actions).toEqual([])
  })
})

describe('the copy is neutral: no faction sheet dialect ships', () => {
  it('carries none of the eight sheets\' archive verbs', () => {
    // The sheets are written in gorgeous per-faction dialect and NONE of it
    // ships (epic #1192, the rule governing every child issue). Faction identity
    // is carried by the skin, not the words.
    const catalog = JSON.stringify(feedCatalog)
    for (const dialect of ['Tuck away', 'Bin it', 'Spike it', 'rm --event', 'Shelve']) {
      expect(catalog, `${dialect} must not ship`).not.toContain(dialect)
    }
  })

  it('says Archive, Restore and Undo in the domain\'s own plain nouns', () => {
    expect(i18n.t('feed:archive.dismiss')).toBe('Archive')
    expect(i18n.t('feed:archive.restore')).toBe('Restore')
    expect(i18n.t('feed:archive.undo')).toBe('Undo')
  })
})
