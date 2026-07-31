import { thumbOffset, thumbWidth, type FilterRail } from './filterState'

/**
 * One segmented rail: a spectrum-ringed track with a sliding thumb (#1365).
 *
 * The ring is `--faction-default-rainbow` and stays (#1361 ruling 1). That
 * token is `na`'s spectrum and it is also the site's default chrome, because
 * `na` ≡ site default is one identity — the collision is deliberate and must
 * not be "fixed" into a neutral border.
 *
 * The design authored the thumb as a lime/gold gradient over a raw `#1b1a24`
 * track, dark-only. Both are tokens here (`--filter-well`, `--filter-thumb`),
 * so the rail arrives in light mode by the cascade rather than by a ternary,
 * and the Snide-lime accent is gone: selection reads as a neutral highlight
 * plus a full-strength ink, exactly as `FilterStamps` has always drawn it.
 *
 * All geometry beyond the thumb's `left`/`width` lives on `.filter-rail` in
 * index.css. Those two are inline because they are functions of the segment
 * count, which only the caller knows.
 */
export default function SegmentedRail({ rail }: { rail: FilterRail }) {
  const { label, value, segments, onChange } = rail
  const activeIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  )
  return (
    <div className="filter-rail" role="group" aria-label={label}>
      <span
        className="filter-rail__thumb"
        aria-hidden="true"
        style={{
          left: thumbOffset(activeIndex, segments.length),
          width: thumbWidth(segments.length),
        }}
      />
      {segments.map((segment, index) => (
        <button
          key={segment.value}
          type="button"
          className="filter-rail__segment"
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
