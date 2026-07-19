/**
 * Per-faction timestamp dialect (ADR-0018). The comment timestamp slot is the
 * same content (when it was posted) presented in each faction's voice — ADR-0002
 * applied to the timestamp. A shared delta is computed once; each faction maps it
 * to its own string. Six are real derivations; singularity uses a plain relative
 * time in its terminal type (its mock "T-0420" is design fluff, ignored).
 */

export interface TimeDelta {
  minutes: number
  hours: number
  days: number
}

export function timeDelta(iso: string, now: number = Date.now()): TimeDelta {
  const ms = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(ms / 60_000)
  return { minutes, hours: Math.floor(minutes / 60), days: Math.floor(minutes / 1440) }
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** Plain relative time, full words (UA register, and the singularity fallback). */
function relative(d: TimeDelta): string {
  if (d.days >= 1) return `${d.days} day${d.days === 1 ? '' : 's'} ago`
  if (d.hours >= 1) return `${d.hours} hour${d.hours === 1 ? '' : 's'} ago`
  if (d.minutes >= 1) return `${d.minutes} minute${d.minutes === 1 ? '' : 's'} ago`
  return 'just now'
}

/** Terse relative time (coven / singularity terminal). */
function terse(d: TimeDelta): string {
  if (d.days >= 1) return `${d.days}d`
  if (d.hours >= 1) return `${d.hours}h`
  if (d.minutes >= 1) return `${d.minutes}m`
  return 'now'
}

/**
 * Format a comment timestamp in a faction's dialect. The slug is the comment
 * author's member faction; unknown slugs fall back to the plain relative form.
 */
export function formatCommentTime(
  slug: string | null | undefined,
  iso: string,
  now: number = Date.now(),
): string {
  const d = timeDelta(iso, now)
  switch (slug) {
    case 'coven':
      return terse(d)
    case 'snide':
      return `${String(d.hours).padStart(3, '0')}H AGO`
    case 'ephemerists':
      return `the ${ordinal(Math.max(1, d.days))} day`
    case 'everymen':
      return `Shift ${d.days + 1}`
    // Albescent has no dialect (#783). It had "Vigil the Third", keyed on the
    // comment AUTHOR's faction — so a member revealed themselves simply by
    // commenting, anywhere, to anyone. It falls to the plain relative form the
    // default branch gives `na` and unknown slugs.
    case 'singularity':
      // Bare terminal clock (terse, no "ago" — avoids "now ago" at t<1m).
      return terse(d)
    case 'ua':
    default:
      return relative(d)
  }
}
