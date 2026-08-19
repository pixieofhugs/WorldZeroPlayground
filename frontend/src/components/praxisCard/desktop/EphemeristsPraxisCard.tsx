import {
  BRASS,
  BRASS_LIGHT,
  CAPTION,
  Cornice,
  DECO,
  INK,
  LotusSign,
  PLATE,
  QUIET,
  READING,
  SHADOW,
} from "../../factionMarks/ephemeristsPlate";
import EphemeristsNotationBand from "../../factionMarks/EphemeristsNotationBand";
import { EphemeristsBand } from "../../cardMasthead/factionBands";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The Ephemerists — THE FIELD-JOURNAL PLATE (#1207, the Valley plate at card
 * size). A papyrus leaf under a brass-edged masthead, a cavetto cornice ruling
 * it off, the Poiret One title over its Spectral gloss, and the tally cell cut
 * into the right column.
 *
 * ## THE MASTHEAD IS THE CARD TIER'S NOW (#2185)
 *
 * This card headed itself with the ENGRAVED MASTHEAD at card scale (#1634) — the
 * kite sigil beside a stacked wordmark and datum row — over a 110px night band
 * carrying an incised `GlyphRegister`. Its task card does not: #2067 restrained
 * `EphemeristsTaskCard` to the kit's plain `CardMasthead` on the medallion's
 * disc. The owner's #2185 ruling is that a praxis card wears THE SAME BAND ITS
 * TASK CARD WEARS, so the plate joins the card tier and the night band goes.
 *
 * THE ENGRAVED MASTHEAD IS NOT RETIRED — it is the PAGE tier's, and it still
 * heads task detail, praxis detail and the edit-praxis page (each at
 * `scale={desktop ? "page" : "card"}`, so the card scale stays live). The split
 * that leaves is: a CARD wears the kit band, a PAGE wears the engraving. The
 * datum row's date is not lost with it — `PraxisStats` already carries the date
 * as a fact.
 *
 * The engraving replaced two things at once when it arrived: the winged sun disc
 * over a letterspaced Poiret One wordmark, and the brass cartouche pill below
 * the cornice that said "THE EPHEMERISTS" a second time.
 *
 * It replaces THE CODEX (#841) — the vellum folio painted out of the retired
 * `--eph-*` family. That family is still declared and still worn by every other
 * Ephemerists surface (avatar, faction page, duel seal); what changed is that
 * this card's own metaphor moved (ADR-0055), and the two grounds may not be
 * mixed on one surface. Every colour here is a `--faction-ephemerists-plate-*`
 * token, so the card flips through the `[data-theme="dark"]` cascade with no
 * ternary. `-brass` stays a rule colour and is never an ink: labels take
 * `-caption`, running text `-quiet`.
 *
 * ONE CARD, BOTH FORM FACTORS (ADR-0067). There is no mobile twin any more — the
 * frame is `frameBase`'s flex basis, so this same plate is what a 375px column
 * shows, one card per row. Nothing here is form-factor branched.
 *
 * The ornament is the shared kit's (`ephemeristsPlate`), not a second copy:
 * `Cornice`, `LotusSign`, `stepClip` — and, since #2312, the rune strip too.
 *
 * ## THE THIRD DRAWING IS GONE (#2312)
 *
 * A 32-mark `DRIFT` array headed the vote block: a fixed sequence, crammed
 * edge to edge, breathing on `.epg-glyph`. It was the same motif
 * `EphemeristsNotationBand` already draws for the task card, the task page and
 * the composer, transcribed a third time — exactly the drift `ephemeristsPlate.tsx`
 * was extracted to end, and exactly what #2210 / #2067 rule against. The
 * component takes its place, and it takes the BYLINE's rule rather than the
 * vote block's air: the owner's ruling is that the runes replace the dotted
 * line, so that is the slot they fill.
 *
 * DEVIATIONS from the vendored `#eph` / `#ephD` frames, all four in the PR body:
 *  • the drifting strip's marks are ochre and CAPTION gold, not ochre and brass
 *    — brass is a rule colour, and the strip's glyphs are set as type. The
 *    shared component keeps that reading, in `-caption` and `-quiet`;
 *  • the byline keeps the shared portrait (`FactionAvatar`) rather than the
 *    design's octagon monogram: the byline slot is shared card chrome (#888) and
 *    the avatar is one convention across every faction;
 *  • the design's `border-radius` is 0 here (the design draws none), against the
 *    8 the codex folio used.
 *
 * The fourth deviation — "the 'for:' gloss is upright, not italic" — retired with
 * its string: #1909 CUT `card.ephemerists.for`, so there is no gloss to set.
 */

/**
 * How far the strip has to reach BACK to clear the leaf's own padding.
 *
 * `[data-eph-runes]` fills its container's PADDING box, and this card's leaf is
 * inset by `--space-xl` a side — so the mount bleeds itself, which is what the
 * retired `DRIFT` row did with the same expression. The strip is not given a
 * per-mount width (#2312 rules that out): one device, one behaviour, and each
 * mount answers for the box it was hung in.
 */
const LEAF_BLEED = "0 calc(var(--space-xl) * -1)";

export function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        position: "relative",
        overflow: "hidden",
        background: PLATE,
        color: INK,
        border: `1px solid ${BRASS}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 3,
        boxShadow: SHADOW,
        fontFamily: READING,
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* THE RESTRAINED MASTHEAD (#2185) — the same band `EphemeristsTaskCard`
          wears, mounted from `cardMasthead/factionBands`, with the cornice
          ruling it off exactly as it does there. */}
      <EphemeristsBand />
      <Cornice />

      {/* THE LEAF SITS ABOVE THE CAVETTO (#2240). The score stamp's crown hangs
          at `top: -13`, so it overhangs the leaf's top edge into the cornice on
          purpose — #2122 moved it out of the stamp's own `clip-path` for that
          reason. At `z-index: 2` under a `Cornice` at 3 the band painted over
          it, and the crown's own `z-index: 3` could not help: an inner number
          never lifts a child out of its parent's stacking context. NOT an
          `overflow` fix — the frame clips at the card's border box and the
          crown never reaches it. Nothing else in the leaf meets the band. */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          padding: "0 var(--space-xl) var(--space-lg)",
        }}
      >
        <AdminOverlay {...adminProps} />

        {/* The entry's cartouche stood here, a pill reading "THE EPHEMERISTS"
            ruled off at both ends. #1634 retired it: the masthead directly above
            now carries that wordmark in the engraved title, so the pill was the
            same word said twice within 40px. */}

        <PraxisBody
          praxis={praxis}
          // Brass is the plate's RULE colour: it frames the media well and rings
          // the roster, and never becomes an ink (see index.css).
          tint={BRASS}
          muted={QUIET}
          paper={PLATE}
          showCrown={showCrown}
          titleStyle={{ fontFamily: DECO, fontWeight: 400, letterSpacing: "0.02em", color: INK }}
          // Poiret One for the display line, Spectral for the reading matter.
          fonts={{ display: DECO, body: READING }}
          // #1909 CUT the two strings that used to fill the shared slots here:
          // `card.ephemerists.for` ("for:") and `card.ephemerists.mediaEmpty`
          // ("Affix the observation"). Both were single- or two-faction
          // flourishes on a surface the audit ruled generic; the slots survive
          // unfilled and the shared card draws its own.
          mediaEmptyStyle={{
            borderRadius: 0,
            border: `1px solid ${BRASS}`,
            background: "transparent",
            color: CAPTION,
          }}
          /* THE RUNE STRIP RULES THE BYLINE (#2312). A generic dashed line stood
             here — the shared `PraxisByline`'s `border-top` — on a plate whose
             every other division is drawn. The owner's ruling: *"the runes
             should show up instead of the dotted line"*, corner to corner and
             evenly spread.

             It is `EphemeristsNotationBand`, the same component the masthead,
             the task card, the task page and the composer mount (#2230), and
             not a fourth transcription:
             the 32-mark `DRIFT` array that used to head the vote block was a
             THIRD drawing of this motif, crammed rather than spread, and #2210 /
             #2067 both rule that this device is drawn once and consumed
             everywhere. It is deleted; the vote block keeps its heading.

             `side="divider"` is the vertical-offset knob (index.css), and it is
             also what keeps the seed distinct: the component folds `side` into
             the seed, and the composer already draws `praxis:${id}` at `top`. */
          bylineDivider={
            <div style={{ margin: LEAF_BLEED }}>
              <EphemeristsNotationBand side="divider" seed={`praxis:${praxis.id}`} />
            </div>
          }
          voteRule={
            /* The vote section's head — the card states the prompt, so the
               widget carries none and the detail page's own heading is not
               doubled up. */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-md)",
              }}
            >
              {/* "Cast your metal" (`votes:chrome.ephemerists.prompt`) headed
                  this rule. #1909 cut the whole `chrome.{F}.prompt` slot:
                  only three of nine factions ever rendered one, two more held
                  dead strings, and six ship none at all. The rule and the
                  lotus stay — they are the vote panel's frame, not its copy. */}
              <span aria-hidden style={{ flex: 1, height: 1, background: BRASS, opacity: 0.5 }} />
              <LotusSign width={16} color={BRASS} />
            </div>
          }
        />
      </div>
    </div>
  );
}

export default EphemeristsPraxisCard;
