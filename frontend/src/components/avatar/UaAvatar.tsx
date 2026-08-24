import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { UaSigil } from "../sigil/UaSigil";

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
        borderColor: "var(--faction-ua)",
        bg: "var(--faction-ua-panel)",
        textColor: "var(--faction-ua-card-text)",
        fontFamily: "var(--faction-ua-card-font)",
      }}
      badgeBg="var(--faction-ua-lift)"
      badgeRing="var(--faction-ua-border)"
      // The ensō is square; the badge slot is square. It carries its own
      // --faction-ua-glow stroke, so the ring colour is unused here.
      glyph={(s) => <UaSigil width={s} height={s} />}
    />
  );
}
