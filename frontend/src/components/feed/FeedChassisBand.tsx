import type { ReactNode } from 'react'

/**
 * The chassis band's DEFAULT ARRANGEMENT: kicker · tag → time · archive.
 *
 * A convenience, not part of the contract. `FeedFrameProps` says a frame must
 * draw all four chrome slots; it does not say where. This is the arrangement
 * every sheet in the epic happens to draw (kind on the left, time and the
 * dismiss control on the right), factored out so eight frames do not each
 * re-derive the ellipsis, the wrap and the auto-margin.
 *
 * A faction dress issue is free to throw it away and place the four slots by
 * hand — that is the whole point of the seam. What it must not do is DROP one:
 * a swallowed slot loses a feature, not a decoration.
 *
 * Everything here paints in `color: inherit` / `currentColor`, so a frame tints
 * the whole band (the archive control included) by setting `color` on whatever
 * it places this inside.
 */
export default function FeedChassisBand({
  kicker,
  time,
  tag,
  archive,
}: {
  kicker: string
  time: string
  tag: string | null
  archive: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        minWidth: 0,
        color: 'inherit',
      }}
    >
      <span
        className="eyebrow"
        style={{
          color: 'inherit',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {kicker}
      </span>
      {tag && (
        <span
          className="eyebrow"
          style={{
            color: 'inherit',
            opacity: 0.8,
            border: '1px solid currentColor',
            padding: '0 var(--space-xs)',
            whiteSpace: 'nowrap',
          }}
        >
          {tag}
        </span>
      )}
      <span
        className="eyebrow"
        style={{
          marginLeft: 'auto',
          color: 'inherit',
          opacity: 0.7,
          whiteSpace: 'nowrap',
        }}
      >
        {time}
      </span>
      {archive}
    </div>
  )
}
