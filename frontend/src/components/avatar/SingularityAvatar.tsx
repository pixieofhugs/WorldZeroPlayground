import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { SingularitySigil } from "../sigil/SingularitySigil";

/**
 * The Singularity avatar — a terminal-black circle in faction monospace plus a
 * blue membership badge carrying the prompt/cursor sigil. Singularity is
 * always-dark: its tokens are identical across themes, so no theme mutation is
 * needed. Colors via --faction-singularity-* tokens.
 */
export default function SingularityAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        borderColor: "var(--faction-singularity-border-hard)",
        bg: "var(--faction-singularity-card-bg)",
        textColor: "var(--faction-singularity-card-text)",
        fontFamily: "var(--font-faction-terminal)",
      }}
      badgeBg="var(--faction-singularity-card-bg)"
      badgeRing="var(--faction-singularity-card-muted)"
      glyph={(s, _color) => <SingularitySigil size={s} color="var(--faction-singularity-card-accent)" />}
    />
  );
}
