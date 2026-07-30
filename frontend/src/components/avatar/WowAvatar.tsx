import i18n from "../../i18n";
import { mediaUrl } from "../../utils/media";
import { WowSigil } from "../sigil/WowSigil";
import { avatarDim, type FactionAvatarProps } from "./FactionAvatar";

/**
 * WowAvatar — the player seal (kit §"Faction Avatar", #897).
 *
 * WOW does not wear the shared `BadgedAvatar` (a plain circle plus a corner
 * membership sigil). Its avatar is a bespoke composition: the crest set in a
 * GILT ROPE RING — a conic gradient struck from 210deg — behind a PLUM INNER
 * RIM, with the RANK PILL riding the hem. Four of the five parts are the ring;
 * the sigil is not a corner mark here, it is the field.
 *
 * WHAT SITS IN THE FIELD. The kit draws the crest there, because a mock has no
 * portrait to draw. A real player usually does, so: portrait when there is one,
 * the CREST when there is not. The house fallback elsewhere is a monogram
 * initial, and this deliberately departs from it — the kit's own composition is
 * ring-plus-crest, and a WOW player with no portrait wearing the faction seal is
 * the drawing as designed. The cost is that two portrait-less WOW players look
 * alike at a glance; every surface that renders an avatar renders a name beside
 * it, so the seal is never the only identifier. Flagged for veto in #897.
 *
 * SIZING. The kit draws one 118px plate. Everything below is that plate's own
 * proportion of 118, so the seal holds together from the 24px comment avatar up
 * to a profile header — nothing is a fixed pixel borrowed from the mock.
 *
 * THEME. The ring, the rim and the pill are struck metal and do not flip (see
 * the crest note in index.css); the FIELD the coin is mounted on does, cream to
 * the kit's dark ground, straight off the `[data-theme="dark"]` cascade.
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
 */
const RANK_PILL_FLOOR_PX = 64;

/** Smallest legible pill type, once the proportional size drops under it. */
const RANK_PILL_MIN_FONT_PX = 9;

export default function WowAvatar({ character, size }: FactionAvatarProps) {
  const dim = avatarDim(size);
  // The kit's plate: 5px of ring round a 2px-rimmed field, on 118px.
  const ring = Math.max(2, Math.round(dim * 0.042));
  const rim = Math.max(1, Math.round(dim * 0.017));
  const field = dim - 2 * ring - 2 * rim;
  // 94 of the field's 104 — the coin nearly fills it, and the corners of its
  // box are clipped by the round field exactly as they are in the kit.
  const crest = Math.round(field * 0.9);
  const pillFont = Math.max(RANK_PILL_MIN_FONT_PX, Math.round(dim * 0.102));

  return (
    <span style={{ position: "relative", display: "inline-block", width: dim, height: dim }}>
      <span
        style={{
          display: "block",
          width: dim,
          height: dim,
          borderRadius: "50%",
          background: "var(--faction-wow-avatar-ring)",
          padding: ring,
          boxSizing: "border-box",
          boxShadow: `0 ${Math.round(dim * 0.085)}px ${Math.round(dim * 0.186)}px ${-Math.round(dim * 0.085)}px var(--faction-wow-chronicle-shadow)`,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "var(--faction-wow-avatar-field)",
            border: `${rim}px solid var(--faction-wow-crest-field-rim)`,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {character.avatar_url ? (
            <img
              src={mediaUrl(character.avatar_url)}
              alt={character.username}
              className="rounded-full object-cover"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          ) : (
            <WowSigil size={crest} />
          )}
        </span>
      </span>

      {dim >= RANK_PILL_FLOOR_PX && (
        <span
          style={{
            position: "absolute",
            bottom: -Math.round(dim * 0.034),
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--faction-wow-card-font)",
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
