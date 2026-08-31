import type { ParseKeys } from 'i18next'
import type { components } from '../../api/generated/schema'

/**
 * The Notifications section's whole logic (#1047), kept out of the component.
 *
 * The repo's harness is `renderToStaticMarkup` with no DOM and no effects, so
 * a rule that lives inside a click handler is a rule nothing can assert. Every
 * question this card answers — which cell is lit, what a click writes, whether
 * the master row's thumb shows — is a pure function of the fetched state and
 * is answered here. Same posture as `updatesFilters.ts` and
 * `requestsQueueCursor.ts`.
 *
 * ## Two switches per row, and they are not the same kind of thing
 *
 * `page` ("show on Updates") is **live behaviour**: the server drops the type
 * out of the feed, the tab counts and the sidebar panel together
 * (`services/notification_prefs.muted_feed_types`).
 *
 * `email` ("email me") is **stored intent only**. Nothing in `backend/` sends
 * email — no provider, no sender, no queue, no template layer. The switch is
 * real, the value is stored, and #2164 honours it when the channel goes live;
 * the card says so in one line of copy, which is the only thing that makes a
 * switch for an absent channel honest rather than the false affordance #1263
 * named. Do not add a sender to make this "work".
 *
 * ## `locked` comes down the wire and is never derived here
 *
 * The rule behind it is requests-section membership, and that set is derived
 * from `FEED_SOURCES` server-side. A second derivation on this side is exactly
 * how a tenth request type gets silently unlocked, so the client is told.
 */

type NotificationPrefOut = components['schemas']['NotificationPrefOut']

export type PrefAxis = 'page' | 'email'

/** The server's answer: every row, resolved, keyed by event. */
export type NotificationPrefs = Readonly<Record<string, NotificationPrefOut>>

export interface NotificationRow {
  /** The event key — matches the server's registry and the stored JSONB key. */
  readonly key: string
  readonly titleKey: ParseKeys<'common'>
  readonly helpKey: ParseKeys<'common'>
}

/**
 * The nine rows, in the order the card draws them, with their copy.
 *
 * Catalog keys are written out rather than built from `key`. A
 * template-literal key typechecks against nothing and is invisible to a locale
 * grep — the same rule `SETTINGS_SECTIONS` and `CookiesSection` already keep.
 *
 * The ORDER is this list's; the VALUES are the server's. A row the server does
 * not know is not drawn (see {@link rowsFor}) rather than drawn with invented
 * state — `__tests__/notificationPrefs.test.tsx` pins the two lists together
 * against the Python registry so that can never happen silently.
 */
export const NOTIFICATION_ROWS: readonly NotificationRow[] = [
  {
    key: 'duel_challenge',
    titleKey: 'settings.notifications.rows.duelChallenge',
    helpKey: 'settings.notifications.rows.duelChallengeHelp',
  },
  {
    key: 'collab_invite',
    titleKey: 'settings.notifications.rows.collabInvite',
    helpKey: 'settings.notifications.rows.collabInviteHelp',
  },
  {
    key: 'invitation_letter',
    titleKey: 'settings.notifications.rows.invitationLetter',
    helpKey: 'settings.notifications.rows.invitationLetterHelp',
  },
  {
    key: 'comment_on_mine',
    titleKey: 'settings.notifications.rows.commentOnMine',
    helpKey: 'settings.notifications.rows.commentOnMineHelp',
  },
  {
    key: 'comment_mention',
    titleKey: 'settings.notifications.rows.commentMention',
    helpKey: 'settings.notifications.rows.commentMentionHelp',
  },
  {
    key: 'vote_on_mine',
    titleKey: 'settings.notifications.rows.voteOnMine',
    helpKey: 'settings.notifications.rows.voteOnMineHelp',
  },
  {
    key: 'level_up',
    titleKey: 'settings.notifications.rows.levelUp',
    helpKey: 'settings.notifications.rows.levelUpHelp',
  },
  {
    key: 'era_announcement',
    titleKey: 'settings.notifications.rows.eraAnnouncement',
    helpKey: 'settings.notifications.rows.eraAnnouncementHelp',
  },
  {
    key: 'global_task',
    titleKey: 'settings.notifications.rows.globalTask',
    helpKey: 'settings.notifications.rows.globalTaskHelp',
  },
]

/** The rows the server sent state for, in this file's order. */
export function rowsFor(prefs: NotificationPrefs): NotificationRow[] {
  return NOTIFICATION_ROWS.filter((row) => prefs[row.key] !== undefined)
}

/**
 * Whether a cell is the reader's to move.
 *
 * Only the PAGE axis can lock. Email is free on every row, including the three
 * requests rows — that is the entire reason the exclusive three-segment control
 * was replaced: *"you should be able to turn off email notifications on
 * collaboration"* while the invite still lands on your Updates page.
 */
export function isLocked(pref: NotificationPrefOut, axis: PrefAxis): boolean {
  return axis === 'page' && pref.locked
}

/**
 * Why a locked page switch cannot move, as a catalog key.
 *
 * Two locks, two reasons, and both fall out of the value the server already
 * sent rather than a third table:
 *
 * - **locked ON** — the row is a request. Something is waiting on an answer
 *   from you and the Requests queue is its only home (ADR-0070), so it may
 *   never be suppressed (owner ruling, 2026-08-19).
 * - **locked OFF** — the row has no Updates row to show. `level_up` is a
 *   self-notification with no feed source: `LevelUpPopup` already tells you at
 *   the moment it happens (owner ruling, 2026-08-18, "no feed row").
 *
 * Locked and *explaining itself* rather than absent: an absent control says
 * nothing, and this page already ships the locked-switch idiom deliberately on
 * the Cookies card for exactly that reason.
 */
export function lockNoteKey(pref: NotificationPrefOut): ParseKeys<'common'> | undefined {
  if (!pref.locked) return undefined
  return pref.page
    ? 'settings.notifications.lockedRequest'
    : 'settings.notifications.lockedNoFeedRow'
}

/**
 * The rows the master row's cell for this axis actually governs.
 *
 * NOT always nine, and it cannot be. The master row is a bulk-set control, and
 * a cell that claimed to set a locked row would either lie or do nothing — so
 * it governs the rows it can set: all nine on `email`, and on `page` the five
 * whose switch is the reader's. This is the one place the 2026-08-19 ruling's
 * "writes it to all nine rows" is read as "all nine it can write", because the
 * same ruling introduced the locks that make the literal reading impossible.
 */
export function governedRows(prefs: NotificationPrefs, axis: PrefAxis): NotificationRow[] {
  return rowsFor(prefs).filter((row) => !isLocked(prefs[row.key], axis))
}

/**
 * The master cell's thumb: **on only when every row it governs is on.**
 *
 * An empty set is not agreement — with nothing to govern the cell has nothing
 * to say, so it reads off rather than reading "all of nothing is true".
 */
export function masterChecked(prefs: NotificationPrefs, axis: PrefAxis): boolean {
  const governed = governedRows(prefs, axis)
  return governed.length > 0 && governed.every((row) => prefs[row.key][axis])
}

/** Flip one cell. Locked cells return the state unchanged — the switch is
 *  already unclickable, and this is the same answer for anything that is not. */
export function toggleCell(
  prefs: NotificationPrefs,
  key: string,
  axis: PrefAxis,
): NotificationPrefs {
  const pref = prefs[key]
  if (!pref || isLocked(pref, axis)) return prefs
  return { ...prefs, [key]: { ...pref, [axis]: !pref[axis] } }
}

/**
 * The master row's click: write one value into every row the cell governs.
 *
 * The value is the OPPOSITE of the thumb, so the control is a switch rather
 * than two buttons — "all on" when any row is off, "all off" when none is.
 * Nothing persists for the master row itself; it has no stored value and never
 * gains one (owner ruling, 2026-08-18).
 */
export function setAll(prefs: NotificationPrefs, axis: PrefAxis): NotificationPrefs {
  const value = !masterChecked(prefs, axis)
  const next = { ...prefs }
  for (const row of governedRows(prefs, axis)) {
    next[row.key] = { ...prefs[row.key], [axis]: value }
  }
  return next
}

/**
 * The PUT body. Every known row, every time.
 *
 * No diffing against what was fetched: the server drops unknown keys and pins
 * a locked row's `page` itself, so a whole-state save is nine small objects
 * and cannot go stale — and a diff would be a second model of "what changed"
 * for a card whose one write is already the whole card.
 */
export function saveBody(prefs: NotificationPrefs): {
  events: Record<string, { page: boolean; email: boolean }>
} {
  const events: Record<string, { page: boolean; email: boolean }> = {}
  for (const row of rowsFor(prefs)) {
    events[row.key] = { page: prefs[row.key].page, email: prefs[row.key].email }
  }
  return { events }
}
