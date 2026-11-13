import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { WowSigil } from "../sigil/WowSigil";
import { AVATAR_ROOT, BadgedAvatar, avatarDim, type FactionAvatarProps } from "./FactionAvatar";

/**
 * WowAvatar, the player seal (#897). Wears the shared `BadgedAvatar` (#2241,
 * #2242): portrait or monogram in the field, the crown as the corner badge.
 * The gilt rope ring, plum rim and rank pill keep the plate's composition.
 *
 * Sizes are proportions of the kit's 118px plate. Ring, rim, badge (crown 5.79:1
 * on its cream) and pill are theme-invariant struck metal; only the field flips.
 */

/**
 * Below this diameter the rank pill is dropped: it would occlude a third of the
 * disc, and the level is printed beside the avatar anyway.
 *
 * ponytail: above it the pill touches the corner badge. No mount reaches 64
 * (max is 54); a real large plate needs a design call on which yields.
 */
const RANK_PILL_FLOOR_PX = 64;

/** Smallest legible pill type, once the proportional size drops under it. */
const RANK_PILL_MIN_FONT_PX = 9;

export default function WowAvatar({ character, size, badge }: FactionAvatarProps) {
  const dim = avatarDim(size);
  // Kit plate: 5px ring on 118px; the 2px rim is the shared circle's border.
  const ring = Math.max(2, Math.round(dim * 0.042));
  const rim = Math.max(1, Math.round(dim * 0.017));
  const pillFont = Math.max(RANK_PILL_MIN_FONT_PX, Math.round(dim * 0.102));

  return (
    <span
      style={{
        // Role map (#2674) on the root: `BadgedAvatar` takes plain strings.
        ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-avatar"),
        ...AVATAR_ROOT,
        width: dim,
        height: dim,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: dim,
          height: dim,
          borderRadius: "50%",
          background: "var(--faction-wow-avatar-ring)",
          padding: ring,
          boxSizing: "border-box",
          boxShadow: `0 ${Math.round(dim * 0.085)}px ${Math.round(dim * 0.186)}px ${-Math.round(dim * 0.085)}px var(--faction-wow-chronicle-shadow)`,
        }}
      >
        <BadgedAvatar
          character={character}
          size={dim - 2 * ring}
          badge={badge}
          circle={{
            borderColor: "var(--faction-wow-plum-surface)",
            bg: "var(--faction-wow-avatar-field)",
            textColor: "var(--wow-avatar-ink)",
            fontFamily: "var(--wow-avatar-face)",
          }}
          badgeBg="var(--faction-wow-crest-field)"
          badgeRing="var(--faction-wow-chronicle-gold)"
          // Gilt rim, so the crown keeps its declared plum (not knocked out).
          glyph={(s) => <WowSigil size={s} />}
        />
      </span>

      {dim >= RANK_PILL_FLOOR_PX && (
        <span
          style={{
            position: "absolute",
            bottom: -Math.round(dim * 0.034),
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--wow-avatar-face)",
            fontSize: pillFont,
            letterSpacing: "0.04em",
            lineHeight: 1.2,
            color: "var(--faction-wow-avatar-pill-text)",
            background:
              "linear-gradient(180deg, var(--faction-wow-avatar-pill-from), var(--faction-wow-avatar-pill-to))",
            border: `${rim}px solid var(--faction-wow-avatar-pill-border)`,
            borderRadius: "20px",
            padding: `${Math.round(dim * 0.017)}px ${Math.round(dim * 0.101)}px`,
            whiteSpace: "nowrap",
            boxShadow: `0 ${rim}px ${2 * rim}px var(--faction-wow-chronicle-shadow)`,
          }}
        >
          {i18n.t("common:avatar.rank", { level: character.level })}
        </span>
      )}
    </span>
  );
}
