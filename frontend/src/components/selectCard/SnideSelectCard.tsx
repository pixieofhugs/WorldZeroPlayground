import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { SnideSigil } from "../sigil/SnideSigil";
import { WALL } from "../factionMarks/snideAtoms";
import { CTA_SELECT_SIZE, SNIDE_CARD_CTA } from "../taskCard/cardCta";

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
 * The sigil is the shared canonical `SnideSigil` and is never re-drawn inline.
 * The box is FLUID at a uniform 360x300 ceiling — `width: 100%` to a 360 max
 * and `minHeight` rather than a fixed height — so the 375px single-column
 * mobile directory still works (#732). Nothing here changes the grid.
 */

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARKER = "var(--faction-snide-font-marker)"; /* Permanent Marker */

const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
const ACID = "var(--faction-snide-acid)";
const BAR = "var(--faction-snide-note-bar)";

export default function SnideSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.snide.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: WALL, color: INK, fontFamily: TYPE,
      /* Load-bearing, not ornament (#2065): the edge and the printed offset are
         what mark where the clipping stops — see the tokens' own note. */
      border: "1px solid var(--faction-snide-note-wall-edge)",
      boxShadow: "var(--faction-snide-note-wall-shadow)",
      display: "flex", flexDirection: "column",
    }}>
      {/* The masthead bar. An acid corner-glow used to sit here at 22% over the
          flat ink; {@link WALL} already washes acid off its top-left corner and
          pink off its bottom-right, so the blob was that ornament drawn twice —
          once tokenised and measured, once not. The tokenised one survives. */}
      <div style={{ fontFamily: IMPACT, fontSize: "var(--text-content)", letterSpacing: "0.06em", color: INK, padding: "var(--space-md) var(--space-xl) 0" }}>{i18n.t("feed:factionSelect.snide.banner")}</div>
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-md)",
        background: BAR, color: "var(--faction-snide-note-bar-ink)",
        padding: "var(--space-md) var(--space-xl)",
      }}>
        <SnideSigil size={40} color={ACID} />
        <div>
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ransom-dispatch wordmark — Anton slammed at 0.85 leading */}
          <div style={{ fontFamily: IMPACT, fontSize: 34, lineHeight: 0.85, color: ACID, letterSpacing: "0.02em" }}>{i18n.t("feed:factionSelect.snide.name")}</div>
          <div style={{ fontSize: "var(--text-base)", letterSpacing: "0.14em", marginTop: "var(--space-xs)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.snide.masthead")}</div>
          <div style={{ fontSize: "var(--text-base)", fontStyle: "italic", marginTop: "var(--space-xs)" }}>{i18n.t("feed:factionSelect.snide.tagline")}</div>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, padding: "var(--space-lg) var(--space-xl) 0" }}>
        <p className="content-text" style={{ margin: 0, lineHeight: 1.65, color: MUTED }}>
          {i18n.t("feed:factionSelect.snide.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
        {/* The censor strip rules the section off exactly where the task card
            puts it — above the last line and its CTA. `.snd-censor` owns its
            own pigments and its own dark half. */}
        <span aria-hidden="true" className="snd-censor" style={{ marginBottom: "var(--space-md)" }} />
        <div style={{ fontFamily: MARKER, fontSize: "var(--text-xl)", color: "var(--faction-snide-note-pink-ink)", transform: "rotate(-1deg)", marginBottom: "var(--space-md)" }}>{status}</div>
        {/* THE BUTTON THE BUG WAS REPORTED ON (#2818). "Jump In" was Anton at a
            raw 15 behind a `no-raw-style-values` hatch — the hatch covered that
            one number and nothing else on the line, so it goes with it — while
            the sign-up it leads to is Permanent Marker at `--text-content` with
            the sprayed halo, the `-acid-deep` ring and the 1.6° tilt. Same
            faction, same act, two paints. `SNIDE_CARD_CTA` is now the only one.

            The two hover handlers go with it: they inverted bar and acid on
            mouse-over, which no task-card CTA does and no CTA class in
            `index.css` declares. Focus-visible is a stylesheet state and is
            untouched.

            The member count keeps its right-hand seat WITHOUT the button
            declaring `justify-content: space-between`, which would be paint the
            other eight tiles do not share: an auto margin on the count's own
            span absorbs the free space first, so the CTA's box is untouched. */}
        <button onClick={onVisit} style={{
          cursor: "pointer", ...SNIDE_CARD_CTA, ...CTA_SELECT_SIZE,
        }}
        ><span>{i18n.t("feed:factionSelect.snide.cta")}</span>{members != null && <span style={{ marginLeft: "auto", fontSize: "var(--text-base)" }}>{i18n.t("feed:factionSelect.snide.members", { count: members })}</span>}</button>
      </div>
    </div>
  );
}
