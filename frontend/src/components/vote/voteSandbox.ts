import { createContext } from 'react'

/** Inside it a vote control is live for anyone and a cast resolves here, never as a request. */
export interface VoteSandbox {
  value: number | null
  cast: (stars: number) => void
}

export const VoteSandboxContext = createContext<VoteSandbox | null>(null)
