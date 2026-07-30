import { BadgedAvatar, type FactionAvatarProps } from './FactionAvatar'
import { CARD, BORDER, INK, READING } from '../cards/covenSlip'

/** Crescent-moon sigil. */
function MoonGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 12a6.5 6.5 0 0 1-8.4 6.2 7.5 7.5 0 1 0 0-12.4A6.5 6.5 0 0 1 16.5 12Z"
        fill={color}
      />
    </svg>
  )
}

/**
 * Cozy Coven avatar — a candle-lit disc inside the slip's pink edge, tagged with
 * the coven's moon.
 *
 * THE MOON STAYS (#1209). The `coven.exe` sweep swapped this file's window
 * tokens (`-win-border`, `-notepad-bg`) for the slip's border and the ward's
 * panel ground and left the glyph alone: the crescent is not a lo-fi mark, it is
 * the same moon `CovenVote`'s phase plate is built from, and that plate was
 * explicitly kept. A pentagram at badge size (12–16px) would be mud anyway,
 * which is the reason `CovenSigil`'s four-point sparkle exists at all.
 *
 * The monogram takes the slip's reading face rather than Caveat: Cormorant is
 * what the design letters a disc in, and one hand-script capital inside a 24px
 * circle loses its stroke contrast. `INK` on `CARD` is a measured pair.
 */
export default function CovenAvatar({ character, size }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      circle={{
        borderColor: BORDER,
        bg: CARD,
        textColor: INK,
        fontFamily: READING,
      }}
      badgeBg="var(--faction-coven)"
      badgeRing={CARD}
      glyph={(s, color) => <MoonGlyph size={s} color={color} />}
    />
  )
}
