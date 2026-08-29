import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { CovenSigil } from "../sigil/CovenSigil";
import {
  BORDER,
  Braid,
  CAPTION,
  CHROME,
  DEEP,
  HAND,
  INK,
  READING,
  SHADOW,
  SLIP_SHEET,
  SOFT,
} from "../factionMarks/covenSlip";
import { COVEN_CARD_CTA, CTA_SELECT_SIZE } from "../taskCard/cardCta";

/**
 * Cozy Coven — the faction-DIRECTORY tile (#2325, a child of #2321). The spell
 * slip at tile scale.
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE TILES ARE NOT ALL DARK, whatever the dispatcher's docstring used to say —
 * and THIS TILE IS HALF THE PROOF. Coven's is pink and UA's is cream. That false
 * premise is what let dark-only registers look correct on a surface that flips,
 * so it is not restated here in any form.
 *
 * ── THE REGISTER IS THE TASK CARD'S, NOT A NEW ONE ─────────────────────────
 *
 * Gathered from `taskCard/CovenTaskCard` AS RENDERED — the card, plus
 * `factionMarks/covenSlip` and the `CovenBand` in `cardMasthead/factionBands`,
 * because two of the register's answers are spelt in those rather than in the
 * card file. This is the REGISTER (ground, inks, rules, faces, ornament), not
 * the markup: a task card holds a task and this holds a pitch, so there is
 * nothing structural to share and none is shared.
 *
 * MOST OF IT WAS ALREADY RIGHT, which is the useful half of the finding. The
 * ground is `SLIP_SHEET` — the same four-stop ramp, from the same module rather
 * than retyped (#2135) — over the same `-slip-border` edge and `-slip-shadow`
 * lift; the inks are `-slip-ink` / `-slip-soft` / `-slip-label`; the faces are
 * Quicksand, Cormorant and Caveat; the CTA is the `-slip-cta-*` band. Coven's
 * tile was never on a forked family the way S.N.I.D.E.'s was (#2322). What it
 * had were four places where it had drifted off the card kit's own decisions:
 *
 *   mark    `covenSlip`'s pentagram badge -> {@link CovenSigil}, the
 *           canonical witch hat. The badge is not merely a second drawing: it
 *           is the drawing the CARD KIT explicitly stood down. `CardMasthead`
 *           records it — "UA's eyebrow ensō and Coven's pentagram badge were
 *           both stood down when their bands were built" — and `CovenTaskCard`
 *           repeats it, "the badge is retired in favour of the kit's own
 *           `CovenSigil` (a card may not draw two faction marks in its
 *           header)". A directory tile is a card. The badge kept four NON-card
 *           mounts when this tile was built and has since lost those too — it
 *           is deleted outright (#2726), so this line records where the tile
 *           came from rather than a split that still exists.
 *
 *   ink of  the badge painted itself. The hat takes {@link DEEP}, the module's
 *   the     ornament ink — the pentagram's own stroke, the braid's strands, the
 *   mark    heart, the cat. NOT the band's `--faction-coven` default: that ink
 *           is measured on the band's WHITE `-slip-sigil-ground` (3.15:1) and
 *           on this tile there is no band under it — on the ramp's worst stop
 *           it is 2.11:1, under 1.4.11's 3:1 for a drawn mark. See "where the
 *           task card has no answer" below.
 *
 *   rule    the braid was tied across the MASTHEAD, under the badge. #2029 took
 *           it out of Coven's masthead and said why — "a band that already
 *           names the coven does not need an ornament run repeating it. The
 *           braid lives on below, ruling off every section." So it moves down
 *           and rules off the footer, which is where the task card puts its
 *           own. Same shared `Braid`, same `.cvn-braid` pigments, same job.
 *
 *   wordmark Caveat at a raw 27px and `fontWeight: 700` -> the band's own
 *           setting: `--text-title`, lower case, and the ONE weight Caveat is
 *           loaded at. `fonts.faction.css` ships Caveat 400 only, so the 700
 *           was a browser-synthesised faux bold on a hand face. The raw 27 was
 *           the tile's one `no-raw-style-values` hatch and it is gone with it —
 *           a raw value parked as "no token fits" is worth re-asking whenever
 *           the register moves.
 *
 * THE ONE FOREIGN TOKEN FAMILY was the status line's ground. It wore
 * `covenSlip`'s `SLIP_PANEL`, whose background is `--faction-coven-ward-card` —
 * the WARD family, which is the faction detail page's paper and appears nowhere
 * on the task card. A panel of ward paper laid on a slip is the seam this epic
 * is about, just in the other direction from S.N.I.D.E.'s: not a forked twin of
 * the same role, but a second surface's ground borrowed for a chip. The task
 * card has no chip to gather from — it sets its status-adjacent copy straight
 * on the sheet in the reading face — so the box goes rather than being
 * repainted, and `-slip-soft` on the ramp is a pairing four surfaces already
 * measure. `SLIP_PANEL` had exactly one reader in the repo and is retired with
 * it.
 *
 * EVERY PAIRING ON THIS TILE IS ALREADY PINNED in BOTH cascades by the task
 * card's own rows in `utils/__tests__/factionContrast.test.ts` — "coven slip,
 * ink / brief / caption" on `-slip-mid`, the same three on `-slip-vio` for the
 * lavender end, and "coven slip CTA band top / foot". That is the payoff of
 * gathering a register instead of minting one. One row is new: the hat is the
 * first DRAWN mark this faction lays straight on the sheet, so `-slip-deep` on
 * `-slip-mid` is pinned at the 3:1 graphical floor (3.33:1 light, 6.11:1 dark).
 *
 * WHERE THE TASK CARD HAS NO ANSWER, and nothing is invented for it:
 *   • The mark's INK on a bare sheet. On the card kit the hat always stands on
 *     `-slip-sigil-ground`, so `--faction-coven` never has to clear the ramp.
 *     `DEEP` is chosen from inside the register — it is `covenSlip`'s declared
 *     ornament ink and already the stroke of every mark this faction draws on
 *     the slip — rather than minted, but the choice is this tile's and is
 *     recorded here rather than smuggled in.
 *   • The cat. `CovenCat` has five mounts and four placements (#2019/#2135) and
 *     this tile is not one of them. A sixth mount is a decision #2325 does not
 *     ask for, so it is not made; if it ever is, it mounts the shared drawing.
 *   • Grenze Gotisch (`--font-faction-witch`), the task card's TITLE face. The
 *     tile has no task title — its headline is the faction's name, which is the
 *     hand's job on every Coven surface — so it wears three of the four faces.
 *
 * The sigil is the shared canonical `CovenSigil` and is never re-drawn inline.
 * The box is FLUID at a uniform 360x300 ceiling — `width: 100%` to a 360 max
 * and `minHeight` rather than a fixed height — so the 375px single-column
 * mobile directory still works (#732). Nothing here changes the grid.
 */
export default function CovenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.coven.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: SLIP_SHEET, color: INK, fontFamily: CHROME,
      border: `2px solid ${BORDER}`, borderRadius: 18,
      boxShadow: SHADOW, display: "flex", flexDirection: "column",
    }}>
      {/* The masthead, in the band's anatomy rather than the band itself: the
          faction's mark hard left, the coven's name hand-lettered beside it. */}
      <div style={{ ...CAPTION, textTransform: "none", letterSpacing: "0.04em", padding: "var(--space-lg) var(--space-xl) 0" }}>{i18n.t("feed:factionSelect.coven.banner")}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-sm) var(--space-xl) 0" }}>
        <CovenSigil size={34} color={DEEP} />
        <div style={{ fontFamily: HAND, fontSize: "var(--text-title)", lineHeight: 1, textTransform: "lowercase", color: INK, whiteSpace: "nowrap" }}>
          {redactableText("factions:names.coven")}
        </div>
      </div>
      <div style={{ padding: "var(--space-xs) var(--space-xl) 0", fontFamily: READING, fontStyle: "italic", fontSize: "var(--text-content)", color: SOFT }}>{i18n.t("feed:factionSelect.coven.tagline")}</div>
      <div style={{ flex: 1, padding: "var(--space-md) var(--space-xl) 0", position: "relative" }}>
        <p className="content-text" style={{ margin: 0, fontFamily: READING, fontStyle: "italic", lineHeight: 1.5, color: SOFT }}>
          {i18n.t("feed:factionSelect.coven.blurb")}
        </p>
      </div>
      <div style={{ padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
        {/* The braid rules the footer off, exactly where the task card ties one:
            below the reading copy, above the last line and its CTA. */}
        <Braid style={{ marginBottom: "var(--space-md)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
          <div style={{ fontFamily: READING, fontStyle: "italic", fontSize: "var(--text-content)", lineHeight: 1.3, color: SOFT }}>{status}</div>
          {members != null && <div style={{ ...CAPTION, flexShrink: 0 }}>{i18n.t("feed:factionSelect.coven.members", { count: members })}</div>}
        </div>
        {/* The pink box, from the one place it is written (#2818). It was
            transcribed here declaration for declaration — the same ramp between
            the same two `-slip-cta-*` stops, the same 12 radius, the same glow —
            which is the #2642 shape: a paint maintained twice agrees until it
            doesn't. `COVEN_CARD_CTA` is now the only copy. */}
        <button onClick={onVisit} style={{
          cursor: "pointer", ...COVEN_CARD_CTA, ...CTA_SELECT_SIZE,
        }}>{i18n.t("feed:factionSelect.coven.cta")}</button>
      </div>
    </div>
  );
}
