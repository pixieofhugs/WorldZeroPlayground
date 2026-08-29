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
 * The device-local animations switch (#2154), built to the same shape as
 * `useTheme`: one cell behind one context, painted onto an attribute on
 * `document.documentElement` and persisted to localStorage. No backend, no
 * account field — this is a property of the device you are reading on, exactly
 * like the theme.
 *
 * WHAT THE ATTRIBUTE DRIVES
 * -------------------------
 * One rule in `index.css`:
 *
 *   [data-motion="off"] *, [data-motion="off"] *::before, [data-motion="off"] *::after {
 *     animation: none !important; transition: none !important;
 *   }
 *
 * `!important` is load-bearing rather than lazy: this codebase writes a great
 * many `transition:` declarations INLINE in JSX style objects, and a style
 * attribute outranks every selector. Only `!important` reaches them.
 *
 * WHY IT IS SUBTRACT-ONLY, AND WHY THE SWITCH GOES DISABLED
 * ---------------------------------------------------------
 * Every animation in this tree lives INSIDE
 * `@media (prefers-reduced-motion: no-preference)` — that is the standing rule
 * `motionSplit.test.ts` guards. So the attribute can only ever take motion
 * away; there is no arrangement of it that puts motion back for a reader whose
 * OS asked for none. A switch reading "on" while the OS has already stilled the
 * page would be a control that does nothing, which is the false-affordance
 * class of #1263. Hence `effectiveMotion` below, and hence the Appearance row
 * renders the switch OFF and DISABLED when the OS preference is set. That
 * disabled state is DELIBERATE — it is not a bug, and it is not a loading
 * state.
 *
 * WHAT THE ATTRIBUTE CANNOT DRIVE
 * -------------------------------
 * A stylesheet can only null a property that exists. Motion driven from JS —
 * `SingularityVote`'s scramble clock and `AlbescentVote`'s morph clock, both
 * `setInterval` re-renders — has no `animation` or `transition` for the rule
 * above to reach, so the switch left them ticking (#2622). Those two now read
 * `useMotionTick` below and schedule nothing while motion is off. Anything else
 * that animates from JS belongs on the same clock for the same reason.
 */
export type Motion = 'on' | 'off'

export const MOTION_STORAGE_KEY = 'wz-motion'

/** The DOM attribute the kill-switch rule in `index.css` selects on. */
export const MOTION_ATTRIBUTE = 'data-motion'

/** The OS-level ask. Named once so the hook and its tests cannot drift. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** What a visitor who has never touched the switch gets: the site as designed. */
export const DEFAULT_MOTION: Motion = 'on'

/** The opposite setting — the single source of the switch's flip decision. */
export function nextMotion(motion: Motion): Motion {
  return motion === 'on' ? 'off' : 'on'
}

/** A stored choice wins; anything else (absent, junk) is the default. */
export function resolveInitialMotion(stored: string | null): Motion {
  if (stored === 'on' || stored === 'off') return stored
  return DEFAULT_MOTION
}

/**
 * SUBTRACT-ONLY. The OS always wins, and it can only ever win in one
 * direction: a system asking for reduced motion forces 'off' regardless of the
 * stored choice, while a system with no preference leaves the choice alone.
 * There is no input that turns motion back ON against the OS.
 */
export function effectiveMotion(chosen: Motion, systemReduced: boolean): Motion {
  return systemReduced ? 'off' : chosen
}

/** Paint the `[data-motion]` cascade. Exported so tests can exercise the exact
 *  write the switch performs without a React hook runtime. */
export function applyMotion(motion: Motion): void {
  document.documentElement.setAttribute(MOTION_ATTRIBUTE, motion)
}

/** Persist the chosen setting. */
export function persistMotion(motion: Motion): void {
  localStorage.setItem(MOTION_STORAGE_KEY, motion)
}

/** Read the browser's answer for the initial setting (localStorage → default). */
export function getInitialMotion(): Motion {
  // Defensive so the provider can also be mounted in a DOM-less render (SSR,
  // node tests), matching `getInitialTheme`.
  try {
    return resolveInitialMotion(localStorage.getItem(MOTION_STORAGE_KEY))
  } catch {
    return DEFAULT_MOTION
  }
}

/**
 * Does the OS ask for reduced motion right now?
 *
 * Answers `false` when there is no `matchMedia` to ask — and unlike the vote
 * skins' local copies of this hook, `false` is the safe default HERE. This
 * value decides only whether the switch renders disabled; the motion itself is
 * governed by the real `@media` query in the stylesheet either way. Guessing
 * "the OS asked for none" with no way to check would disable a control for
 * every reader whose browser we could not interrogate.
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

/** Reactive `prefers-reduced-motion`, so flipping it in the OS re-renders the row. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, readReducedMotion)
}

interface MotionState {
  /** What the reader chose. Not necessarily what is in effect — see `motion`. */
  readonly chosen: Motion
  /** What is actually in effect, after the OS has had its say. */
  readonly motion: Motion
  /** True when the OS asked for reduced motion, so the switch is not the reader's to move. */
  readonly systemReduced: boolean
  readonly toggle: () => void
}

const MotionContext = createContext<MotionState | null>(null)

/**
 * App-root motion provider. Mounted beside `ThemeProvider` in `main.tsx`.
 *
 * ponytail: unlike the theme, there is no pre-paint bootstrap in `index.html`,
 * so an ornament animation can run for the frames between first paint and this
 * effect. The ceiling is that flicker; the upgrade path is the same two-line
 * inline script the theme uses, which `useTheme.test.tsx` already mirrors.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Motion>(getInitialMotion)
  const systemReduced = usePrefersReducedMotion()
  const motion = effectiveMotion(chosen, systemReduced)

  useEffect(() => {
    applyMotion(motion)
  }, [motion])

  const toggle = useCallback(() => {
    // The OS owns the answer while it is asking for reduced motion; the row
    // renders the switch disabled, and this guard is the second half of that
    // promise for anyone who reaches the handler another way.
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

/** Read the shared motion setting. Same posture as `useTheme`. */
export function useMotion(): MotionState {
  const value = useContext(MotionContext)
  if (!value) {
    throw new Error('useMotion must be used within a MotionProvider')
  }
  return value
}

/**
 * Is motion stilled right now? The JS-clock equivalent of matching
 * `[data-motion="off"]`, and the composed answer — the OS has already had its
 * say inside `effectiveMotion`, so a caller must never pair this with its own
 * `prefers-reduced-motion` read (#2622).
 *
 * Unlike `useMotion`, this does NOT throw without a provider; it answers
 * "stilled". Its callers are ornaments rather than controls, so a wrong answer
 * is asymmetric: an ornament rendered outside the app root (a test, an isolated
 * preview) should hold still rather than start a clock nothing will stop. That
 * is the same default the vote skins' own matchMedia hooks carried before this.
 */
export function useMotionStilled(): boolean {
  return (useContext(MotionContext)?.motion ?? 'off') === 'off'
}

/**
 * Start a repeating clock unless motion is stilled, returning its teardown.
 *
 * Lifted out of `useMotionTick` because "off schedules nothing" is the whole
 * claim of #2622 and the test harness has no DOM to observe an effect in. Plain
 * function, no React: the test can assert the timer directly.
 */
export function scheduleMotionTick(
  stilled: boolean,
  onTick: () => void,
  intervalMs: number,
): () => void {
  if (stilled) return () => {}
  const id = setInterval(onTick, intervalMs)
  return () => clearInterval(id)
}

/**
 * A counter that increments every `intervalMs` while motion is on, for an
 * ornament that animates by re-rendering rather than by CSS. While motion is
 * stilled it holds whatever value it had reached (0 if it never ran), and —
 * because `stilled` is a dependency of the effect — its timer is torn down
 * mid-life the moment a reader flips the switch off.
 */
export function useMotionTick(intervalMs: number): number {
  const stilled = useMotionStilled()
  const [tick, setTick] = useState(0)
  useEffect(
    () => scheduleMotionTick(stilled, () => setTick((value) => value + 1), intervalMs),
    [stilled, intervalMs],
  )
  return tick
}
