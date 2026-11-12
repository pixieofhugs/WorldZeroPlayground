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
 * The engraved masthead (#1634) — head of every Ephemerists surface: kite
 * sigil, small-caps wordmark, and the notation band. The provenance datum row
 * moved to {@link EphemeristsColophon} at the foot (#2143).
 *
 * Mounts on the cornice band only: {@link BAND_INK} is measured 7.59:1 against
 * `--faction-ephemerists-plate-band`. A plate mount would need different inks
 * (WORLD_ZERO_STYLE §3), as the colophon has.
 *
 * The band tokens (`-plate-band`, `-plate-band-ink`, `-plate-band-quiet`,
 * `-plate-brass-rule`) are absent from the dark cascade on purpose (#2140).
 */

/**
 * Colophon coordinates: one fixed real place, the Oregon Country Fairgrounds
 * (44.0534° N, 123.3704° W), owner ruling.
 *  • Declination = latitude: 0.0534° × 60 = 3.2′ → +44° 03′.
 *  • Right ascension = west longitude as a positive hour angle:
 *    123.3704 / 15 = 8.2247ʰ → 8ʰ 13ᵐ.
 *
 * It's a constant for every player, but beside a byline it read as the
 * player's location (#2124), so the line is labelled as the station's.
 */
const RIGHT_ASCENSION = "8ʰ 13ᵐ";
const DECLINATION = "+44° 03′";

/*
 * ponytail: the kanji register was cut (#1909), leaving two bands where the
 * design drew three; proportion unverified in a browser. Upgrade: re-rule the
 * wordmark/band seam, or restore a register under its own keys.
 */

type MastheadScale = "page" | "card";

interface MastheadSize {
  /** Square box (Sigil Studies v2). Ornament. */
  sigil: number;
  wordmark: string;
  /** Shared with the colophon: one lockup split across the sheet. */
  datum: string;
  padding: string;
  gap: string;
  /** The colophon's closing sigil. */
  inlineSigil: number;
}

/**
 * Design sizes mapped onto the scales. Sigils stay raw (ornament, §4a).
 * Wordmarks 26/19 → `--text-title`/`--text-content`. Spacing ties round up
 * (§4a); asymmetric paddings keep the design's top-heavy shape.
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
 * The surface's real date, or undefined (owner ruling) — `formatDate` would
 * otherwise print "Invalid Date". Guarded once here, not per mount.
 */
function datumDate(iso: string | null | undefined): string | undefined {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return undefined;
  return formatDate(iso);
}

export function EphemeristsMasthead({ slug, scale, seed }: {
  slug: string | null | undefined;
  scale: MastheadScale;
  /**
   * Stable per surface, prefixed (`task:7` ≠ `praxis:7`). Seeds the notation
   * band. Required: a default would give every surface the same marks.
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

        {/* Carries the 1px + 3px-double rules; without them the wordmark
            reads as free type, not an engraved band. */}
        <EphemeristsNotationBand seed={seed} side="band" />
      </div>
    </div>
  );
}

/**
 * The colophon (#2143, #2124) — the plate's provenance line, at the foot.
 *
 * Binding on every mount: its copy names "the Ephemerists' station", and it
 * must never sit beside the author, date or any player-scoped field (#2124).
 *
 * Inks are the sheet's, not the band's (§3): {@link QUIET} is measured on both
 * sheet stops in `factionContrast.test.ts`; band `GOLD` would be 1.02:1 here.
 *
 * Not on the composer: its full-bleed cast (#1828) uses a negative bottom
 * margin that would pull a trailing sibling over the brass.
 */
export function EphemeristsColophon({ scale, date }: {
  scale: MastheadScale;
  /** ISO; absent/invalid drops the date clause ({@link datumDate}). */
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
        // Mostly figures; keep them from shimmying.
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
      <EphemeristsSigil size={size.inlineSigil} color={BRASS} />
    </div>
  );
}

export default EphemeristsMasthead;
