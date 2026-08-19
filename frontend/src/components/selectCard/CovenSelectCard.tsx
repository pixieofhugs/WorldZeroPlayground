import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import * as coven from "../factionMarks/covenSlip";

/**
 * Cozy Coven directory tile (#1209) — the spell slip at tile scale.
 *
 * The `whimsy.exe` window is gone with the rest of the sweep: the title bar and
 * its three RAW-HEX traffic-light dots, the `▢ ✕` chrome, the rotated status
 * sticker and the whole `--gestalt-*` alias family this tile was the only reader
 * of. The slip's own tokens replace them, so the tile now flips through the same
 * cascade as the task card instead of through a private palette.
 *
 * `feed:identity.coven.windowTitle` ("coven.exe") is no longer rendered here and
 * is left in the catalog: copy is out of scope for this sweep.
 */
export default function CovenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.coven.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: coven.SLIP_SHEET, color: coven.INK, fontFamily: coven.CHROME,
      border: `2px solid ${coven.BORDER}`, borderRadius: 18,
      boxShadow: coven.SHADOW, display: "flex", flexDirection: "column",
    }}>
      {/* masthead — the pentagram badge over a braided thread */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-md) var(--space-xl) 0" }}>
        <coven.SigilMark size={34} />
        <coven.Braid style={{ alignSelf: "stretch", marginTop: "var(--space-sm)" }} />
      </div>
      <div style={{ flex: 1, padding: "var(--space-md) var(--space-xl) 0", position: "relative" }}>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the coven's name hand-lettered in Caveat — the slip's masthead voice */}
        <div style={{ fontFamily: coven.HAND, fontWeight: 700, fontSize: 27, lineHeight: 1.1, color: coven.INK, whiteSpace: "nowrap" }}>
          {i18n.t("feed:factionSelect.coven.name")}
        </div>
        <p className="content-text" style={{ margin: "var(--space-sm) 0 0", fontFamily: coven.READING, fontStyle: "italic", lineHeight: 1.5, color: coven.SOFT }}>
          {i18n.t("feed:factionSelect.coven.blurb")}
        </p>
      </div>
      <div style={{ padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
          <div style={{ ...coven.SLIP_PANEL, boxShadow: "none", borderWidth: 1.5, borderRadius: 10, fontFamily: coven.READING, fontStyle: "italic", fontSize: "var(--text-content)", color: coven.SOFT, padding: "var(--space-xs) var(--space-sm)" }}>{status}</div>
          {members != null && <div style={{ ...coven.CAPTION, flexShrink: 0 }}>{i18n.t("feed:factionSelect.coven.members", { count: members })}</div>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-sm)",
          border: `1.5px solid ${coven.CTA_TO}`, borderRadius: 12,
          background: `linear-gradient(180deg, ${coven.CTA_FROM}, ${coven.CTA_TO})`, color: coven.CTA_INK,
          fontFamily: coven.CHROME, fontWeight: 700, fontSize: "var(--text-lg)", letterSpacing: "0.12em", textTransform: "uppercase",
          padding: "var(--space-md) var(--space-lg)", boxShadow: `0 8px 18px -8px ${coven.GLOW}`,
        }}>{i18n.t("feed:factionSelect.coven.cta")}</button>
      </div>
    </div>
  );
}
