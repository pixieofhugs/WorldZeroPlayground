/** Title, beats, `contract` (or `declined`), then `signin` (skipped with a session), then `character` and `arrival` for a player with none. */
export type Step = 'title' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'contract' | 'declined' | 'signin' | 'character' | 'arrival'

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
  if (f.step === 'contract') return moveTo(f, 'signin')
  return f
}

export const decline = (f: Flow): Flow => moveTo(f, 'declined')

export const skip = (f: Flow): Flow => moveTo(f, 'contract')

export const toSignIn = (f: Flow): Flow => moveTo(f, 'signin')

export const toCharacter = (f: Flow, hasCharacter = false): Flow => (hasCharacter ? f : moveTo(f, 'character'))

export const toArrival = (f: Flow): Flow => moveTo(f, 'arrival')

/** With a character, Back steps over `character`: the form must not be reachable a second time. */
export function back(f: Flow, hasCharacter = false): Flow {
  const history = [...f.history]
  let prev = history.pop()
  while (hasCharacter && prev === 'character') prev = history.pop()
  return prev === undefined ? f : { step: prev, history }
}
