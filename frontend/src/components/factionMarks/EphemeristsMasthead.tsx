import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import {
  BAND_INK,
  BAND_QUIET,
  BRASS,
  CAPS,
  GOLD,
  READING,
} from "./ephemeristsPlate";
import { factionName } from "../../utils/factions";
import { formatDate } from "../../utils/dates";

/**
 * THE ENGRAVED MASTHEAD (#1634) — the head of every Ephemerists surface, and the
 * end of the deco wordmark it replaces.
 *
 * A row: the kite sigil on the left, and a column holding two stacked bands —
 * the wordmark in incised small caps, and a datum row of date, right ascension
 * and declination, ruled off above and below and closed by the sigil again at
 * inline scale. A four-kanji register sat between them until #1909 cut all eight
 * of its strings; the note below the coordinates records what went.
 *
 * WHAT IT REPLACED, AND WHY IT IS ONE COMPONENT. Four surfaces each drew the
 * same centred stack — a 150–176px winged sun disc over the faction's name in
 * letterspaced Poiret One — in four copies that could not see each other
 * (WORLD_ZERO_STYLE §6, "duplication is discovered by the next consumer"). The
 * masthead is the fifth consumer arriving, so the stack becomes a component
 * rather than a fifth copy. The winged disc goes with it: #1634's ruling is that
 * the sigil is the only mark, and the disc was only ever the wordmark's crown.
 *
 * IT MOUNTS ON THE CORNICE BAND. Its two inks — {@link BAND_INK} for the
 * wordmark, {@link BAND_QUIET} for the datum row — are the pair measured against
 * `--faction-ephemerists-plate-band`, and all four mounts are that band. A plate
 * mount would be a different (ink, ground) pairing and therefore a prop, not an
 * assumption to leave standing: WORLD_ZERO_STYLE §3's rule is that a component's
 * inks belong to the sheet they were measured on. Nothing here flips with the
 * theme; the whole plate register is theme-invariant (#1627).
 *
 * TWO SCALES, ONE PROP. `page` heads a whole page, `card` heads a sheet. The
 * design carries both, and every rung of both tables below is on the type or
 * spacing scale — see {@link SIZES} for the three places the scale had no step.
 */

/** The design's grid. It was shared by the glyph row and the datum row so their
 *  cells lined up; the glyph row is gone (#1909) and the datum row keeps it. The
 *  fourth column is narrower and right-aligned: it is the row's closing mark
 *  rather than a fourth reading. */
const COLUMNS = "1.1fr 1fr 1fr 0.9fr";

/**
 * THE DATUM ROW'S COORDINATES — an easter egg, and a fixed pair.
 *
 * The design hardcoded a different plausible pair per surface, which is
 * decoration wearing the appearance of data. Owner ruling: the date is real (the
 * surface's own) and the coordinates point at one real place — the Oregon
 * Country Fairgrounds, Veneta, Oregon, at 44.0534° N, 123.3704° W. Both cells
 * name the same spot in the datum row's own units, so neither is invented:
 *
 *  • DECLINATION is the fairgrounds' LATITUDE. A star at declination +44° 03′
 *    passes through the zenith there — that is the definition of declination,
 *    not a fudge. 0.0534° × 60 = 3.2′, so 44° 03′.
 *  • RIGHT ASCENSION is the fairgrounds' LONGITUDE in RA's own unit. Right
 *    ascension runs 24ʰ to the circle, so 123.3704 / 15 = 8.2247ʰ and
 *    0.2247 × 60 = 13.5ᵐ, giving 8ʰ 13ᵐ. The sign convention is WEST longitude
 *    as a POSITIVE hour angle, which is what keeps the figure inside 0–24ʰ;
 *    measured eastward the same place reads 15ʰ 47ᵐ.
 *
 * It is never labelled in user-visible copy, and it must not become one. An egg
 * rewards noticing; a caption spends it.
 */
const RIGHT_ASCENSION = "8ʰ 13ᵐ";
const DECLINATION = "+44° 03′";

/*
 * THE FOUR-KANJI REGISTER IS GONE (#1909) — 星 暦 観 録, "star · almanac ·
 * observation · record", and the ruled band it sat in.
 *
 * All EIGHT of its strings are on the copy audit's CUT list: the four marks and
 * the four English glosses that `title`'d them. No other faction had a register
 * row, and the audit ruled the masthead a generic surface, so the slot goes
 * rather than settling to a shared wording — there is nothing shared to settle
 * onto. The wordmark now sits straight above the datum row.
 *
 * ponytail: this leaves a masthead of two bands where the design drew three, and
 * the datum row inherits none of the register's rules. Ceiling: I have no
 * browser, so the two-band proportion is unverified at either scale. Upgrade
 * path: `frontend-style` re-rules the wordmark/datum seam, or the audit's own
 * "put it back in intentionally" restores a register under keys of its own.
 */

export type MastheadScale = "page" | "card";

interface MastheadSize {
  /** The sigil's box. It was a HEIGHT while the mark owned a 486:560 ratio
   *  (#1635); Sigil Studies v2 draws the kite square, so this is both
   *  dimensions and the mark is ~15% wider here than it was. Ornament. */
  sigil: number;
  wordmark: string;
  datum: string;
  padding: string;
  gap: string;
  /** The grid's own column gap. Ornament geometry rounded to the scale. */
  columnGap: string;
  /** The datum row's closing sigil. It used to sit below #1635's 20px reduced
   *  cut on purpose; v2 is filled rather than stroked and has no cut, so this
   *  is now simply the size the datum row was drawn at. */
  inlineSigil: number;
}

/**
 * The design's two size tables, mapped onto the type and spacing scales.
 *
 * The sigil sizes stay raw: a drawn mark's dimensions are ornament geometry and
 * never spacing (§4a). Everything else takes a rung, and one of them needed a
 * decision because the scale has no step at the design's number:
 *
 *  • the wordmarks are drawn at 26 and 19 and take `--text-title` (24) and
 *    `--text-content` (18) — the rungs the composer's own wordmark comment
 *    already picked for 19.
 *
 * The two glyph rungs that used to be decided here left with the kanji register
 * (#1909); the `glyph` field went with them.
 *
 * The four spacing values are all ties (20, 14, 14, 10) and all round UP, per
 * §4a. The paddings are asymmetric, so they are checked against §4a's carve-out
 * and kept: `24 24 16` and `12 16 8` both preserve the design's top-heavier
 * shape, which rounding down would flatten.
 */
const SIZES: Record<MastheadScale, MastheadSize> = {
  page: {
    sigil: 62,
    wordmark: "var(--text-title)",
    datum: "var(--text-md)",
    padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
    gap: "var(--space-xl)",
    columnGap: "var(--space-lg)",
    inlineSigil: 14,
  },
  card: {
    sigil: 44,
    wordmark: "var(--text-content)",
    datum: "var(--text-base)",
    padding: "var(--space-md) var(--space-lg) var(--space-sm)",
    gap: "var(--space-lg)",
    columnGap: "var(--space-md)",
    inlineSigil: 12,
  },
};

/**
 * The datum row's date cell, from the surface's own timestamp.
 *
 * Owner ruling: the date is REAL — a praxis's submission, a task's filing —
 * where the surface has one, and the cell is left EMPTY where it has none. So
 * the guard is not defensive tidiness, it is the ruling: `formatDate` renders an
 * absent or malformed timestamp as the literal string "Invalid Date", which is
 * an invention rather than a blank, and the masthead is exactly the surface a
 * player would read it off as data. Guarded here rather than at each mount,
 * because four mounts guarding separately is three chances to forget.
 */
function datumDate(iso: string | null | undefined): string | undefined {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return undefined;
  return formatDate(iso);
}

export function EphemeristsMasthead({ slug, scale, date }: {
  /** The faction whose name the wordmark carries — the mounts' own slug. */
  slug: string | null | undefined;
  scale: MastheadScale;
  /**
   * The surface's OWN timestamp, ISO. Optional because a surface may genuinely
   * have none (the composer drafting a praxis that does not exist yet); the cell
   * is then left empty rather than filled with an invention.
   */
  date?: string | null;
}) {
  const size = SIZES[scale];
  const grid = { display: "grid", gridTemplateColumns: COLUMNS, gap: `0 ${size.columnGap}` } as const;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size.gap,
        padding: size.padding,
        borderBottom: `1px solid ${BRASS}`,
        boxSizing: "border-box",
      }}
    >
      <EphemeristsSigil size={size.sigil} color={GOLD} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: CAPS,
            fontVariant: "small-caps",
            fontSize: size.wordmark,
            letterSpacing: "0.12em",
            lineHeight: 1,
            color: BAND_INK,
          }}
        >
          {factionName(slug)}
        </div>

        {/* The datum row. It used to sit under the four-kanji register, which
            carried the design's 1px + 3px-double rules; #1909 cut all eight of
            the register's strings, so the rules move here to keep the wordmark
            reading as an engraved band rather than free type.

            `tabular-nums` is the design's, and it is doing real
            work: three of the four cells are figures that must not shimmy as the
            date changes underneath them. */}
        <div
          style={{
            ...grid,
            marginTop: "var(--space-xs)",
            padding: "var(--space-sm) 0",
            borderTop: `1px solid ${BRASS}`,
            borderBottom: `3px double ${BRASS}`,
            fontFamily: READING,
            fontSize: size.datum,
            fontVariantNumeric: "tabular-nums",
            color: BAND_QUIET,
            lineHeight: 1,
            alignItems: "center",
          }}
        >
          <span>{datumDate(date)}</span>
          <span>{RIGHT_ASCENSION}</span>
          <span>{DECLINATION}</span>
          <span style={{ justifySelf: "end" }}>
            <EphemeristsSigil size={size.inlineSigil} color={GOLD} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default EphemeristsMasthead;
