import { BadgedAvatar, type FactionAvatarProps } from './FactionAvatar'

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
 * Warriors of Whimsy avatar — the standard circle with a pink "coven" moon membership
 * badge clipped to the lower-right.
 */
export default function WowAvatar({ character, size }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      circle={{
        borderColor: 'var(--faction-wow-win-border)',
        bg: 'var(--faction-wow-notepad-bg)',
        textColor: 'var(--faction-wow-card-text)',
        fontFamily: 'var(--faction-wow-card-font)',
      }}
      badgeBg="var(--faction-wow)"
      badgeRing="var(--faction-wow-notepad-bg)"
      glyph={(s, color) => <MoonGlyph size={s} color={color} />}
    />
  )
}
