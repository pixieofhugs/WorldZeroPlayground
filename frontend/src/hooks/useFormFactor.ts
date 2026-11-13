import { useSyncExternalStore } from 'react'

export type FormFactor = 'mobile' | 'desktop'

// Phone = narrow AND coarse pointer (#3182); a narrow mouse window stays desktop
// down to 600px. No tablet tier.
export const MOBILE_QUERY = '(max-width: 767px) and (pointer: coarse)'

export function formFactorFor(matchesMobile: boolean): FormFactor {
  return matchesMobile ? 'mobile' : 'desktop'
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** Reactive media-query form factor (no UA sniffing). */
export function useFormFactor(): FormFactor {
  return useSyncExternalStore(
    subscribe,
    () => formFactorFor(window.matchMedia(MOBILE_QUERY).matches),
    () => 'desktop', // ponytail: SSR/no-matchMedia default; desktop is the safe layout
  )
}
