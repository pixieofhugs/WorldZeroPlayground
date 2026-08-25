import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { UaSigil } from "../sigil/UaSigil";
import { factionRoleVar } from "../../utils/factionRoles";

/**
 * UA avatar — the portrait ringed in the practice's own orange, with the ensō
 * as the membership medallion at the corner (kit §11, #851).
 *
 * The kit frames the portrait in a faint full ensō ring. At the sizes this
 * component actually renders (24-32px) a two-arc brushstroke around a 24px disc
 * is mud, so the ring is the plain orange stroke the shared circle already
 * draws and the ensō does its work in the badge, where it is the FACTION MARK —
 * one of the mark's two sanctioned uses (brief §4).
 *
 * Both themes come from the `[data-theme="dark"]` cascade; the badge sits on
 * `--faction-ua-lift`, which dims with everything else.
 */
export default function UaAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        /*
         * THE ROLE, NOT THE TOKEN (#2659/#2673) â€” the SINGULAR resolver,
         * because this file owns no element. The three values below are props
         * handed to `BadgedAvatar`, which draws the disc; there is no root here
         * to spread a prefix onto. Each call returns the same
         * `var(--faction-ua-*)` string that was written here, so nothing moves.
         */
        borderColor: factionRoleVar("ua", "fill"),
        bg: "var(--faction-ua-panel)",
        textColor: factionRoleVar("ua", "ink"),
        fontFamily: factionRoleVar("ua", "face"),
      }}
      badgeBg="var(--faction-ua-lift)"
      badgeRing="var(--faction-ua-border)"
      // The ensō is square; the badge slot is square. It carries its own
      // --faction-ua-glow stroke, so the ring colour is unused here.
      glyph={(s) => <UaSigil width={s} height={s} />}
    />
  );
}
