import { BadgedAvatar, type FactionAvatarProps } from './FactionAvatar'
import { CARD, BORDER, INK, READING } from '../factionMarks/covenSlip'
import { CovenSigil } from '../sigil/CovenSigil'

/**
 * Cozy Coven avatar — a candle-lit disc inside the slip's pink edge, tagged with
 * the coven's mark.
 *
 * THE MOON IS GONE FROM THIS BADGE (#2217, reversing #1209). This file used to
 * draw a bespoke `MoonGlyph`, and the keep-ruling it carried argued that a
 * PENTAGRAM would be mud at 12–16px, so the crescent stayed rather than the
 * badge taking the faction's other device. That was never an argument about the
 * hat: `CovenSigil` is drawn specifically to survive 15px (a brim and a leaning
 * point are the whole silhouette) and it is the mark the dispatcher hands out
 * for a Coven TASK. A player was learning two symbols for one faction, and the
 * report also noted a crescent reads as a DORMANT state — iOS badges Focus Mode
 * with one. So the badge now mounts the sigil, exactly as the Everymen, S.N.I.D.E.,
 * Singularity, Ephemerists and UA avatars mount theirs.
 *
 * THE CRESCENT SURVIVES IN ONE PLACE, deliberately: `CovenVote`'s phase plate
 * builds a 1–5 rating out of moon phases. That is a game mechanic, not an
 * identity badge, and a hat cannot wax. It is the same mark/ornament split
 * `covenSlip` still makes for `Spark`, the four-point sparkle — do not collapse
 * it. (The badge that split once named, `SigilMark`, is gone: #2726 gave its
 * six remaining mounts to the hat as well.)
 *
 * The monogram takes the slip's reading face rather than Caveat: Cormorant is
 * what the design letters a disc in, and one hand-script capital inside a 24px
 * circle loses its stroke contrast. `INK` on `CARD` is a measured pair.
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
      // The badge ring's colour is the glyph's ink here, as it is for every
      // other `BadgedAvatar`: the hat is knocked out of the faction fill.
      glyph={(s, color) => <CovenSigil size={s} color={color} />}
    />
  )
}
