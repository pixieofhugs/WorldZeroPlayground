import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { SingularitySigil } from "../sigil/SingularitySigil";

/**
 * The Singularity tile's palette (#1609).
 *
 * These are `var()` strings rather than values, so the names below carry no
 * colour of their own. Every one is theme-INVARIANT in `index.css` — Singularity
 * is always-dark, and this tile is near-black in both cascades, so an ink that
 * flipped underneath it would be the #1792 defect (a token that moves on a
 * ground that does not).
 */
const TERM_VOID = "var(--faction-singularity-card-bg)";
const TERM_GREEN = "var(--faction-singularity-card-text)";
const TERM_BLUE = "var(--faction-singularity-border-hard)";
const TERM_CYAN = "var(--faction-singularity-card-muted)";
const TERM_CTA_BG = `color-mix(in srgb, ${TERM_BLUE} 14%, transparent)`;

export default function SingularitySelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.singularity.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: TERM_VOID, color: TERM_GREEN, fontFamily: "var(--font-faction-terminal)",
      border: `1px solid ${TERM_BLUE}`, boxShadow: "0 8px 26px var(--color-cast-shadow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-sm) var(--space-md)", borderBottom: `1px solid color-mix(in srgb, ${TERM_CYAN} 40%, transparent)` }}>
        {Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 1, background: `color-mix(in srgb, ${TERM_CYAN} 50%, transparent)` }} />)}
      </div>
      <div style={{ position: "relative", flex: 1, padding: "var(--space-lg) var(--space-lg) 0" }}>
        {/* The card opened on "singularity protocol" with the blinking cursor
            after it (`feed:identity.singularity.protocol`). That key is on
            #1864's CUT list, so #1909 removed it here too — the surface KEPT by
            the audit is `feed:factionSelect.*`, every one of which this card
            still reads; the `identity.*` overline was a different, single-faction
            slot on top of it. */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          <SingularitySigil size={30} color={TERM_GREEN} />
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: terminal-printout faction name — display-size mono, the archetype's banner */}
          <span style={{ fontSize: 30, color: TERM_GREEN, letterSpacing: "0.02em" }}>{i18n.t("feed:factionSelect.singularity.name")}</span>
        </div>
        {/* `#8fe6ac` stood here (#1609) — a fourth green, and BRIGHTER than the
            phosphor accent above it (13.06:1 against the accent's 11.18:1),
            which inverts the weighting every other Singularity surface uses.
            `--faction-singularity-phosphor-dim` is the token minted for exactly
            this slot: a SOLID dim green so prose can sit below the accent
            without sitting below AA (7.31:1 on this ground). */}
        <p className="content-text" style={{ margin: "var(--space-lg) 0 0", lineHeight: 1.65, color: "var(--faction-singularity-phosphor-dim)" }}>
          &gt; {i18n.t("feed:factionSelect.singularity.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-lg) var(--space-lg)" }}>
        <div style={{ fontSize: "var(--text-md)", color: TERM_CYAN, marginBottom: "var(--space-md)" }}>{status}{members != null && <span style={{ float: "right", color: TERM_GREEN }}>{i18n.t("feed:factionSelect.singularity.members", { count: members })}</span>}</div>
        <button onClick={onVisit} style={{
          display: "flex", alignItems: "center", width: "100%", cursor: "pointer", gap: "var(--space-sm)",
          border: `1px solid ${TERM_BLUE}`, background: TERM_CTA_BG, color: TERM_GREEN,
          fontFamily: "var(--font-faction-terminal)", fontSize: "var(--text-xl)", letterSpacing: "0.06em", padding: "var(--space-sm) var(--space-md)",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = TERM_GREEN; e.currentTarget.style.color = TERM_VOID; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = TERM_CTA_BG; e.currentTarget.style.color = TERM_GREEN; }}
        ><span style={{ opacity: 0.7 }}>$</span> {i18n.t("feed:factionSelect.singularity.cta")}</button>
      </div>
    </div>
  );
}
