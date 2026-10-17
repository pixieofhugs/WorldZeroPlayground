import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { SnideSigil } from "../sigil/SnideSigil";
import SnideSelectSeal from "./SnideSelectSeal";
import {
  SelectCardBand,
  SelectCardBody,
  SelectCardCall,
  SelectCardFooter,
  SelectCardFrame,
  SelectCardMotto,
  SelectCardOrnament,
  SelectCardPitch,
  SelectCardStanding,
} from "./selectCardBlocks";
import { WALL } from "../factionMarks/snideAtoms";
import { CTA_SELECT_SIZE, SNIDE_CARD_CTA } from "../taskCard/cardCta";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * S.N.I.D.E. — the faction-DIRECTORY tile (#2322, the pattern child of #2321).
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE TILES ARE NOT ALL DARK, whatever the dispatcher's docstring used to say.
 * Coven's is pink and UA's is cream, and that false premise is exactly what let
 * a dark-only register look correct on a surface that flips. This tile had only
 * ever run dark; every pairing below is now measured in BOTH cascades.
 *
 * ── THE REGISTER IS THE TASK CARD'S, NOT A NEW ONE ─────────────────────────
 *
 * `SnideTaskCard` records at its own head that all its colour is
 * `--faction-snide-note-*`, "which unlike the faction's older" ink-dark
 * families FLIPS. This tile was still on that older family — `--snide-ink` for
 * the ground, `--snide-paper` for the ink, `--snide-acid` for the accent, plus
 * `--snide-pink`. A FORKED TOKEN FAMILY: both halves are real tokens, so every
 * lint passed, every census counted them and every contrast sweep measured
 * them while the two drifted apart. Only a pairing measurement in both themes
 * could see it.
 *
 * What was gathered from the task card, role for role:
 *
 *   ground     `--snide-ink`   -> {@link WALL}, the flyposted wall the card
 *                                 prints on since #2065, drawn once in
 *                                 `factionMarks/snideAtoms` and worn by three
 *                                 other surfaces. It FLIPS: xerox stock by
 *                                 day, pitch black by night.
 *   edge       `1px solid #000`-> `--faction-snide-note-wall-edge`
 *   lift       `--color-cast-shadow` -> `--faction-snide-note-wall-shadow`
 *   body ink   `--snide-paper` -> `-note-ink` / `-note-muted`
 *   rule       a dashed color-mix of the body ink -> `.snd-censor`, the
 *                                 clipping's own cut-up strip of redaction
 *                                 blocks, which flips through index.css.
 *   status ink `--snide-pink`  -> `-note-pink-ink`, "the pink that is TEXT".
 *                                 Bare `--faction-snide-pink` measures 2.96:1
 *                                 on the light wall — this tile's real
 *                                 light-half defect, not a theoretical one.
 *   masthead   acid on the tile's own ground -> acid on `-note-bar`. Acid is
 *                                 a light colour and #2173's ruling is that it
 *                                 NEVER touches paper; on the near-black bar
 *                                 it carries type at 15.6:1, which is the
 *                                 whole reason the clipping has a bar.
 *   CTA        an acid outline on the ground -> the bar again, acid type, and
 *                                 the theme-invariant `-acid-deep` ring the
 *                                 task card's CTA wears for the same reason:
 *                                 by night the bar and the wall are both
 *                                 near-black, so without an opaque edge the
 *                                 button is a black rectangle on a black card.
 *
 * EVERY PAIRING HERE WAS ALREADY PINNED, in both themes, by the task card's own
 * rows in `utils/__tests__/factionContrast.test.ts` — SNIDE_WALL_PAIRS for the
 * three wall inks across all four of the ramp's readings, plus "snide clipping
 * bar, ordinal", "snide clipping bar, wordmark" and "snide acid CTA bar". That
 * is the point of gathering a register rather than inventing one. One row was
 * new — the CTA's hover ground — and #2818 deleted that hover and its row, so
 * every pairing on this tile is now one the task card already measures.
 *
 * WHERE THE TASK CARD HAS NO ANSWER, and nothing is invented for it:
 *   • `--faction-snide-font-black` (Archivo Black) is cut 2 of the ransom
 *     headline. The tile has no cut-up headline, so it wears three of the four
 *     faces and not four.
 *   • `--faction-snide-note-paper` has had no consumer since #2065 moved the
 *     clipping onto the wall, and this tile does not give it one. Whether a
 *     family member with no reader gets retired is not this card's call — the
 *     token's own comment in index.css already says so.
 *
 * THE SEVEN-SLOT CONTRACT (#3130, #3143). The bar is the band and holds mark,
 * name and seal only: the tagline left it (10px) and is now the marker-scrawl
 * motto, and the count left the button for the line after the standing. The band
 * keeps its padding, so the bar no longer sits flush to the card top.
 *
 * The sigil is the shared canonical `SnideSigil` and is never re-drawn inline.
 * The box is FLUID at a uniform 360x300 ceiling — `width: 100%` to a 360 max
 * and `minHeight` rather than a fixed height — so the 375px single-column
 * mobile directory still works (#732). Nothing here changes the grid.
 */

const IMPACT = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARKER = "var(--faction-snide-font-marker)"; /* Permanent Marker */

const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
const ACID = "var(--faction-snide-acid)";
const BAR = "var(--faction-snide-note-bar)";

const SEAL_SIZE = 32;

export default function SnideSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  return (
    <SelectCardFrame style={{
      ...factionBodyVars("snide"),
      background: WALL, color: INK, fontFamily: TYPE,
      /* Load-bearing, not ornament (#2065): the edge and the printed offset are
         what mark where the clipping stops — see the tokens' own note. */
      border: "1px solid var(--faction-snide-note-wall-edge)",
      boxShadow: "var(--faction-snide-note-wall-shadow)",
    }}>
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        mark={<SnideSigil size={40} color={ACID} />}
        /* PROVISIONAL — see the file. */
        seal={<SnideSelectSeal size={SEAL_SIZE} />}
        sealSize={SEAL_SIZE}
        style={{
          background: BAR, color: "var(--faction-snide-note-bar-ink)",
          padding: "var(--space-md) var(--space-xl)",
        }}
        /* eslint-disable-next-line local/no-raw-style-values -- ornament: ransom-dispatch wordmark — Archivo Black slammed at 0.85 leading */
        nameStyle={{ fontFamily: IMPACT, fontSize: 34, lineHeight: 0.85, color: ACID, letterSpacing: "0.02em" }}
      >
        {redactableText("factions:names.snide")}
      </SelectCardBand>

      <SelectCardBody style={{ padding: "0 var(--space-xl)" }}>
        <SelectCardMotto style={{
          fontFamily: MARKER, fontSize: "var(--text-heading)", lineHeight: 1.05,
          color: "var(--faction-snide-note-pink-ink)", transform: "rotate(-1.5deg)",
          marginTop: "var(--space-lg)",
        }}>
          {i18n.t("feed:factionSelect.snide.tagline")}
        </SelectCardMotto>
        <SelectCardPitch className="content-text" style={{ lineHeight: 1.65, color: MUTED, marginTop: "var(--space-md)" }}>
          {i18n.t("feed:factionSelect.snide.blurb")}
        </SelectCardPitch>
        {/* The censor strip, the clipping's own cut-up redaction blocks.
            `.snd-censor` owns its pigments and its dark half, and the slot's box
            is the drawing, so it renders childless. */}
        <SelectCardOrnament className="snd-censor" style={{ marginTop: "var(--space-lg)" }} />
      </SelectCardBody>

      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-lg)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.snide.stats.members", { count })}`}
          style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}
          standingStyle={{ fontFamily: MARKER, fontSize: "var(--text-xl)", color: "var(--faction-snide-note-pink-ink)", transform: "rotate(-1deg)" }}
          headcountStyle={{ fontFamily: MARKER, fontSize: "var(--text-md)", letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}
        >
          {i18n.t(`feed:factionSelect.snide.status.${state}` as const)}
        </SelectCardStanding>
        {/* The button is the task card's CTA (#2818) — `SNIDE_CARD_CTA` is the
            only paint — and holds its label and nothing else. */}
        <SelectCardCall onClick={onVisit} style={{ ...SNIDE_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.snide.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
