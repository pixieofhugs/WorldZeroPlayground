import { BadgedAvatar, type FactionAvatarProps } from './FactionAvatar'
import { SnideSigil } from '../sigil/SnideSigil'

/**
 * S.N.I.D.E. avatar — the standard circle on photocopier ink with an acid
 * circled-A membership badge clipped to the lower-right.
 */
export default function SnideAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        borderColor: 'var(--faction-snide-acid)',
        bg: 'var(--faction-snide-ink)',
        textColor: 'var(--faction-snide-acid)',
        fontFamily: 'var(--faction-snide-font-marker)',
      }}
      badgeBg="var(--faction-snide-ink)"
      badgeRing="var(--faction-snide-acid)"
      glyph={(s, color) => <SnideSigil size={s} color={color} />}
    />
  )
}
