import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { WowSigil } from "../sigil/WowSigil";
import { AVATAR_ROOT, BadgedAvatar, avatarDim, type FactionAvatarProps } from "./FactionAvatar";

/**
 * WowAvatar — the player seal (kit §"Faction Avatar", #897).
 *
 * WOW WEARS THE SHARED `BadgedAvatar` (#2241, #2242 — the veto flagged in #897,
 * now taken). This file used to draw the crest IN THE FIELD and the portrait
 * only when there was one, so crest and portrait competed for a single slot:
 * a member with a portrait wore no faction mark at all (#2241), and a member
 * without one never got the house monogram (#2242). One defect, reported from
 * both ends. The exemption was argued against the OLD gilt crest — a coin whose
 * own `MOTTO_FLOOR_PX` conceded it could not hold below ~40px — and `WowSigil`
 * is now a Sigil Studies v2 mark drawn, like the Coven hat, to survive badge
 * size. The rule outlived its reason:
 *
 *   > This rule made sense with the old WOW sigil, but we redesigned sigils in
 *   > part to stop things like this.
 *
 * So the field carries the PORTRAIT, or the monogram initial when there is
 * none, and the crown is the corner membership badge — exactly as the Everymen,
 * S.N.I.D.E., Singularity, Ephemerists, Coven and UA avatars carry theirs. Two
 * portrait-less WOW members no longer look alike at a glance, which is the cost
 * the old note conceded rather than a new one.
 *
 * THE PLATE IS NOT FLATTENED. Adopting the shared badge is not licence to drop
 * the composition to a plain circle: the GILT ROPE RING — a conic gradient
 * struck from 210deg — still wraps it, the PLUM INNER RIM is the shared
 * circle's own border, and the RANK PILL still rides the hem. What changed is
 * what sits in the field and where the crown goes.
 *
 * THE BADGE IS A STRUCK MEDALLION, not a plum chip: cream field, gilt rim, the
 * crown in its own declared plum (5.79:1 on that cream). Every one of those
 * three is a theme-INVARIANT `--faction-wow-crest-*` / `-chronicle-gold` token,
 * for the same reason the ring and the pill are — struck metal does not repaint
 * itself for the dark page.
 *
 * SIZING. The kit draws one 118px plate. Everything below is that plate's own
 * proportion of 118, so the seal holds together from the 24px comment avatar up
 * to a profile header — nothing is a fixed pixel borrowed from the mock. The
 * shared badge takes the diameter INSIDE the ring, so its own corner mark lands
 * on the ring's edge rather than inside the field.
 *
 * THEME. The ring, the rim, the badge and the pill are struck metal and do not
 * flip (see the crest note in index.css); the FIELD the coin is mounted on
 * does, cream to the kit's dark ground, straight off the `[data-theme="dark"]`
 * cascade — and `--faction-wow-card-text` is the ink that flips with it
 * (14.02:1 light, 13.8:1 dark).
 */

/**
 * Below this rendered diameter the rank pill is dropped.
 *
 * The pill is 12px type on the kit's 118px plate — 10% of the diameter — so it
 * is sub-7px on the 64px avatars this app actually renders at its largest and
 * sub-3px in a 24px comment row. Even floored at 9px it would occlude a third of
 * the disc below 64px, which costs the crest more than the rank is worth: the
 * level is already written next to the avatar on every surface that has room for
 * it. So the pill appears on the big plates and nowhere else.
 *
 * ponytail: at or above this floor the hem is now shared with the corner badge,
 * and the two would touch. No mount in the app reaches 64 (the largest is the
 * players roster's 54), so the collision is unreachable outside the preview
 * kit; a real large plate wants a design call on which of the two yields.
 */
const RANK_PILL_FLOOR_PX = 64;

/** Smallest legible pill type, once the proportional size drops under it. */
const RANK_PILL_MIN_FONT_PX = 9;

export default function WowAvatar({ character, size, badge }: FactionAvatarProps) {
  const dim = avatarDim(size);
  // The kit's plate: 5px of ring round the field, on 118px. The 2px rim inside
  // it is the shared circle's border.
  const ring = Math.max(2, Math.round(dim * 0.042));
  const rim = Math.max(1, Math.round(dim * 0.017));
  const pillFont = Math.max(RANK_PILL_MIN_FONT_PX, Math.round(dim * 0.102));

  return (
    <span
      style={{
        // THE ROLE MAP (#2674). Declared on the plate's own root, because the
        // two reads below are handed to `BadgedAvatar` as PROPS — a shared,
        // faction-blind component that must keep taking a plain string. A
        // custom property crosses that boundary where a prefix could not.
        ...factionRoleVars("wow", "wow-avatar"),
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
            borderColor: "var(--faction-wow-crest-field-rim)",
            bg: "var(--faction-wow-avatar-field)",
            textColor: "var(--wow-avatar-ink, var(--faction-wow-card-text))",
            fontFamily: "var(--wow-avatar-face, var(--faction-wow-card-font))",
          }}
          badgeBg="var(--faction-wow-crest-field)"
          badgeRing="var(--faction-wow-chronicle-gold)"
          // The badge's rim is gilt, so the crown is NOT knocked out of it: the
          // mark keeps the plum it is declared in on all eight of its mounts.
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
            fontFamily: "var(--wow-avatar-face, var(--faction-wow-card-font))",
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
