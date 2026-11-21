import { formatCompactTime } from './commentTime'

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return new Date(iso).toLocaleDateString(undefined, options)
}

/** The feed's compact age; the words live in the catalog (`formatCompactTime`). */
export const relativeTime = formatCompactTime
