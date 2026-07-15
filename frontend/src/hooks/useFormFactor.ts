import { useSyncExternalStore } from 'react'

export type FormFactor = 'mobile' | 'desktop'

// Single phone/desktop breakpoint. Below 768px is mobile; no tablet tier (#494).
export const MOBILE_QUERY = '(max-width: 767px)'

export function formFactorFor(matchesMobile: boolean): FormFactor {
  return matchesMobile ? 'mobile' : 'desktop'
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Reports 'mobile' vs 'desktop' from one matchMedia breakpoint, reactive to
 * resize/rotate. Viewport-based, not UA sniffing. Defaults to 'desktop' when
 * matchMedia is absent (SSR / test node env).
 */
export function useFormFactor(): FormFactor {
  return useSyncExternalStore(
    subscribe,
    () => formFactorFor(window.matchMedia(MOBILE_QUERY).matches),
    () => 'desktop', // ponytail: SSR/no-matchMedia default; desktop is the safe layout
  )
}
