/**
 * Flag-reason vocabulary (ADR-0031) — mirrors backend models/flag.py FlagReason.
 *
 * One flat list shared by praxis and comment flags. The player flag control
 * picks from these keys; the moderator queue badges on them. `other` carries
 * an optional free-text note.
 *
 * The enum keys/values are the shared, backend-mirrored vocabulary and stay
 * fixed. Only the display labels are copy — they resolve through the `admin`
 * catalog (i18n) so they can be reworded without touching this module.
 */
import i18n from '../i18n'

export type FlagReason = 'spam' | 'harassment' | 'nsfw' | 'slop' | 'other'

export const FLAG_REASON_OTHER: FlagReason = 'other'

const FLAG_REASON_VALUES: FlagReason[] = [
  'spam',
  'harassment',
  'nsfw',
  'slop',
  'other',
]

/** Badge label for a stored reason key; unknown keys read as Other (ADR-0031). */
export function flagReasonLabel(value: string): string {
  const match = FLAG_REASON_VALUES.find((reason) => reason === value)
  return i18n.t(`admin:flagReasons.${match ?? FLAG_REASON_OTHER}`)
}

/** The pickable reasons, paired with their (localized) display labels. */
export function flagReasonOptions(): { value: FlagReason; label: string }[] {
  return FLAG_REASON_VALUES.map((value) => ({
    value,
    label: i18n.t(`admin:flagReasons.${value}`),
  }))
}
