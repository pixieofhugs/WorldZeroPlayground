import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { UaSigil } from "../sigil/UaSigil";
import { factionRoleVar } from "../../utils/factionRoles";

/**
 * UA avatar (#851): the portrait in a plain orange ring (a brushstroke ensō is
 * mud at 24px), with the ensō as the badge mark.
 */
export default function UaAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        // Singular resolver: no element here to spread a prefix on (#2673).
        borderColor: factionRoleVar("ua", "fill"),
        bg: "var(--faction-ua-panel)",
        textColor: factionRoleVar("ua", "ink"),
        fontFamily: factionRoleVar("ua", "face"),
      }}
      badgeBg="var(--faction-ua-lift)"
      badgeRing="var(--faction-ua-border)"
      // The ensō carries its own stroke; the ring colour is unused.
      glyph={(s) => <UaSigil width={s} height={s} />}
    />
  );
}
