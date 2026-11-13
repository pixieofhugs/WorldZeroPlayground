import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  sameBoxes,
  thumbGeometry,
  type FilterRail,
  type SegmentBox,
} from './filterState'

/** `useIsomorphicLayoutEffect`: place the thumb before paint; quiet under SSR tests. */
const useMeasureEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

/**
 * One segmented rail: a spectrum-ringed track with a sliding thumb (#1365).
 *
 * The `--faction-default-rainbow` ring is deliberate (#1361 ruling 1): `na`'s
 * spectrum is the site default chrome. Don't "fix" it to a neutral border.
 *
 * The thumb is measured, not calculated (#1726), so segments size to their own
 * (translated) labels. Re-measured every render and on resize; unmeasured
 * means no thumb, which is why DOM-less tests see none.
 */
export default function SegmentedRail({ rail }: { rail: FilterRail }) {
  const { label, value, segments, onChange } = rail
  const activeIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  )
  const railRef = useRef<HTMLDivElement | null>(null)
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [boxes, setBoxes] = useState<SegmentBox[]>([])

  // `offset*` shares the absolute thumb's origin (padding box), so no ring fix-up.
  const measure = useCallback(() => {
    const measured = segmentRefs.current
      .filter((element): element is HTMLButtonElement => element !== null)
      .map((element) => ({
        left: element.offsetLeft,
        top: element.offsetTop,
        width: element.offsetWidth,
        height: element.offsetHeight,
      }))
    setBoxes((previous) => (sameBoxes(previous, measured) ? previous : measured))
  }, [])

  // No deps on purpose: any re-render may change segments; `sameBoxes` dedupes.
  useMeasureEffect(measure)

  useEffect(() => {
    const railElement = railRef.current
    // `ResizeObserver` is absent under Node tests.
    if (!railElement || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(railElement)
    for (const element of segmentRefs.current) {
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [measure, segments.length])

  const geometry = thumbGeometry(boxes, activeIndex)

  return (
    <div className="filter-rail" role="group" aria-label={label} ref={railRef}>
      {geometry && (
        <span className="filter-rail__thumb" aria-hidden="true" style={geometry} />
      )}
      {segments.map((segment, index) => (
        <button
          key={segment.value}
          type="button"
          className="filter-rail__segment"
          ref={(element) => {
            segmentRefs.current[index] = element
          }}
          // Selected ink lives in CSS so it flips with the theme (STYLE §1.3).
          data-on={index === activeIndex ? 'true' : undefined}
          aria-pressed={index === activeIndex}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  )
}
