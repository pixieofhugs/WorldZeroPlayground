import { useEffect, useState } from 'react'

const CHAR_MS = 84

/** Types `text` after `delayMs`; `instant` (reduced motion, or coming back) shows it whole. */
export function useTitleTyping(text: string, instant: boolean, delayMs: number): string {
  const [n, setN] = useState(instant ? text.length : 0)
  useEffect(() => {
    if (instant) return setN(text.length)
    let id: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      id = setInterval(() => setN((c) => Math.min(text.length, c + 1)), CHAR_MS)
    }, delayMs)
    return () => {
      clearTimeout(start)
      clearInterval(id)
    }
  }, [text, instant, delayMs])
  return text.slice(0, n)
}
