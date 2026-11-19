import { createContext, useContext, useEffect } from 'react'

/** The frame's setter: a label holds Next (and the line press), `null` lets it go. */
export const HoldNextContext = createContext<(label: string | null) => void>(() => {})

/**
 * A beat calls this to keep the player on its step until it has what it needs
 * (beat 5: a vote). While `label` is a string the frame shows it in Next's place;
 * `null`, or unmounting, releases.
 */
export function useHoldNext(label: string | null): void {
  const hold = useContext(HoldNextContext)
  useEffect(() => {
    hold(label)
    return () => hold(null)
  }, [hold, label])
}
