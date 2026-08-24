import { BadgedAvatar, type FactionAvatarProps } from './FactionAvatar'
import { EverymenSigil } from '../sigil/EverymenSigil'

/**
 * Everymen avatar — the standard circle plus a red union membership badge
 * (cog sigil) clipped to the lower-right.
 */
export default function EverymenAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        borderColor: 'var(--everymen-ink)',
        bg: 'var(--everymen-paper)',
        textColor: 'var(--everymen-paper-text)',
        fontFamily: 'var(--font-display)',
      }}
      initialFontSize={[11, 14]}
      badgeBg="var(--everymen-red)"
      badgeRing="var(--everymen-cream)"
      glyph={(s, color) => <EverymenSigil size={s} color={color} />}
    />
  )
}
