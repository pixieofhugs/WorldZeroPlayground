import { createContext, useContext, useEffect } from 'react'

export const HoldNextContext = createContext<(label: string | null) => void>(() => {})

/** A string holds Next (shown in its place); `null` or unmounting releases. */
export function useHoldNext(label: string | null): void {
  const hold = useContext(HoldNextContext)
  useEffect(() => {
    hold(label)
    return () => hold(null)
  }, [hold, label])
}
