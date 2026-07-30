import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import { BAND, BRASS, CAPS, DISC, GOLD, INK, PLATE } from "../cards/ephemeristsPlate";

/**
 * The Ephemerists avatar — the plate's medallion field ruled in brass, with the
 * night band's disc as the membership badge carrying the faction sigil (the
 * watching wanderer).
 *
 * The one Ephemerists mark that renders inside components this faction does not
 * own — the praxis card's byline, rosters, the feed, the constellation — which
 * is why it was the last thing still painting the codex on plate surfaces
 * (#1208). Every colour is a `--faction-ephemerists-plate-*` token now: the
 * initial is `ink` on the medallion `disc` (13.3:1 light, 14.6:1 dark) and the
 * sigil is `gold` on the `band` (9.4 / 14.0). `brass` draws the ring and nothing
 * else, per its declaration.
 */
export default function EphemeristsAvatar({ character, size }: FactionAvatarProps) {
  return (
    <BadgedAvatar
      character={character}
      size={size}
      circle={{
        borderColor: BRASS,
        bg: DISC,
        textColor: INK,
        fontFamily: CAPS,
      }}
      initialFontSize={[11, 14]}
      badgeBg={BAND}
      badgeRing={PLATE}
      glyph={(s, _color) => <EphemeristsSigil size={s} color={GOLD} stroke={1.4} />}
    />
  );
}
