import { BadgedAvatar, type FactionAvatarProps } from './FactionAvatar'
import { CARD, BORDER, INK, READING } from '../factionMarks/covenSlip'
import { CovenSigil } from '../sigil/CovenSigil'

/**
 * Cozy Coven avatar: a candle-lit disc in the slip's pink edge, badged with the
 * hat sigil (#2217; the moon reads as a dormant state). The crescent survives
 * only in `CovenVote`'s phase rating, a mechanic, not an identity mark.
 * The monogram uses the reading face; Caveat loses contrast at 24px.
 */
export default function CovenAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        borderColor: BORDER,
        bg: CARD,
        textColor: INK,
        fontFamily: READING,
      }}
      badgeBg="var(--faction-coven)"
      badgeRing={CARD}
      glyph={(s, color) => <CovenSigil size={s} color={color} />}
    />
  )
}
