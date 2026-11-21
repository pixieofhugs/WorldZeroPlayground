export const PUSH_ASK_DISMISSED_KEY = 'wz:pushAskDismissed'

// ponytail: localStorage, not per account; the notification prefs hold no dismissal field. Move server-side if one lands.
export function pushAskDismissed(): boolean {
  try {
    return localStorage.getItem(PUSH_ASK_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPushAsk(): void {
  try {
    localStorage.setItem(PUSH_ASK_DISMISSED_KEY, '1')
  } catch {
    // Refused storage: the card may return next load.
  }
}
