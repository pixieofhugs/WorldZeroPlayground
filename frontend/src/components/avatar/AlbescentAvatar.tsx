import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import AlbescentSigil from "../cards/AlbescentSigil";

/**
 * Albescent avatar (Tier-3 surface, #232). A white cotton-paper disc with a
 * hairline ink ring and the character's monogram (or uploaded portrait), badged
 * with the surveyor's-cross-hair {@link AlbescentSigil} — the faction's only
 * sigil. No hue, no crest: the order leaves no trace.
 *
 * Reuses the shared BadgedAvatar shell and the existing AlbescentSigil atom
 * (slice 1). Albescent is ALWAYS LIGHT — its --faction-albescent-* tokens are
 * identical in both themes, so it never mutates data-theme; all colors via
 * tokens (never hardcode hex — CLAUDE.md).
 */
export default function AlbescentAvatar({ character, size }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      circle={{
        borderColor: "var(--faction-albescent-card-accent)",
        bg: "var(--faction-albescent-card-bg)",
        textColor: "var(--faction-albescent-card-text)",
        fontFamily: "var(--faction-albescent-card-font)",
      }}
      badgeBg="var(--faction-albescent-surface)"
      badgeRing="var(--faction-albescent-border)"
      glyph={(s) => <AlbescentSigil size={s} />}
    />
  );
}
