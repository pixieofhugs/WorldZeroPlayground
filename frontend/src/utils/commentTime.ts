import i18n from '../i18n'

/**
 * A comment's age ("3 hours ago"); copy in `praxis.json` `comments.time.default`.
 * Takes no faction slug on purpose: keying on the author's faction outs it (#783).
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

/** The feed's short form ("3m ago", "2d ago", "1mo ago"); copy in `comments.time.compact`. */
export function formatCompactTime(iso: string, now: number = Date.now()): string {
  const d = timeDelta(iso, now)
  if (d.days >= 30) return i18n.t('praxis:comments.time.compact.months', { count: Math.floor(d.days / 30) })
  if (d.days >= 1) return i18n.t('praxis:comments.time.compact.days', { count: d.days })
  if (d.hours >= 1) return i18n.t('praxis:comments.time.compact.hours', { count: d.hours })
  if (d.minutes >= 1) return i18n.t('praxis:comments.time.compact.minutes', { count: d.minutes })
  return i18n.t('praxis:comments.time.compact.now')
}
