import { useTranslation } from "react-i18next";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import { EphemeristsNotationBand } from "./EphemeristsNotationBand";
import {
  BAND_INK,
  BRASS,
  CAPS,
  GOLD,
  QUIET,
  READING,
} from "./ephemeristsPlate";
import { factionName } from "../../utils/factions";
import { formatDate } from "../../utils/dates";

/**
 * THE ENGRAVED MASTHEAD (#1634) — the head of every Ephemerists surface, and the
 * end of the deco wordmark it replaces.
 *
 * A row: the kite sigil on the left, and a column holding two stacked bands —
 * the wordmark in incised small caps, and the NOTATION BAND, a row of
 * mathematical marks ruled off above and below. A four-kanji register sat
 * between them until #1909 cut all eight of its strings; the note below the
 * coordinates records what went.
 *
 * A DATUM ROW held the third slot until #2143 — date, right ascension and
 * declination, closed by the sigil again at inline scale. It did not die: it
 * moved to {@link EphemeristsColophon} at the foot of the sheet, gained a label
 * naming it the PLATE's provenance, and left its two brass rules behind for the
 * notation band to inherit. See the colophon for why the move is a requirement
 * and not a layout preference.
 *
 * WHAT IT REPLACED, AND WHY IT IS ONE COMPONENT. Four surfaces each drew the
 * same centred stack — a 150–176px winged sun disc over the faction's name in
 * letterspaced Poiret One — in four copies that could not see each other
 * (WORLD_ZERO_STYLE §6, "duplication is discovered by the next consumer"). The
 * masthead is the fifth consumer arriving, so the stack becomes a component
 * rather than a fifth copy. The winged disc goes with it: #1634's ruling is that
 * the sigil is the only mark, and the disc was only ever the wordmark's crown.
 *
 * IT MOUNTS ON THE CORNICE BAND. Its ink is {@link BAND_INK}, measured 7.59:1
 * against `--faction-ephemerists-plate-band`, and all its mounts are that band.
 * A plate mount would be a different (ink, ground) pairing and therefore a prop,
 * not an assumption to leave standing: WORLD_ZERO_STYLE §3's rule is that a
 * component's inks belong to the sheet they were measured on — which is exactly
 * why {@link EphemeristsColophon} below, on the SHEET, takes different inks.
 *
 * NOTHING ON THE BAND FLIPS WITH THE THEME, and the reason narrowed in #2141.
 * It used to be that the whole plate register was theme-invariant (#1627); that
 * is no longer true — the register gained a light half, and `[data-theme="dark"]`
 * now declares `-plate-bg`, `-plate-ink`, `-plate-brass` and a dozen more. What
 * survives is smaller and load-bearing: `-plate-band`, `-plate-band-ink`,
 * `-plate-band-quiet` and `-plate-brass-rule` are declared once at `:root` and
 * absent from the dark cascade ON PURPOSE (#2140's compass-blue ruling). Their
 * absence down there is the decision, not an omission.
 *
 * TWO SCALES, ONE PROP. `page` heads a whole page, `card` heads a sheet. The
 * design carries both, and every rung of both tables below is on the type or
 * spacing scale — see {@link SIZES} for the three places the scale had no step.
 */

/*
 * THE DESIGN'S FOUR-COLUMN GRID WENT WITH THE DATUM ROW (#2143).
 *
 * `1.1fr 1fr 1fr 0.9fr` was shared by the glyph row and the datum row so their
 * cells lined up. The glyph row left in #1909 and the datum row in #2143, and
 * neither of the two things that replaced them wants a grid: the notation band
 * spaces itself from a measured width, and the colophon is one sentence with a
 * mark after it. Recorded as an absence so the next reader does not re-derive
 * four columns for a row that no longer has four cells.
 */

/**
 * THE COLOPHON'S COORDINATES — an easter egg, and a fixed pair.
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
 * THE "NEVER LABEL IT" RULE IS REVERSED (#2124, closed into #2143). It used to
 * read: an egg rewards noticing, a caption spends it. #2124 reported the bare
 * `+44° 03′` sitting beside a player's name and date as a privacy risk — that
 * the site was publishing that player's location. The value cannot leak
 * anything; it is one constant, identical on every surface for every player.
 * But the misreading is real and it comes from PLACEMENT: a coordinate next to
 * a byline reads as belonging to that byline. So the owner's ruling is that the
 * line MUST now say whose position it is. The label is the fix, and the egg is
 * spent on purpose.
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
 * onto. The wordmark now sits straight above the notation band.
 *
 * ponytail: this leaves a masthead of two bands where the design drew three.
 * Ceiling: I have no browser, so the two-band proportion is unverified at either
 * scale — and #2143's 5px-to-9px opening was ruled precisely to give the band
 * room the register used to hold. Upgrade path: `frontend-style` re-rules the
 * wordmark/band seam, or the audit's own "put it back in intentionally" restores
 * a register under keys of its own.
 */

type MastheadScale = "page" | "card";

interface MastheadSize {
  /** The sigil's box. It was a HEIGHT while the mark owned a 486:560 ratio
   *  (#1635); Sigil Studies v2 draws the kite square, so this is both
   *  dimensions and the mark is ~15% wider here than it was. Ornament. */
  sigil: number;
  wordmark: string;
  /** The datum row's type rung. It went to the foot with the row it sized
   *  (#2143), so this table now feeds {@link EphemeristsColophon} as well as
   *  the masthead — one table, because the two are one lockup split across the
   *  sheet and a colophon a rung off its own masthead reads as a stray. */
  datum: string;
  padding: string;
  gap: string;
  /** The datum row's closing sigil, and now the colophon's. It used to sit
   *  below #1635's 20px reduced cut on purpose; v2 is filled rather than
   *  stroked and has no cut, so this is simply the size the row was drawn at. */
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
    inlineSigil: 14,
  },
  card: {
    sigil: 44,
    wordmark: "var(--text-content)",
    datum: "var(--text-base)",
    padding: "var(--space-md) var(--space-lg) var(--space-sm)",
    gap: "var(--space-lg)",
    inlineSigil: 12,
  },
};

/**
 * The colophon's date, from the surface's own timestamp.
 *
 * Owner ruling: the date is REAL — a praxis's submission, a task's filing —
 * where the surface has one, and it is left OUT where it has none. So the guard
 * is not defensive tidiness, it is the ruling: `formatDate` renders an absent or
 * malformed timestamp as the literal string "Invalid Date", which is an
 * invention rather than a blank, and a provenance line is exactly the place a
 * player would read it off as data. Guarded here rather than at each mount,
 * because mounts guarding separately is a chance each to forget.
 */
function datumDate(iso: string | null | undefined): string | undefined {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return undefined;
  return formatDate(iso);
}

export function EphemeristsMasthead({ slug, scale, seed }: {
  /** The faction whose name the wordmark carries — the mounts' own slug. */
  slug: string | null | undefined;
  scale: MastheadScale;
  /**
   * Stable per SURFACE — a task or praxis id, prefixed so a task 7 and a praxis
   * 7 do not draw one band. It seeds the notation band's draw, and it is a
   * REQUIRED prop rather than an optional one with a fallback: a mount that
   * forgets it would fall back to a shared default, and every Ephemerists
   * surface in the app would wear the same row of marks.
   */
  seed: string;
}) {
  const size = SIZES[scale];

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

        {/* The notation band, which is where the design's 1px + 3px-double
            rules now live. They were the four-kanji register's; #1909 cut the
            register and left them to the datum row, and #2143 moved the datum
            row to the foot and left them here. Three tenants, one pair of
            rules, and the reason has not changed once: without them the
            wordmark reads as free type rather than as an engraved band. */}
        <EphemeristsNotationBand seed={seed} side="band" />
      </div>
    </div>
  );
}

/**
 * THE COLOPHON (#2143 + #2124) — the datum row, at the foot of the sheet, said
 * out loud.
 *
 * The masthead's third band was the datum row and the notation band took its
 * slot. The row did not die: the coordinates are a standing owner ruling, and
 * they are the one reading on an Ephemerists surface that is real rather than
 * decorative, so they move to where a plate's provenance line belongs — the
 * foot — rather than to the bin.
 *
 * IT IS LABELLED, AND THAT IS THE POINT OF THE MOVE. #2124 read the bare
 * `+44° 03′` as the site publishing a player's location. It cannot be: the pair
 * is a constant, byte-identical on every surface for every player. But a
 * coordinate beside a byline reads as belonging to that byline, so the owner
 * ruled the line must name whose position it is. Two consequences bind any
 * future mount of this component:
 *
 *  • it says "the Ephemerists' station" in its own copy, so a reader can tell it
 *    describes the INSTRUMENT and not the author; and
 *  • it may not sit beside the author, the submission date, or any other
 *    player-scoped field, on any surface or form factor. The foot of the sheet
 *    is the placement that satisfies that, and the brass rule above it is what
 *    separates it from whatever the sheet's last section happened to be.
 *
 * ITS INKS ARE THE SHEET'S, NOT THE BAND'S, which is §3's rule arriving one
 * component later: the masthead was measured on the compass blue and this is
 * mounted on the vellum plate and the dark plate. {@link QUIET} is the ink
 * measured on both of the sheet's own stops (`ephemerists plate, quiet ink` and
 * `ephemerists page ground, quiet ink` in `factionContrast.test.ts`), and
 * {@link BRASS} is the rule the sheet's other rules already take. The band's
 * `GOLD` would read 1.02:1 here and `BAND_INK` is not a sheet ink at all.
 *
 * NOT MOUNTED ON THE COMPOSER, and that is a structural block rather than a
 * choice: #1828 makes the composer's cast a full-bleed band that closes the
 * sheet with a negative bottom margin, so a trailing sibling is pulled back up
 * over the brass instead of sitting under it. The skin's own rune-strip comment
 * records the same block for the same reason. The composer therefore heads with
 * the notation band and carries no colophon.
 */
export function EphemeristsColophon({ scale, date }: {
  scale: MastheadScale;
  /** The surface's OWN timestamp, ISO. See {@link datumDate} for why an absent
   *  or unreadable one drops the whole clause rather than blanking a cell. */
  date?: string | null;
}) {
  const { t } = useTranslation("factions");
  const size = SIZES[scale];
  const struck = datumDate(date);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-md)",
        marginTop: "var(--space-xl)",
        paddingTop: "var(--space-md)",
        borderTop: `1px solid ${BRASS}`,
        fontFamily: READING,
        fontSize: size.datum,
        // The design's, and it is doing real work: the line is mostly figures
        // and they must not shimmy as the date changes underneath them.
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.08em",
        color: QUIET,
        lineHeight: 1.4,
      }}
    >
      <span>
        {struck
          ? t("ephemerists.plate.provenance", {
              date: struck,
              rightAscension: RIGHT_ASCENSION,
              declination: DECLINATION,
            })
          : t("ephemerists.plate.provenanceUndated", {
              rightAscension: RIGHT_ASCENSION,
              declination: DECLINATION,
            })}
      </span>
      {/* The datum row's closing mark, moved with the row it closed. */}
      <EphemeristsSigil size={size.inlineSigil} color={BRASS} />
    </div>
  );
}

export default EphemeristsMasthead;
