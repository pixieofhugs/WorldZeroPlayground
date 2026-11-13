import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

/**
 * Device-local animations switch (#2154), shaped like `useTheme`: context →
 * `data-motion` on <html> → localStorage. Drives the `[data-motion="off"]` rule
 * in `index.css` (`!important`, to beat inline JSX transitions).
 *
 * Subtract-only: all motion sits inside `prefers-reduced-motion: no-preference`
 * (`motionSplit.test.ts`), so when the OS asks for reduce the Settings switch is
 * rendered OFF and DISABLED on purpose (no false affordance, #1263).
 *
 * CSS cannot still JS clocks (`setInterval` re-renders, #2622): those must use
 * `useMotionTick` below.
 *
 * Test-only exports are deliberate (#2693): no DOM in tests, so these pure seams
 * are the only way to assert the OS-wins rule.
 */
export type Motion = 'on' | 'off'

export const MOTION_STORAGE_KEY = 'wz-motion'

export const MOTION_ATTRIBUTE = 'data-motion'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export const DEFAULT_MOTION: Motion = 'on'

export function nextMotion(motion: Motion): Motion {
  return motion === 'on' ? 'off' : 'on'
}

/** A stored choice wins; absent/junk → default. */
export function resolveInitialMotion(stored: string | null): Motion {
  if (stored === 'on' || stored === 'off') return stored
  return DEFAULT_MOTION
}

/** Subtract-only: OS reduce forces 'off'; nothing turns motion on against the OS. */
export function effectiveMotion(chosen: Motion, systemReduced: boolean): Motion {
  return systemReduced ? 'off' : chosen
}

export function applyMotion(motion: Motion): void {
  document.documentElement.setAttribute(MOTION_ATTRIBUTE, motion)
}

export function persistMotion(motion: Motion): void {
  localStorage.setItem(MOTION_STORAGE_KEY, motion)
}

export function getInitialMotion(): Motion {
  // try/catch: DOM-less renders (SSR, node tests).
  try {
    return resolveInitialMotion(localStorage.getItem(MOTION_STORAGE_KEY))
  } catch {
    return DEFAULT_MOTION
  }
}

/**
 * `false` without `matchMedia` is safe: this only decides whether the switch is
 * disabled; the real `@media` query still governs the motion.
 */
export function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, readReducedMotion)
}

interface MotionState {
  /** The reader's choice; may differ from `motion`. */
  readonly chosen: Motion
  /** In effect, after the OS. */
  readonly motion: Motion
  readonly systemReduced: boolean
  readonly toggle: () => void
}

const MotionContext = createContext<MotionState | null>(null)

/**
 * App-root provider, beside `ThemeProvider` in `main.tsx`.
 *
 * ponytail: no pre-paint bootstrap, so motion can flicker before this effect;
 * upgrade: the theme's inline `index.html` script.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Motion>(getInitialMotion)
  const systemReduced = usePrefersReducedMotion()
  const motion = effectiveMotion(chosen, systemReduced)

  useEffect(() => {
    applyMotion(motion)
  }, [motion])

  const toggle = useCallback(() => {
    // Backs up the disabled switch while the OS asks for reduce.
    if (readReducedMotion()) return
    setChosen((current) => {
      const next = nextMotion(current)
      persistMotion(next)
      return next
    })
  }, [])

  const value = useMemo<MotionState>(
    () => ({ chosen, motion, systemReduced, toggle }),
    [chosen, motion, systemReduced, toggle],
  )

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useMotion(): MotionState {
  const value = useContext(MotionContext)
  if (!value) {
    throw new Error('useMotion must be used within a MotionProvider')
  }
  return value
}

/**
 * JS-clock equivalent of `[data-motion="off"]`, already OS-composed — never pair
 * it with your own `prefers-reduced-motion` read (#2622). Without a provider it
 * answers "stilled" (ornaments hold still) instead of throwing.
 */
export function useMotionStilled(): boolean {
  return (useContext(MotionContext)?.motion ?? 'off') === 'off'
}

/** Repeating clock unless stilled; returns teardown. Plain fn so tests see the timer. */
export function scheduleMotionTick(
  stilled: boolean,
  onTick: () => void,
  intervalMs: number,
): () => void {
  if (stilled) return () => {}
  const id = setInterval(onTick, intervalMs)
  return () => clearInterval(id)
}

/** Counter ticking every `intervalMs` while motion is on; holds its value when stilled. */
export function useMotionTick(intervalMs: number): number {
  const stilled = useMotionStilled()
  const [tick, setTick] = useState(0)
  useEffect(
    () => scheduleMotionTick(stilled, () => setTick((value) => value + 1), intervalMs),
    [stilled, intervalMs],
  )
  return tick
}
