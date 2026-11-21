export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/** Clock time plus zone name; the weekday leads when not today, so it never reads as earlier. */
export function formatClockTime(
  iso: string,
  { timeZone, now = new Date() }: { timeZone?: string; now?: Date } = {},
): string {
  const at = new Date(iso)
  const day = (d: Date) =>
    new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: 'short' }).format(d)
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    ...(day(at) === day(now) ? {} : { weekday: 'short' }),
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(at)
}

/** Returns a human-friendly relative time string (e.g. "2h ago", "3d ago"). */
export function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
