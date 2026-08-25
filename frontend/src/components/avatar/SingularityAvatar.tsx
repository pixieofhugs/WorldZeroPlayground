import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { factionRoleVar } from "../../utils/factionRoles";

/**
 * The Singularity avatar — a terminal-black circle in faction monospace plus a
 * blue membership badge carrying the prompt/cursor sigil. Singularity is
 * always-dark: its tokens are identical across themes, so no theme mutation is
 * needed. Colours come from the ROLE MAP (#2675).
 *
 * NO PREFIX HERE, AND THAT IS THE SHAPE OF THIS SURFACE. `factionRoleVars` has
 * to land on an element, and this component renders none: every colour below is
 * a discrete PROP of `BadgedAvatar`, which owns the disc. Declaring `--avatar-*`
 * on a root it does not have would resolve nowhere, so each role is read one at
 * a time — the case the law keeps `factionRoleVar` for, and the identical
 * string either way.
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
