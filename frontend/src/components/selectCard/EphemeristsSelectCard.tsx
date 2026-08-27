import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import EphemerisNet from "../factionMarks/EphemerisNet";
import * as eph from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists — the faction-DIRECTORY tile (#2323, a child of #2321).
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE TILES ARE NOT ALL DARK, whatever the dispatcher's docstring used to say.
 * Coven's is pink and UA's is cream, and that false premise is exactly what let
 * a dark-only register look correct on a surface that flips. This tile had only
 * ever run dark; every pairing below is now measured in BOTH cascades.
 *
 * ── IT WAS PAINTED WITH THE WRONG REGISTER, NOT A BROKEN ONE ───────────────
 *
 * The tile drew entirely from the BAND: `BAND` as the sheet, `BAND_INK` and
 * `BAND_QUIET` as its inks, `BRASS` as a rule and `GOLD` as an ink.
 * `-plate-band` is #12151f, the cornice masthead's ground, and it is dark on
 * purpose in both cascades (its own declaration says so, and says not to
 * "complete" it). So the tile was never failing to flip — it was wearing a band
 * where a sheet belongs.
 *
 * WHY NO SWEEP COULD SEE IT, and why this defect is NOT S.N.I.D.E.'s (#2322).
 * Snide's tile was a FORKED FAMILY: two `--faction-snide-*` families, one of
 * which flips. Here the band and the plate are the SAME family, so #2321's
 * acceptance as literally worded — "references no token family its own task
 * card does not use" — is VACUOUSLY TRUE of the old tile and of this one. The
 * invariant that actually holds is one rung sharper and is what the guard next
 * door pins: **the sheet is a token that flips**, and the three inks measured
 * only on the band do not appear on a card that has no band.
 *
 * ── THE REGISTER IS THE TASK CARD'S, NOT A NEW ONE ─────────────────────────
 *
 * `EphemeristsTaskCard` paints the PLATE — a papyrus sheet ruled in brass,
 * whose whole family flips through `[data-theme="dark"]` with no ternary.
 * Gathered from it, role for role (light / dark):
 *
 *   sheet      `BAND` #12151f    -> {@link eph.PLATE}, the vellum — #eadcb6 by
 *                                  day, #171a26 by night.
 *   frame      `BRASS`           -> unchanged; the card's own frame brass.
 *   inner rule a `color-mix` of the link brass at 35% -> {@link eph.LINE},
 *                                  the register's declared "hairline borders",
 *                                  which flips and needs no mix.
 *   body ink   `BAND_INK`        -> {@link eph.INK}          13.37 / 13.91
 *   blurb      `BAND_INK`        -> {@link eph.QUIET}         7.35 /  5.98
 *   status     `BAND_QUIET`      -> {@link eph.CAPTION}       5.09 /  7.22
 *   rule       a brass-to-nothing gradient -> the plate's DOUBLE BRASS RULE in
 *                                  {@link eph.BRASS_RULE}, which is how this
 *                                  card rules everything it rules.
 *   sigil      `GOLD` on the band -> `GOLD` on a {@link eph.DISC} chip, 13.07:1.
 *                                  `-plate-gold` HAS NO LIGHT VALUE and needs
 *                                  none: the metals are struck only on a dark
 *                                  chip, and `-plate-disc` is that chip — the
 *                                  one sheet in the register that does not
 *                                  flip, declared for exactly this. Without it
 *                                  the gilt reads 1.02:1 on the vellum, which
 *                                  is this tile's real light-half defect.
 *   CTA        a brass-outlined ghost button in `GOLD` -> `.eph-cta`, THE ONE
 *                                  PLATE CTA (#2146), worn by five other
 *                                  surfaces. 7.59:1 in both cascades, and the
 *                                  enclosure changes WIDTH between them, which
 *                                  no token can carry — which is why it is a
 *                                  class and why nothing here sets `background`,
 *                                  `color` or `border` inline over it.
 *   ground     nothing           -> {@link EphemerisNet} at 0.10, the faction's
 *                                  one ground, at the card/plate weight its
 *                                  own header rules for a card.
 *
 * EVERY TEXT PAIRING HERE WAS ALREADY PINNED, in both themes, by the task card's
 * rows in `utils/__tests__/factionContrast.test.ts` — `ephemerists plate, ink`,
 * `…, quiet ink`, `…, caption` and `ephemerists plate CTA band`. That is the
 * point of gathering a register rather than inventing one: this repaint adds no
 * contrast row, because it introduces no colour the plate had not already
 * measured. The tightest reading on the tile is 5.09:1.
 *
 * WHERE THE TASK CARD HAS NO ANSWER, and nothing is invented for it:
 *   • NO HOVER. `.eph-cta` declares none, on any of its six surfaces, so the
 *     ghost button's two `onMouseEnter`/`onMouseLeave` handlers are DELETED
 *     rather than re-tinted. Giving this one tile a hover the other five lack is
 *     how a shared control starts becoming six again (#2146).
 *   • NO CORNICE. `Cornice` is the register's band-as-a-band and would be the
 *     literal reading of "the band may still appear as a band" (#2323). It is
 *     left off because the tile's coordinate block is absolutely positioned at
 *     the sheet's top edge, where a fluted band would land on it — a geometry
 *     question this repaint has no way to eyeball. The band survives here as the
 *     sigil's chip and as the CTA bar, both of which are the compass blue.
 *   • The MARGINALIA face (EB Garamond) is the register's fourth cut and the
 *     tile has no marginal gloss, so it wears three of the four faces.
 *
 * The sigil is the shared canonical `EphemeristsSigil` and is never re-drawn
 * inline. The box is FLUID at a uniform 360x300 ceiling — `width: 100%` to a
 * 360 max and `minHeight` rather than a fixed height — so the 375px
 * single-column mobile directory still works (#732). Nothing here changes the
 * grid.
 */
export default function EphemeristsSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ephemerists.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      /* THE NET'S MOUNT, the task card's own call: isolating makes the tile its
         own stacking context, so the net's `z-index: -1` paints after the sheet's
         fill and before every descendant — including the two absolutely
         positioned ornaments below, which carry no z-index of their own. */
      isolation: "isolate",
      background: eph.PLATE, color: eph.INK, fontFamily: eph.READING,
      border: `1px solid ${eph.BRASS}`, boxShadow: eph.SHADOW, display: "flex", flexDirection: "column",
    }}>
      {/* 0.10 — the card/plate weight. The three weights are a ruling and the
          prop has no default, so a mount that has not decided which surface it
          is has not finished. This is a plate. */}
      <EphemerisNet opacity={0.1} />
      <div style={{ position: "absolute", inset: 9, border: `1px solid ${eph.LINE}`, pointerEvents: "none" }} />
      {/* An incised glyph register ran above the footer until #2210. It was
          the OLD vocabulary the notation band replaced on the masthead, and it
          retires kit-wide; nothing takes its place here, because this tile
          heads itself by hand and mounts no `EphemeristsMasthead`. */}
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ ...eph.SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.24em", color: eph.CAPTION, marginBottom: "var(--space-md)" }}>{i18n.t("feed:factionSelect.ephemerists.banner")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {/* The dark chip, filled rather than merely rimmed. Its ink budget is
              the BAND's and not the sheet's — see `-plate-disc` in index.css —
              which is what keeps the gilt gilt on a vellum plate. */}
          <span style={{ width: 46, height: 46, borderRadius: "50%", background: eph.DISC, border: `1.5px solid ${eph.BRASS_RULE}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <EphemeristsSigil size={26} color={eph.GOLD} />
          </span>
          <div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the plate’s masthead wordmark — Poiret One letterspaced until the width is the mark */}
            <div style={{ fontFamily: eph.DECO, fontSize: 24, lineHeight: 1.1, letterSpacing: "0.22em", textTransform: "uppercase", color: eph.INK, marginTop: "var(--space-xs)" }}>{i18n.t("feed:factionSelect.ephemerists.name")}</div>
            <div style={{ fontSize: "var(--text-content)", fontStyle: "italic", color: eph.QUIET, marginTop: "var(--space-xs)" }}>{i18n.t("feed:factionSelect.ephemerists.tagline")}</div>
          </div>
        </div>
        {/* The plate's own closing pair — a hairline above, a `3px double`
            below, both in the LINE brass. The task card opens its masthead and
            closes its CTA block on this exact rule. */}
        {/* The 3px is the gap inside the stepped double rule — ornament
            geometry, carved out of the spacing ratchet (§4a). */}
        <div aria-hidden="true" style={{ height: 3, borderTop: `1px solid ${eph.BRASS_RULE}`, borderBottom: `3px double ${eph.BRASS_RULE}`, margin: "var(--space-lg) 0 var(--space-md)" }} />
        <p className="content-text" style={{ margin: 0, fontFamily: eph.READING, fontStyle: "italic", lineHeight: 1.45, color: eph.QUIET }}>
          {i18n.t("feed:factionSelect.ephemerists.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-xl) var(--space-lg)" }}>
        <div style={{ ...eph.SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: eph.CAPTION, marginBottom: "var(--space-md)" }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.ephemerists.members", { count: members })}`}</div>
        <button onClick={onVisit} className="eph-cta" style={{
          width: "100%", cursor: "pointer",
          ...eph.SMALL_CAPS, fontSize: "var(--text-xl)", letterSpacing: "0.16em", padding: "var(--space-md)",
        }}
        >{i18n.t("feed:factionSelect.ephemerists.cta")}</button>
      </div>
    </div>
  );
}
