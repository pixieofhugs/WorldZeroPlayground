import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  sameBoxes,
  thumbGeometry,
  type FilterRail,
  type SegmentBox,
} from './filterState'

/**
 * The app is client-only, so this is `useLayoutEffect` everywhere it runs: the
 * thumb must be placed before the browser paints or it flashes. The DOM-less
 * test harness renders through `react-dom/server`, which warns about layout
 * effects it cannot run — there it degrades to the effect it will not run
 * either. Same idiom as the ubiquitous `useIsomorphicLayoutEffect`.
 */
const useMeasureEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

/**
 * One segmented rail: a spectrum-ringed track with a sliding thumb (#1365).
 *
 * The ring is `--faction-default-rainbow` and stays (#1361 ruling 1). That
 * token is `na`'s spectrum and it is also the site's default chrome, because
 * `na` ≡ site default is one identity — the collision is deliberate and must
 * not be "fixed" into a neutral border.
 *
 * The design authored the thumb as a lime/gold gradient over a raw `#1b1a24`
 * track, dark-only. Both are tokens here (`--switch-well`, `--switch-thumb`),
 * so the rail arrives in light mode by the cascade rather than by a ternary,
 * and the Snide-lime accent is gone: selection reads as a neutral highlight
 * plus a full-strength ink, exactly as `FilterStamps` has always drawn it.
 *
 * **The thumb is measured, not calculated (#1726).** It used to be
 * `calc(i * track / n)` — one nth of the rail — which forced every segment to
 * be one nth wide too, and a 7-character label in a monospace face did not fit
 * the share a four-segment status rail left it. Segments now size to their own
 * labels and the thumb takes the active one's measured box whole, so nothing in
 * this component or in index.css knows the segment count. That also survives
 * translation: a longer word makes a wider segment instead of overflowing one.
 *
 * Re-measured on every render (the segment set is viewer-gated and changes at
 * sign-in) and by a `ResizeObserver` on the rail and its segments (the rail
 * resizes with the viewport; the segments resize when the webfont lands or the
 * language changes). `useLayoutEffect` runs before the browser paints, so the
 * thumb's first appearance is already in the right place — and until it has
 * been measured there is NO thumb, which is why the DOM-less harness sees none.
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

  // `offset*` rather than `getBoundingClientRect`: it is already relative to the
  // rail's padding box — the same origin the absolutely positioned thumb
  // resolves against — so the rail's 1.5px ring needs no correcting for.
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

  // No dependency array on purpose: a re-render is the one signal that covers
  // every way the segment set can change (sign-in adds two status segments, a
  // language switch relabels them). `sameBoxes` makes the repeat runs free.
  useMeasureEffect(measure)

  useEffect(() => {
    const railElement = railRef.current
    // Guarded as `SkyCanvas` guards its own observer: the constructor is a
    // browser global, and this module is imported by a Node-side harness.
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
          // The selected ink is a data attribute rather than an inline colour
          // so the whole pairing lives in one place in index.css and flips with
          // the theme (STYLE §1.3).
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
