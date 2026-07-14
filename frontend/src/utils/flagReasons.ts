/**
 * Flag-reason vocabulary (ADR-0031) — mirrors backend models/flag.py FlagReason.
 *
 * One flat list shared by praxis and comment flags. The player flag control
 * picks from these keys; the moderator queue badges on them. `other` carries
 * an optional free-text note.
 */

export type FlagReason = 'spam' | 'harassment' | 'nsfw' | 'slop' | 'other'

export const FLAG_REASON_OTHER: FlagReason = 'other'

export const FLAG_REASONS: { value: FlagReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'nsfw', label: 'NSFW' },
  { value: 'slop', label: 'Slop' },
  { value: 'other', label: 'Other' },
]

/** Badge label for a stored reason key; unknown keys read as Other (ADR-0031). */
export function flagReasonLabel(value: string): string {
  const match = FLAG_REASONS.find((reason) => reason.value === value)
  return match ? match.label : 'Other'
}
