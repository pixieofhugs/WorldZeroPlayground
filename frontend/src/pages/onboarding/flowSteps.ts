/** `contract` is today's sequence (sign-in if no session, then terms); `signin` is the header's shortcut. */
export type Step = 'title' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'contract' | 'signin'

export const BEAT_COUNT = 7

export interface Flow {
  step: Step
  /** Every step the player left, oldest first: Back pops it, so it retraces the real path. */
  history: Step[]
}

export const initialFlow = (resumed: boolean): Flow => ({ step: resumed ? 'contract' : 'title', history: [] })

export const isBeat = (s: Step): s is 1 | 2 | 3 | 4 | 5 | 6 | 7 => typeof s === 'number'

const moveTo = (f: Flow, step: Step): Flow => ({ step, history: [...f.history, f.step] })

export function next(f: Flow): Flow {
  if (f.step === 'title') return moveTo(f, 1)
  if (isBeat(f.step)) return moveTo(f, f.step === BEAT_COUNT ? 'contract' : ((f.step + 1) as Step))
  return f
}

export const skip = (f: Flow): Flow => moveTo(f, 'contract')

export const toSignIn = (f: Flow): Flow => moveTo(f, 'signin')

export function back(f: Flow): Flow {
  const prev = f.history[f.history.length - 1]
  return prev === undefined ? f : { step: prev, history: f.history.slice(0, -1) }
}
