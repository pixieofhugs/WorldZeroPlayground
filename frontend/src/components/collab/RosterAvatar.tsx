/**
 * The monogram/portrait circle beside a person's name (#1416), shared by the
 * roster row and the duel side. A leaf: colours arrive as props, since the
 * roster paints row state and the duel side paints the SIDE's faction.
 * `avatarUrl` picks what to draw (#2128); empty means a portrait-less person.
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
  /** 34 on the roster row, 28 on a duel side. */
  size: number
  background?: string
  borderColor: string
  /** Dashed for an unanswered invite, like its pill. */
  dashed?: boolean
  color?: string
  /** Empty/absent falls back to the monogram. */
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
          // The ring is the caller's state read; the portrait keeps it.
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
        // Ornament beside the text name: label tier, not the design's 13px.
        fontSize: 'var(--text-lg)',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {rosterInitials(name)}
    </span>
  )
}
