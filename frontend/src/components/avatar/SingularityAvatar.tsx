import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { factionRoleVar } from "../../utils/factionRoles";

/**
 * Singularity avatar: terminal-black disc, blue badge with the prompt sigil.
 * Always-dark. Roles are read singly via `factionRoleVar` (#2675): this
 * component owns no element to spread a prefix on.
 */
export default function SingularityAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        borderColor: "var(--faction-singularity-border-hard)",
        bg: factionRoleVar("singularity", "paper"),
        textColor: factionRoleVar("singularity", "ink"),
        fontFamily: "var(--font-faction-terminal)",
      }}
      badgeBg={factionRoleVar("singularity", "paper")}
      badgeRing={factionRoleVar("singularity", "quiet")}
      glyph={(s, _color) => <SingularitySigil size={s} color={factionRoleVar("singularity", "accent")} />}
    />
  );
}
