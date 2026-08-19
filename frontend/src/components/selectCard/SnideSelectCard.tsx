import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { SnideSigil } from "../sigil/SnideSigil";

/**
 * S.N.I.D.E. — the faction-DIRECTORY tile (#2322, extracted from
 * `FactionSelectCard.tsx` under #2321).
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE TILES ARE NOT ALL DARK, whatever the dispatcher's docstring used to say.
 * Coven's is pink and UA's is cream, and the false premise is what let a
 * dark-only register look correct on a surface that flips. This tile is
 * measured in BOTH cascades.
 *
 * The sigil is the shared canonical `SnideSigil` and is never re-drawn inline.
 * The box is FLUID at a uniform 360×300 ceiling — `width: 100%` to a 360 max
 * and `minHeight` rather than a fixed height — so the 375px single-column
 * mobile directory still works (#732).
 */

/**
 * Every tile casts onto the FEED page, not onto itself (#1609). The ground
 * behind them is `--color-bg-page`, which flips — so this is the ordinary lift
 * `--color-cast-shadow` exists for.
 */
const CAST = "var(--color-cast-shadow)";

export default function SnideSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.snide.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--snide-ink)", color: "var(--snide-paper)", fontFamily: "var(--font-faction-typewriter)",
      // ornament (#1609): the `#000` hairline is drawn one stop BELOW the
      // tile's own `--snide-ink` fill, to keep the edge crisp where the tile
      // meets a light page. The S.N.I.D.E. family has no rung under its ink,
      // and minting one for a single hairline is the `-weak`/`-medium` mistake
      // index.css already records. Stays raw; see the legacy list.
      border: "1px solid #000", boxShadow: `0 8px 26px ${CAST}`, display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%",
        background: "radial-gradient(circle, var(--snide-acid) 0%, transparent 62%)", opacity: 0.22, filter: "blur(2px)" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <SnideSigil size={40} color="var(--snide-acid)" />
          <div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ransom-dispatch wordmark — Anton slammed at 0.85 leading */}
            <div style={{ fontFamily: "var(--font-faction-anton)", fontSize: 34, lineHeight: 0.85, color: "var(--snide-paper)", letterSpacing: "0.02em" }}>{factionName("snide")}</div>
            <div style={{ fontSize: "var(--text-base)", letterSpacing: "0.14em", color: "var(--snide-acid)", marginTop: "var(--space-xs)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.snide.masthead")}</div>
          </div>
        </div>
        {/* A percentage of the ink already on the tile, not a white hedge
            (#1609) — the same call `PraxisByline`'s dashed rule makes. */}
        <div style={{ borderTop: "1px dashed color-mix(in srgb, var(--snide-paper) 25%, transparent)", margin: "var(--space-lg) 0 var(--space-md)" }} />
        <p className="content-text" style={{ margin: 0, lineHeight: 1.65, color: "var(--snide-paper)" }}>
          {i18n.t("feed:factionSelect.snide.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-xl) var(--space-lg)" }}>
        <div style={{ fontFamily: "var(--font-faction-marker)", fontSize: "var(--text-xl)", color: "var(--snide-pink)", transform: "rotate(-1deg)", marginBottom: "var(--space-md)" }}>{status}</div>
        <button onClick={onVisit} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", cursor: "pointer",
          border: "2px solid var(--snide-acid)", background: "transparent", color: "var(--snide-acid)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: CTA is Anton condensed caps, part of the ransom-note voice, not label chrome
          fontFamily: "var(--font-faction-anton)", fontSize: 15, letterSpacing: "0.08em", padding: "var(--space-sm) var(--space-lg)", textTransform: "uppercase",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--snide-acid)"; e.currentTarget.style.color = "var(--snide-ink)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--snide-acid)"; }}
        ><span>{i18n.t("feed:factionSelect.snide.cta")}</span>{members != null && <span style={{ fontSize: "var(--text-base)" }}>{i18n.t("feed:factionSelect.snide.members", { count: members })}</span>}</button>
      </div>
    </div>
  );
}
