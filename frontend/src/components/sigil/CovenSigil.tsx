/**
 * CovenSigil — THE WITCH HAT. Cozy Coven's mark (Sigil Studies v2).
 *
 * One path, eight subpaths, `fill-rule: evenodd`: a wide brim, a cone that
 * leans and curls to the right the way a soft hat does, and six overlapping
 * discs where the two meet — a bubbling cluster that the even-odd rule alternates
 * into holes and islands, so the buckle reads as light coming THROUGH the hat
 * rather than as a second colour laid on it. That is what carries it down to
 * 15px: the silhouette is a brim and a leaning point, and both survive at any
 * size a badge asks for.
 *
 * WHAT THIS FILE USED TO HOLD, and where it went. This component was a
 * four-point sparkle, and the sparkle was never really this faction's badge — it
 * was its ORNAMENT: a gold twinkle used as a bullet before button text, as the
 * glyph beside a stat numeral, and eight at a time drifting across the profile
 * band's scatter field. Nine mounts, every one passing
 * `--faction-coven-slip-gold` or the CTA ink. A witch hat cannot do that job,
 * and a sparkle was never going to be the mark a faction is recognised by, so
 * the two roles are separated rather than one of them being lost: the sparkle
 * is now `Spark` in `factionMarks/covenSlip.tsx`, which is the module that
 * exists to hold "the marks every swept surface needs, drawn once" (#1209).
 * Every one of those nine mounts draws exactly what it drew before.
 *
 * THIS IS NOW THE FACTION'S ONLY MARK OF IDENTITY (#2726), and the note that
 * stood here said the opposite — that `covenSlip`'s pentagram `SigilMark` still
 * badged the slip. It does not; it is deleted. The hat is what the dispatcher
 * hands out, what `CovenAvatar` badges a MEMBER with (#2217), what the
 * directory tile draws (#2325), and now what the faction hero, the faction
 * body's join band, the task detail header, the duel seal band, the composer
 * masthead and the mobile field desk draw. A player meets ONE symbol for this
 * faction. The crescent the avatar used to draw is retired with it; the moon
 * survives only inside `CovenVote`'s phase plate, where it is a 1-5 mechanic
 * and not an identity.
 *
 * Coven's OTHER devices are not displaced and are not identity: `Spark`, the
 * four-point sparkle ornament, and `CovenCat`, the turning watermark. Both live
 * in `covenSlip` and its header says why they stay apart from the mark.
 *
 * ONE INK, WHOLESALE. `color` defaults to `--faction-coven`, which is the token
 * the design's own cell names and the sparkle's default before it. Never a hex.
 */

/** Ported verbatim from `.design-sync/sigils/Sigil-Studies-v2.dc.html`, the
 *  Cozy Coven "New" band. Subpaths: brim, cone, then six discs. `fill-rule:
 *  evenodd` is load-bearing — the discs overlap each other and the hat, and
 *  without it they merge into one blob over the brim. */
const HAT =
  "M4 78C14 66 32 62 50 62C68 62 86 66 96 78C86 88 68 92 50 92C32 92 14 88 4 78ZM34 68C36 42 48 22 74 4C68 24 64 46 63 68ZM48.5 50.5L48 53L47 55L45.5 56.5L43.5 57.5L41 58L38.5 57.5L36.5 56.5L35 55L34 53L33.5 50.5L34 48L35 46L36.5 44.5L38.5 43.5L41 43L43.5 43.5L45.5 44.5L47 46L48 48L48.5 50.5ZM57.5 57L57 59.5L56 61.5L54.5 63L52.5 64L50 64.5L47.5 64L45.5 63L44 61.5L43 59.5L42.5 57L43 54.5L44 52.5L45.5 51L47.5 50L50 49.5L52.5 50L54.5 51L56 52.5L57 54.5L57.5 57ZM54 67.5L53.5 70L52.5 72L51 74L49 75L46.5 75L44.5 75L42 74L40.5 72L39.5 70L39 67.5L39.5 65.5L40.5 63.5L42 61.5L44.5 60.5L46.5 60L49 60.5L51 61.5L52.5 63.5L53.5 65.5L54 67.5ZM43 67.5L42.5 70L41.5 72L40 74L37.5 75L35.5 75L33 75L31 74L29.5 72L28.5 70L28 67.5L28.5 65.5L29.5 63.5L31 61.5L33 60.5L35.5 60L37.5 60.5L40 61.5L41.5 63.5L42.5 65.5L43 67.5ZM39.5 57L39 59.5L38 61.5L36.5 63L34.5 64L32 64.5L29.5 64L27.5 63L26 61.5L25 59.5L24.5 57L25 54.5L26 52.5L27.5 51L29.5 50L32 49.5L34.5 50L36.5 51L38 52.5L39 54.5L39.5 57ZM45.5 60L45.5 61.5L44.5 62.5L43.5 63.5L42.5 64.5L41 64.5L39.5 64.5L38.5 63.5L37.5 62.5L36.5 61.5L36.5 60L36.5 58.5L37.5 57.5L38.5 56.5L39.5 55.5L41 55.5L42.5 55.5L43.5 56.5L44.5 57.5L45.5 58.5L45.5 60Z";

export function CovenSigil({
  size = 22,
  color = "var(--faction-coven)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path fillRule="evenodd" d={HAT} />
    </svg>
  );
}
