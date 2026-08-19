import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import * as eph from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists tile — the cornice masthead the plate hangs under, standing on
 * its own (#1208). The night band, the sigil ruled in brass, and the CTA in the
 * plate’s gold. Nothing legible is
 * set in `brass`; on this ground the inks are `band-ink` (12.4:1), `gold` (9.4)
 * and `band-quiet` (8.6).
 */
export default function EphemeristsSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ephemerists.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: eph.BAND, color: eph.BAND_INK, fontFamily: eph.READING,
      border: `1px solid ${eph.BRASS}`, boxShadow: eph.SHADOW, display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 9, border: `1px solid color-mix(in srgb, ${eph.BRASS_LIGHT} 35%, transparent)`, pointerEvents: "none" }} />
      {/* An incised glyph register ran above the footer until #2210. It was
          the OLD vocabulary the notation band replaced on the masthead, and it
          retires kit-wide; nothing takes its place here, because this tile
          heads itself by hand and mounts no `EphemeristsMasthead`. */}
      <div style={{ position: "absolute", top: 16, right: 18, fontSize: "var(--text-md)", letterSpacing: "0.1em", color: eph.BAND_QUIET, textAlign: "right", lineHeight: 1.5 }}>{i18n.t("feed:factionSelect.ephemerists.coords")}<br />{i18n.t("feed:factionSelect.ephemerists.coordsPolar")}</div>
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <span style={{ width: 46, height: 46, borderRadius: "50%", border: `1.5px solid ${eph.BRASS}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <EphemeristsSigil size={26} color={eph.GOLD} />
          </span>
          <div>
            <div style={{ ...eph.SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.24em", color: eph.GOLD }}>{i18n.t("feed:factionSelect.ephemerists.eyebrow")}</div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the plate’s masthead wordmark — Poiret One letterspaced until the width is the mark */}
            <div style={{ fontFamily: eph.DECO, fontSize: 24, lineHeight: 1.1, letterSpacing: "0.22em", textTransform: "uppercase", color: eph.BAND_INK, marginTop: "var(--space-xs)" }}>{factionName("ephemerists")}</div>
          </div>
        </div>
        <div style={{ height: 1.5, background: `linear-gradient(90deg, ${eph.BRASS_LIGHT} 0%, transparent 100%)`, margin: "var(--space-lg) 0 var(--space-md)" }} />
        <p className="content-text" style={{ margin: 0, fontFamily: eph.READING, fontStyle: "italic", lineHeight: 1.45, color: eph.BAND_INK }}>
          {i18n.t("feed:factionSelect.ephemerists.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-xl) var(--space-lg)" }}>
        <div style={{ ...eph.SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: eph.BAND_QUIET, marginBottom: "var(--space-md)" }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.ephemerists.members", { count: members })}`}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: `1px solid ${eph.BRASS}`, background: "transparent", color: eph.GOLD,
          ...eph.SMALL_CAPS, fontSize: "var(--text-xl)", letterSpacing: "0.16em", padding: "var(--space-md)",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = eph.GOLD; e.currentTarget.style.color = eph.BAND; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = eph.GOLD; }}
        >{i18n.t("feed:factionSelect.ephemerists.cta")}</button>
      </div>
    </div>
  );
}

