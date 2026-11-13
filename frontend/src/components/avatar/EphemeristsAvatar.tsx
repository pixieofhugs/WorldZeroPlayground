import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import { BAND, BAND_INK, BRASS, CAPS, DISC, GOLD, PLATE } from "../factionMarks/ephemeristsPlate";

/**
 * Ephemerists avatar: the plate medallion ruled in brass, badged with the kite
 * sigil (reduced-detail cut, #1635). All `--faction-ephemerists-plate-*` (#1208):
 * initial `band-ink` on `disc` (7.59:1), sigil `gold` on `band`. Not `ink`: the
 * disc does not flip, and `-plate-ink` by day is 1.00:1 on it (#2141).
 */
export default function EphemeristsAvatar({ character, size, badge }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      badge={badge}
      circle={{
        borderColor: BRASS,
        bg: DISC,
        textColor: BAND_INK,
        fontFamily: CAPS,
      }}
      initialFontSize={[11, 14]}
      badgeBg={BAND}
      badgeRing={PLATE}
      glyph={(s, _color) => <EphemeristsSigil size={s} color={GOLD} />}
    />
  );
}
