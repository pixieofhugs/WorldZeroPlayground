/**
 * Flag reasons (ADR-0037), mirroring backend models/flag.py FlagReason; shared
 * by praxis and comment flags. Labels come from the `admin` catalog.
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

/** Badge label for a stored reason key; unknown keys read as Other (ADR-0037). */
export function flagReasonLabel(value: string): string {
  const match = FLAG_REASON_VALUES.find((reason) => reason === value)
  return i18n.t(`admin:flagReasons.${match ?? FLAG_REASON_OTHER}`)
}

export function flagReasonOptions(): { value: FlagReason; label: string }[] {
  return FLAG_REASON_VALUES.map((value) => ({
    value,
    label: i18n.t(`admin:flagReasons.${value}`),
  }))
}
