import { useEffect, useRef, useState } from 'react'
import Constellation, { type RankedPlayer } from './Constellation'

/** Desktop cap. Uncapped the sky sprawls on an ultrawide and shoves the roster
 *  far down the page; 900px keeps it a hero, not a horizon (#730 §1). */
export const DESKTOP_SKY_MAX_WIDTH = 900
/** Height as a fraction of width. The sky is CIRCULAR — `min(w, h)` is the
 *  radius basis inside Constellation, so the stage must be tall or the height
 *  stays the binding constraint and the radius never grows. 900 × 0.85 ≈ 765,
 *  which yields the ~294px target radius (#730 §1). */
export const DESKTOP_SKY_ASPECT = 0.85
/** A phone column is already narrow, so its stage is taller than wide. */
export const MOBILE_SKY_ASPECT = 1.08

export interface SkyCanvasProps {
  players: RankedPlayer[]
  maxScore: number
  myCharId: number | null
  population: number
  /** Cap the stage; omit for the phone, where the column is the cap. */
  maxWidth?: number
  aspect?: number
}

/**
 * The one measuring wrapper for the constellation, shared by BOTH form factors.
 *
 * ponytail: this used to be a private helper in DefaultPlayers while desktop
 * passed a magic 620×460 constant — so a ResizeObserver on one side and a
 * hardcoded island on the other. Lifting it here DELETES the desktop constant
 * and the duplicate, rather than adding a third path.
 *
 * The width cap is plain CSS `maxWidth` on the measured element, so the measured
 * width is already the capped width — no second clamp in JS. Positions inside
 * Constellation stay in px measured from the stage centre, so equal offsets are
 * equal distances regardless of the fluid column width (epic #654 §1).
 */
export default function SkyCanvas({
  players,
  maxScore,
  myCharId,
  population,
  maxWidth,
  aspect = DESKTOP_SKY_ASPECT,
}: SkyCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="mx-auto" style={{ maxWidth, minHeight: 320 }}>
      {width > 0 && (
        <Constellation
          players={players}
          maxScore={maxScore}
          myCharId={myCharId}
          population={population}
          stageWidth={width}
          stageHeight={Math.round(width * aspect)}
        />
      )}
    </div>
  )
}
