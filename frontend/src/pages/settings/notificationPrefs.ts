import type { ParseKeys } from 'i18next'
import type { components } from '../../api/generated/schema'

/**
 * The Notifications section's logic (#1047), pure so the DOM-less harness can
 * assert it.
 *
 * `on_updates` is live (`services/notification_prefs.muted_feed_types`).
 * `by_email` is stored intent only: nothing sends email yet (#2164), and the
 * card's pending line keeps that honest (#1263). Do not add a sender here.
 *
 * `locked` comes from the server (derived from `FEED_SOURCES`); never re-derive
 * it here, or a new request type gets silently unlocked.
 */

type NotificationPrefOut = components['schemas']['NotificationPrefOut']

export type PrefAxis = 'on_updates' | 'by_email'

/** The server's answer: every row, resolved, keyed by event. */
export type NotificationPrefs = Readonly<Record<string, NotificationPrefOut>>

export interface NotificationRow {
  /** Matches the server registry and the stored JSONB key. */
  readonly key: string
  readonly titleKey: ParseKeys<'common'>
  readonly helpKey: ParseKeys<'common'>
}

/**
 * The nine rows in draw order. Catalog keys are literal so they typecheck and
 * grep. Order is ours, values the server's; the test pins this list to the
 * Python registry.
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

export function rowsFor(prefs: NotificationPrefs): NotificationRow[] {
  return NOTIFICATION_ROWS.filter((row) => prefs[row.key] !== undefined)
}

/** Only the PAGE axis locks; email is free on every row, requests included. */
export function isLocked(pref: NotificationPrefOut, axis: PrefAxis): boolean {
  return axis === 'on_updates' && pref.locked
}

/**
 * Why a locked page switch cannot move:
 * - locked ON: a request, never suppressed (ADR-0070, owner ruling 2026-08-19).
 * - locked OFF: no feed row; `LevelUpPopup` covers `level_up` (ruling 2026-08-18).
 */
export function lockNoteKey(pref: NotificationPrefOut): ParseKeys<'common'> | undefined {
  if (!pref.locked) return undefined
  return pref.on_updates
    ? 'settings.notifications.lockedRequest'
    : 'settings.notifications.lockedNoFeedRow'
}

/**
 * The unlocked rows the master cell governs: nine on `by_email`, five on
 * `on_updates` (the 2026-08-19 ruling's "all nine" read as "all it can write").
 */
export function governedRows(prefs: NotificationPrefs, axis: PrefAxis): NotificationRow[] {
  return rowsFor(prefs).filter((row) => !isLocked(prefs[row.key], axis))
}

/** On only when every governed row is on; an empty set reads off. */
export function masterChecked(prefs: NotificationPrefs, axis: PrefAxis): boolean {
  const governed = governedRows(prefs, axis)
  return governed.length > 0 && governed.every((row) => prefs[row.key][axis])
}

/** Locked cells return the state unchanged. */
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
 * Write the opposite of the thumb into every governed row. The master row has
 * no stored value of its own (owner ruling 2026-08-18).
 */
export function setAll(prefs: NotificationPrefs, axis: PrefAxis): NotificationPrefs {
  const value = !masterChecked(prefs, axis)
  const next = { ...prefs }
  for (const row of governedRows(prefs, axis)) {
    next[row.key] = { ...prefs[row.key], [axis]: value }
  }
  return next
}

/** Every known row, no diff: the server drops unknown keys and pins locks. */
export function saveBody(prefs: NotificationPrefs): {
  events: Record<string, { on_updates: boolean; by_email: boolean }>
} {
  const events: Record<string, { on_updates: boolean; by_email: boolean }> = {}
  for (const row of rowsFor(prefs)) {
    events[row.key] = { on_updates: prefs[row.key].on_updates, by_email: prefs[row.key].by_email }
  }
  return { events }
}
