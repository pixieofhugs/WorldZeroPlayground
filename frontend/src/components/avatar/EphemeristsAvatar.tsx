import { BadgedAvatar, type FactionAvatarProps } from "./FactionAvatar";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import { BAND, BAND_INK, BRASS, CAPS, DISC, GOLD, PLATE } from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists avatar — the plate's medallion field ruled in brass, with the
 * night band's disc as the membership badge carrying the faction sigil (the
 * kite). The badge glyph is 7-11px, so the sigil serves it with its
 * reduced-detail cut (#1635); it no longer passes a stroke, because the mark
 * floors its own rule at a device pixel from `size`.
 *
 * The one Ephemerists mark that renders inside components this faction does not
 * own — the praxis card's byline, rosters, the feed, the constellation — which
 * is why it was the last thing still painting the codex on plate surfaces
 * (#1208). Every colour is a `--faction-ephemerists-plate-*` token now: the
 * initial is `band-ink` on the medallion `disc` (7.59:1, both themes) and the
 * sigil is `gold` on the `band` (9.4 / 14.0). `brass` draws the ring and nothing
 * else, per its declaration.
 *
 * THE INITIAL WAS `ink` UNTIL #2141 gave the register a light half. The disc is
 * a dark chip that does not flip, `-plate-ink` became #12151f by day, and the
 * pair went to 1.00:1 — an invisible initial with every check still green,
 * because both ends are real tokens. The disc's ink budget is the band's.
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
