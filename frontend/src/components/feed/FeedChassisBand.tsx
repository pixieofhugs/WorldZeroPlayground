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
 *
 * THE BAND SPENDS BOTH LABEL TIERS (#1307), and the split is the slot's job
 * rather than its position. The kicker NAMES THE REGION — it is the card's kind,
 * one or two words by construction, and every faction sheet that places the four
 * slots by hand draws it as a masthead — so it is `.label-heading`. The tag and
 * the time are small FACTS about the card, genuinely read, so they take
 * `.label-caption` and its sentence case.
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
            // The one alpha left on this band, and it is measured (#2098):
            // 4.90:1 in light and 5.36:1 in dark on the default chassis ground,
            // both clear of the 4.5:1 a caption owes. It also dims the hairline
            // box around the chip, which is where the recede is actually
            // wanted — so it stays where the dateline's 0.7 could not.
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
          // NO ALPHA (#2098). `opacity: 0.7` here cut `--color-text-secondary`
          // from 8.41:1 to 3.82:1 in light and 7.64:1 to 4.42:1 in dark, and no
          // guard could see it: the token measured at its declaration is not the
          // colour the reader gets once the call site composites it. There is no
          // quieter global tier to move to — secondary IS the quiet tier — and
          // the dateline has no ground of its own to recede, which is what §3's
          // rule asks for. So it simply stops being dimmed: the hierarchy the
          // alpha was buying is already carried by the type, `.label-caption`
          // against the kicker's `.label-heading`.
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
