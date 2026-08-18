/**
 * The one monogram circle a praxis draws next to a person's name (#1416).
 *
 * There were two of these and the roster's redesign wanted a third: the duel
 * waiting surface's `SideAvatar` (28px, first character only, faction-tinted)
 * and the invite dropdown's bare dot. This is that component extracted, so the
 * roster row and the duel side draw the same circle at two sizes rather than
 * two circles that merely resemble each other.
 *
 * A LEAF on purpose — colours arrive as props rather than being resolved from a
 * slug here. The roster paints its own state (accent when the row is done, the
 * muted ink otherwise, dashed while an invite is unanswered); the duel side
 * paints the SIDE's faction, never the page's. One component cannot know which,
 * and guessing is what would have made it a third idiom instead of a shared one.
 *
 * THE MONOGRAM IS THE FALLBACK, NOT THE DEFAULT (#2128). Pass `avatarUrl` and
 * the circle wears the face; the monogram is what an absent portrait falls back
 * to. Both duel surfaces route through here, so the rule is written once —
 * `avatarUrl` answers only WHAT to draw, never WHETHER there is a person to
 * draw, which is why it is optional and an empty string is a portrait-less
 * person rather than no person at all.
 */
import { mediaUrl } from '../../utils/media'
import { rosterInitials } from './rosterRows'

export function RosterAvatar({
  name,
  size,
  background = 'transparent',
  borderColor,
  dashed = false,
  color,
  avatarUrl,
}: {
  /** Display name; the monogram is derived, never passed in. */
  name: string
  /** Diameter in px. 34 on the roster row, 28 on a duel side. */
  size: number
  background?: string
  borderColor: string
  /** An unanswered invite is drawn as a dashed outline, like its status pill. */
  dashed?: boolean
  color?: string
  /** The person's portrait. Empty/absent falls back to the monogram. */
  avatarUrl?: string | null
}) {
  if (avatarUrl) {
    return (
      <img
        aria-hidden="true"
        alt=""
        src={mediaUrl(avatarUrl)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          objectFit: 'cover',
          // The ring is the caller's state read (faction, done, unanswered), so
          // the portrait keeps wearing it exactly as the monogram did.
          border: `1px ${dashed ? 'dashed' : 'solid'} ${borderColor}`,
          boxSizing: 'border-box',
        }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center font-body"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background,
        border: `1px ${dashed ? 'dashed' : 'solid'} ${borderColor}`,
        color,
        // The monogram is ornament next to a name that is right there in text,
        // so it takes the label tier rather than the design's raw 13px.
        fontSize: 'var(--text-lg)',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {rosterInitials(name)}
    </span>
  )
}
