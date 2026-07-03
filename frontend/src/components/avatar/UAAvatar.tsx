import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { UACrest } from "../cards/UACrest";

/**
 * UA (University of Asthmatics) avatar — the Salon "Artist in Residence"
 * portrait: a parchment disc ringed in gilt with a regal italic monogram (or
 * the character's uploaded portrait), plus the heraldic UA crest clipped to the
 * lower-right as the membership badge.
 *
 * Reuses the shared BadgedAvatar shell (image/initial circle + corner badge)
 * and the repo's own {@link UACrest} for the badge glyph rather than porting a
 * separate sigil. UA is ALWAYS LIGHT: its --ua-* / --faction-ua-* tokens are
 * identical in both themes, so the salon styles itself with them and never
 * mutates data-theme. All colors via tokens (never hardcode hex — CLAUDE.md).
 */
export default function UAAvatar({ character, size }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      circle={{
        borderColor: "var(--ua-orange)",
        bg: "var(--faction-ua-card-bg)",
        textColor: "var(--ua-ink)",
        fontFamily: "var(--faction-ua-card-font)",
      }}
      badgeBg="var(--ua-paper-warm)"
      badgeRing="var(--ua-gold)"
      // The crest is a shield (100×120 viewBox); render it square at badge
      // scale — BadgedAvatar hands us the inner glyph size and the ring color
      // (unused here; the crest carries its own --ua-* palette).
      glyph={(s) => <UACrest width={s} height={s} />}
    />
  );
}
