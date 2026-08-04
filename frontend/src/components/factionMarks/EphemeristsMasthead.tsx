import { useTranslation } from "react-i18next";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import {
  BAND_INK,
  BAND_QUIET,
  BRASS,
  CAPS,
  GOLD,
  GlossedGlyph,
  READING,
} from "./ephemeristsPlate";
import { factionName } from "../../utils/factions";

/**
 * THE ENGRAVED MASTHEAD (#1634) — the head of every Ephemerists surface, and the
 * end of the deco wordmark it replaces.
 *
 * A row: the kite sigil on the left, and a column holding three stacked bands —
 * the wordmark in incised small caps, a four-kanji register ruled off above and
 * below, and a datum row of date, right ascension and declination closed by the
 * sigil again at inline scale.
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

/** The design's grid, shared by the glyph row and the datum row so their cells
 *  line up. The fourth column is narrower and right-aligned: it is the row's
 *  closing mark rather than a fourth reading. */
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

/**
 * The four-kanji register — 星 暦 観 録, "star · almanac · observation · record".
 *
 * The design set this row in cuneiform; the owner replaced cuneiform with kanji
 * across the kit, and the four chosen here read top-to-bottom as what an
 * ephemeris IS: the thing watched, the table it is kept in, the act of watching,
 * and what survives the watcher. 暦 is the load-bearing one — an ephemeris is
 * literally an almanac of positions, so the faction's name is in its own
 * masthead a second time in a script most readers cannot spend.
 *
 * Each is a {@link GlossedGlyph}: the English is on `title`, so hover and focus
 * reveal it and assistive tech reads it out. Pairs rather than a template
 * literal, so every key survives a grep.
 */
const REGISTER: readonly (readonly [mark: string, gloss: string])[] = [
  ["ephemerists.masthead.starMark", "ephemerists.masthead.star"],
  ["ephemerists.masthead.almanacMark", "ephemerists.masthead.almanac"],
  ["ephemerists.masthead.observationMark", "ephemerists.masthead.observation"],
  ["ephemerists.masthead.recordMark", "ephemerists.masthead.record"],
];

export type MastheadScale = "page" | "card";

interface MastheadSize {
  /** The sigil's HEIGHT; the mark owns its 486:560 ratio (#1635). Ornament. */
  sigil: number;
  wordmark: string;
  glyph: string;
  datum: string;
  padding: string;
  gap: string;
  /** The grid's own column gap. Ornament geometry rounded to the scale. */
  columnGap: string;
  /** The datum row's closing sigil, below the reduced cut's 20px (#1635). */
  inlineSigil: number;
}

/**
 * The design's two size tables, mapped onto the type and spacing scales.
 *
 * The sigil sizes stay raw: a drawn mark's dimensions are ornament geometry and
 * never spacing (§4a). Everything else takes a rung, and three of them needed a
 * decision because the scale has no step at the design's number:
 *
 *  • the page glyph row is drawn at 16px, which sits exactly between `--text-xl`
 *    (14) and `--text-content` (18). It rounds UP, for #1637's reason rather
 *    than §4a's: a kanji at 14px is at the bottom of the legible band and these
 *    four are the row, not a caption beside one.
 *  • the card glyph row is drawn at 13 and takes `--text-xl` (14), the same
 *    rung #1637 already chose for a glossed kanji.
 *  • the wordmarks are drawn at 26 and 19 and take `--text-title` (24) and
 *    `--text-content` (18) — the rungs the composer's own wordmark comment
 *    already picked for 19.
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
    glyph: "var(--text-content)",
    datum: "var(--text-md)",
    padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
    gap: "var(--space-xl)",
    columnGap: "var(--space-lg)",
    inlineSigil: 14,
  },
  card: {
    sigil: 44,
    wordmark: "var(--text-content)",
    glyph: "var(--text-xl)",
    datum: "var(--text-base)",
    padding: "var(--space-md) var(--space-lg) var(--space-sm)",
    gap: "var(--space-lg)",
    columnGap: "var(--space-md)",
    inlineSigil: 12,
  },
};

export function EphemeristsMasthead({ slug, scale, date }: {
  /** The faction whose name the wordmark carries — the mounts' own slug. */
  slug: string | null | undefined;
  scale: MastheadScale;
  /**
   * The surface's OWN date, already formatted. Optional because a surface may
   * genuinely have none (the composer drafting a praxis that does not exist
   * yet); the cell is then left empty rather than filled with an invention.
   */
  date?: string;
}) {
  const { t } = useTranslation("factions");
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

        {/* The register, ruled 1px above and 3px double below. The double rule
            is the design's, and it is what makes the row read as an engraved
            band rather than a line of type with a border. */}
        <div
          style={{
            ...grid,
            marginTop: "var(--space-xs)",
            padding: "var(--space-sm) 0",
            borderTop: `1px solid ${BRASS}`,
            borderBottom: `3px double ${BRASS}`,
            color: GOLD,
          }}
        >
          {REGISTER.map(([mark, gloss], index) => (
            <span key={mark} style={{ textAlign: index === REGISTER.length - 1 ? "right" : "left" }}>
              <GlossedGlyph glyph={t(mark)} gloss={t(gloss)} size={size.glyph} />
            </span>
          ))}
        </div>

        {/* The datum row. `tabular-nums` is the design's, and it is doing real
            work: three of the four cells are figures that must not shimmy as the
            date changes underneath them. */}
        <div
          style={{
            ...grid,
            marginTop: "var(--space-xs)",
            fontFamily: READING,
            fontSize: size.datum,
            fontVariantNumeric: "tabular-nums",
            color: BAND_QUIET,
            lineHeight: 1,
            alignItems: "center",
          }}
        >
          <span>{date}</span>
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
