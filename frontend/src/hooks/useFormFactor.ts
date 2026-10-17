import { useSyncExternalStore } from 'react'

export type FormFactor = 'mobile' | 'desktop'

// Single phone/desktop breakpoint, touch-gated (#3182, amends #494). A phone is
// a NARROW window on a TOUCH-FIRST device: below 768px AND a coarse primary
// pointer. A narrow window with a mouse (half a laptop screen) is still a
// computer and gets the desktop shell down to 600px. No tablet tier. Browser
// device emulation reports a coarse pointer, so it still shows the phone layout.
export const MOBILE_QUERY = '(max-width: 767px) and (pointer: coarse)'

export function formFactorFor(matchesMobile: boolean): FormFactor {
  return matchesMobile ? 'mobile' : 'desktop'
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Reports 'mobile' vs 'desktop' from one matchMedia query (width + pointer), reactive
 * to resize/rotate. Media-feature based, not UA sniffing. Defaults to 'desktop' when
 * matchMedia is absent (SSR / test node env).
 */
export function useFormFactor(): FormFactor {
  return useSyncExternalStore(
    subscribe,
    () => formFactorFor(window.matchMedia(MOBILE_QUERY).matches),
    () => 'desktop', // ponytail: SSR/no-matchMedia default; desktop is the safe layout
  )
}
