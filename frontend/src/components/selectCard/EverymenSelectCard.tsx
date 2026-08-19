import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { EverymenSigil } from "../sigil/EverymenSigil";

/**
 * The Everymen — the faction-DIRECTORY tile (#2327, a child of #2321).
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THIS COMMIT IS THE EXTRACTION ONLY and repaints nothing: every declaration
 * below is the block that stood in `FactionSelectCard.tsx`, moved verbatim. The
 * register work is the commit after it, which is what makes that diff
 * reviewable.
 */

/**
 * Every tile casts onto the FEED page, not onto itself (#1609). The ground
 * behind them is `--color-bg-page`, which flips — so this is the ordinary lift
 * `--color-cast-shadow` exists for, and the three hand-rolled alphas that stood
 * here (0.28 / 0.4 / 0.5) were one shadow written three ways.
 *
 * IT USED TO SAY "the tiles are dark" (#2321/#2322). They are not — Coven's is
 * pink and UA's is cream — and that false premise is exactly what let a
 * dark-only register look correct on a surface that flips. Do not restore it.
 */
const CAST = "var(--color-cast-shadow)";

export default function EverymenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.everymen.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--everymen-field)", color: "var(--everymen-cream)", fontFamily: "var(--font-body)",
      border: "3px solid var(--everymen-ink)", boxShadow: `0 0 0 3px var(--everymen-paper), 0 8px 26px ${CAST}`,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
        background: "repeating-conic-gradient(from 0deg at 50% 34%, var(--everymen-field-deep) 0deg 7deg, transparent 7deg 14deg)" }} />
      <div style={{ position: "relative", background: "var(--everymen-ink)", color: "var(--everymen-gold)", textAlign: "center",
        fontFamily: "var(--font-faction-poster)", fontSize: "var(--text-xl)", letterSpacing: "0.3em",
        // eslint-disable-next-line local/no-raw-style-values -- ornament: lead of the struck banner strip; rounding reflows it.
        padding: "6px 0" }}>{i18n.t("feed:factionSelect.everymen.banner")}</div>
      <div style={{ height: 3, background: "var(--everymen-gold)" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-lg) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)" }}>
          <span style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--everymen-cream)", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 3px var(--everymen-ink), inset 0 0 0 4px var(--everymen-red)" }}>
            <EverymenSigil size={30} color="var(--everymen-red)" />
          </span>
        </div>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: union-poster headline — poster type at 0.86 leading with a hard drop shadow */}
        <div style={{ fontFamily: "var(--font-faction-poster)", fontSize: 40, lineHeight: 0.86, color: "var(--everymen-cream)", textShadow: "2px 2px 0 var(--everymen-ink)" }}>{i18n.t("feed:factionSelect.everymen.headline")}</div>
        <div
          style={{
            display: "inline-block",
            marginTop: "var(--space-md)",
            background: "var(--everymen-ink)",
            color: "var(--everymen-gold)",
            fontFamily: "var(--font-faction-poster)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: struck plaque — the block is the illustration, its lettering is set to the plate
            fontSize: 13,
            letterSpacing: "0.2em",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of the lettering within the struck plate; rounding reflows the plaque.
            padding: "3px 14px",
          }}
        >
          {i18n.t("feed:factionSelect.everymen.plaque")}
        </div>
      </div>
      <div style={{ position: "relative", padding: "var(--space-md) var(--space-xl) var(--space-lg)", textAlign: "center" }}>
        <div style={{ fontSize: "var(--text-base)", color: "var(--everymen-cream)", opacity: 0.9, marginBottom: "var(--space-md)" }}>{status}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "2px solid var(--everymen-ink)", background: "var(--everymen-gold)", color: "var(--everymen-ink)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: CTA is poster type; the shout is the archetype, a label token would flatten it (§270)
          fontFamily: "var(--font-faction-poster)", fontSize: 22, letterSpacing: "0.1em", padding: "var(--space-sm)",
        }}>{i18n.t("feed:factionSelect.everymen.cta")}{members != null ? ` ${i18n.t("feed:factionSelect.everymen.members", { count: members })}` : ""}</button>
      </div>
    </div>
  );
}
