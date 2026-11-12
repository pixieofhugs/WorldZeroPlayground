import type { ReactNode } from 'react'

/**
 * Default band arrangement: kicker · tag → time · archive. A convenience, not
 * the contract — frames may place the four slots by hand but must never drop
 * one. Paints in `inherit`/`currentColor`, so the frame's `color` tints it all.
 * Kicker names the region (`.label-heading`); tag and time are facts
 * (`.label-caption`) (#1307).
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
        className="label-heading"
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
          className="label-caption"
          style={{
            // Measured alpha (#2098): 4.90:1 / 5.36:1 on the default ground.
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
        className="label-caption"
        style={{
          // No alpha (#2098): 0.7 cut secondary below 4.5:1 and no guard saw
          // it. The type tier carries the hierarchy instead.
          marginLeft: 'auto',
          color: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {time}
      </span>
      {archive}
    </div>
  )
}
