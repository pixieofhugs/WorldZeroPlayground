import i18n from '../i18n'

/**
 * A comment's age, in the one form every faction reads: "3 hours ago", "just
 * now". The words live in the copy catalog at locales/en/praxis.json under
 * `comments.time.default`, and i18next owns the plurals.
 *
 * It takes no faction slug, on purpose. A timestamp keyed on the comment
 * AUTHOR's faction announces that faction to every reader (#783), and a seam
 * with no slug cannot grow a slug branch.
 */

interface TimeDelta {
  minutes: number
  hours: number
  days: number
}

function timeDelta(iso: string, now: number): TimeDelta {
  const ms = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(ms / 60_000)
  return { minutes, hours: Math.floor(minutes / 60), days: Math.floor(minutes / 1440) }
}

/** Reads the delta as the coarsest unit it has at least one of. */
export function formatCommentTime(iso: string, now: number = Date.now()): string {
  const d = timeDelta(iso, now)
  if (d.days >= 1) return i18n.t('praxis:comments.time.default.days', { count: d.days })
  if (d.hours >= 1) return i18n.t('praxis:comments.time.default.hours', { count: d.hours })
  if (d.minutes >= 1) return i18n.t('praxis:comments.time.default.minutes', { count: d.minutes })
  return i18n.t('praxis:comments.time.default.now')
}
