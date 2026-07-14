import { useMemo } from "react";
import i18n from "../../i18n";

/**
 * FactionSelectCard — the faction-DIRECTORY tile, one per faction. The compact
 * card a player meets when browsing "Choose your faction": each renders in its
 * faction's full archetype (gilt placard, whimsy.exe window, ransom dispatch,
 * codex leaf, terminal printout, union poster, vellum letter) at a UNIFORM
 * 360×300 so the grid stays tidy.
 *
 * Ported from the Claude Design select.card. Faction-agnostic payload is just
 * { state, members?, onVisit }; name / archetype / blurb / status copy / CTA
 * are component-owned, derived from the faction slug. Joining is NOT on the
 * tile — the CTA visits the faction's detail page, which owns the Join block.
 *
 * Mirrors FactionCard.tsx's structure: dispatcher + per-faction archetypes +
 * the sigil atoms, all inline in one file.
 */

export type SelectState = "locked" | "eligible" | "member";

export interface FactionSelectCardProps {
  /** Faction slug (raw slug wins; legacy slugs fall back via LEGACY_SLUG). */
  faction: string;
  /** Viewer's relationship to the faction — drives the status line. */
  state?: SelectState;
  /** Member-count social proof (label is faction-specific). Omitted when
   *  unknown — the backend does not yet expose a per-faction count. */
  members?: number;
  /** Visit-faction handler (the per-faction "visit" CTA). */
  onVisit?: () => void;
}

// ─── Sigils ───────────────────────────────────────────────────────────────────

let _uaUid = 0;
function UASigil({ size = 50 }: { size?: number }) {
  const id = useMemo(() => "uasigil-" + _uaUid++, []);
  const shield = "M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z";
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ display: "block" }}>
      <defs><clipPath id={id}><path d={shield} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="100" height="120" fill="var(--ua-orange)" />
        <rect x="0" y="60" width="100" height="60" fill="#f8ead2" />
        <circle cx="50" cy="60" r="15" fill="#f0b53e" />
        <g stroke="#f0b53e" strokeWidth="2.4" strokeLinecap="round">
          <line x1="50" y1="60" x2="50" y2="20" /><line x1="50" y1="60" x2="22" y2="30" /><line x1="50" y1="60" x2="78" y2="30" />
          <line x1="50" y1="60" x2="14" y2="48" /><line x1="50" y1="60" x2="86" y2="48" /><line x1="50" y1="60" x2="34" y2="22" /><line x1="50" y1="60" x2="66" y2="22" />
        </g>
        <g transform="translate(50 84)">
          <g transform="rotate(38)"><rect x="-2" y="-30" width="4" height="44" rx="1.5" fill="#3d2410" /><rect x="-3" y="10" width="6" height="6" fill="#eab94a" /><path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill="var(--ua-orange)" /></g>
          <g transform="rotate(-38)"><rect x="-2" y="-30" width="4" height="44" rx="1.5" fill="var(--ua-gold)" /><rect x="-3" y="10" width="6" height="6" fill="#eab94a" /><path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill="var(--ua-gold-lt)" /></g>
        </g>
      </g>
      <path d={shield} fill="none" stroke="var(--ua-gold-lt)" strokeWidth="2.5" />
      <path d={shield} fill="none" stroke="#3d2410" strokeWidth="0.8" />
    </svg>
  );
}

function WOWSigil({ size = 22, color = "var(--gestalt-pink)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z" fill={color} />
    </svg>
  );
}

function SNIDESigil({ size = 48, color = "var(--snide-acid)" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: "block" }}>
      <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="3" />
      <text x="24" y="34" textAnchor="middle" fontFamily="var(--font-faction-anton)" fontSize="30" fill={color}>S</text>
      <line x1="9" y1="40" x2="39" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EphemeristsSigil({ size = 22, color = "var(--eph-lapis)", stroke = 1.4 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} style={{ display: "block" }}>
      <ellipse cx="12" cy="12" rx="11" ry="4.4" transform="rotate(-24 12 12)" />
      <path d="M4 12 C7.5 8.2 16.5 8.2 20 12 C16.5 15.8 7.5 15.8 4 12 Z" />
      <circle cx="12" cy="12" r="2.7" />
      <circle cx="12" cy="12" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

function SingularitySigil({ size = 15, color = "#4ade80", coreHole = "#050f08" }: { size?: number; color?: string; coreHole?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <circle cx="12" cy="12" r="10.3" fill="none" stroke={color} strokeWidth="0.62" opacity="0.32" />
      <circle cx="12" cy="12" r="5.76" fill="none" stroke={color} strokeWidth="0.82" opacity="0.68" />
      <g stroke={color} strokeWidth="0.86" opacity="0.8">
        <line x1="17.76" y1="12" x2="22.32" y2="12" /><line x1="12" y1="17.76" x2="12" y2="22.32" />
        <line x1="6.24" y1="12" x2="1.68" y2="12" /><line x1="12" y1="6.24" x2="12" y2="1.68" />
      </g>
      <g fill={color} opacity="0.78">
        <circle cx="22.32" cy="12" r="1.2" /><circle cx="12" cy="22.32" r="1.2" /><circle cx="1.68" cy="12" r="1.2" /><circle cx="12" cy="1.68" r="1.2" />
      </g>
      <circle cx="12" cy="12" r="2.28" fill={color} opacity="0.92" />
      <circle cx="12" cy="12" r="0.87" fill={coreHole} />
    </svg>
  );
}

function EverymenSigil({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <g fill={color}>
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x="11" y="0.5" width="2" height="5" rx="0.5" transform={`rotate(${i * 45} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

function AlbescentSigil({ size = 20, color = "var(--faction-albescent-card-text, #1c1c1a)" }: { size?: number; color?: string }) {
  const c = size / 2, rO = size * 0.43, rI = size * 0.235, rD = size * 0.05;
  const tS = rI + size * 0.025, tE = tS + size * 0.13;
  const tick = (deg: number) => { const a = (deg * Math.PI) / 180; return { x1: c + tS * Math.cos(a), y1: c + tS * Math.sin(a), x2: c + tE * Math.cos(a), y2: c + tE * Math.sin(a) }; };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ display: "block", flexShrink: 0 }}>
      <circle cx={c} cy={c} r={rO} stroke={color} strokeWidth={size * 0.022} opacity={0.18} />
      <circle cx={c} cy={c} r={rI} stroke={color} strokeWidth={size * 0.05} opacity={0.55} />
      {[0, 90, 180, 270].map((deg, i) => { const { x1, y1, x2, y2 } = tick(deg); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={size * 0.05} />; })}
      <circle cx={c} cy={c} r={rD} fill={color} />
    </svg>
  );
}

// ─── Per-faction archetypes ───────────────────────────────────────────────────

function UASelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ua.status.${state}` as const);
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--ua-paper)", color: "var(--ua-ink)", fontFamily: "var(--font-body)",
      border: "1px solid var(--ua-line)", boxShadow: "0 6px 24px rgba(61,36,16,0.12)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 6, border: "2px solid var(--ua-gold)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 9, border: "1px solid var(--ua-line-soft)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, padding: "22px 26px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: 10, letterSpacing: "0.32em", color: "var(--ua-gold)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.ua.masthead")}</div>
            <div style={{ fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", fontWeight: 800, fontSize: 52, lineHeight: 0.9, letterSpacing: "0.01em", marginTop: 8 }}>{i18n.t("feed:factionSelect.ua.wordmark")}</div>
            <div style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: 12, letterSpacing: "0.24em", color: "var(--ua-sub)", textTransform: "uppercase", marginTop: 3 }}>{i18n.t("feed:factionSelect.ua.subtitle")}</div>
          </div>
          <UASigil size={44} />
        </div>
        <div style={{ height: 2, background: "var(--ua-gilt)", margin: "16px 0 13px", opacity: 0.85 }} />
        <p style={{ margin: 0, fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", fontSize: 16, lineHeight: 1.4, color: "var(--ua-ink)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 26px 20px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.04em", color: "var(--ua-sub)", marginBottom: 11 }}>
          {status}{members != null && <> · <span style={{ color: "var(--ua-muted)" }}>{i18n.t("feed:factionSelect.ua.members", { count: members })}</span></>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--ua-gold)", background: "transparent",
          color: "var(--ua-orange)", fontFamily: "var(--font-faction-engraved-caps)", fontSize: 13, letterSpacing: "0.18em",
          textTransform: "uppercase", padding: "10px", transition: "background 140ms, color 140ms",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ua-orange)"; e.currentTarget.style.color = "var(--ua-paper)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ua-orange)"; }}
        >{i18n.t("feed:factionSelect.ua.cta")}</button>
      </div>
    </div>
  );
}

function WOWSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.wow.status.${state}` as const);
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--gestalt-card-bg)", color: "var(--gestalt-ink)", fontFamily: "var(--font-body)",
      border: "1.5px solid var(--gestalt-win-border)", borderRadius: 10,
      boxShadow: "0 10px 30px var(--gestalt-glow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        background: "linear-gradient(var(--gestalt-title-from), var(--gestalt-title-to))",
        borderBottom: "1.5px solid var(--gestalt-win-border)" }}>
        <span style={{ display: "flex", gap: 6 }}>
          {["#f6c75e", "#7fc59e", "#ec5f99"].map((color) => <i key={color} style={{ width: 11, height: 11, borderRadius: "50%", background: color, border: "1px solid rgba(0,0,0,0.15)" }} />)}
        </span>
        <span style={{ fontSize: 12, color: "var(--gestalt-title-text)", letterSpacing: "0.02em" }}>{i18n.t("feed:identity.wow.windowTitle")}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gestalt-title-text)", opacity: 0.7 }}>▢ ✕</span>
      </div>
      <div style={{ flex: 1, padding: "14px 20px 0", position: "relative" }}>
        <div style={{ fontFamily: "var(--font-faction-script)", fontWeight: 700, fontSize: 27, lineHeight: 1.1, color: "var(--gestalt-ink)", whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 6 }}><WOWSigil size={18} color="var(--gestalt-pink)" /></span>{i18n.t("feed:factionSelect.wow.name")}
        </div>
        <p style={{ margin: "13px 0 0", fontSize: 12, lineHeight: 1.6, color: "var(--gestalt-ink-soft)" }}>
          {i18n.t("feed:factionSelect.wow.blurb")}
        </p>
      </div>
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 }}>
          <div style={{ transform: "rotate(-1.5deg)", background: "var(--gestalt-pink-lt)", color: "var(--gestalt-ink)", fontSize: 10.5, padding: "5px 10px", borderRadius: 4 }}>{status}</div>
          {members != null && <div style={{ flexShrink: 0, fontSize: 9.5, letterSpacing: "0.04em", color: "var(--gestalt-label)" }}>{i18n.t("feed:factionSelect.wow.members", { count: members })}</div>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer",
          border: "1.5px solid var(--gestalt-pink)", borderRadius: 7, background: "var(--gestalt-pink)", color: "#fff",
          fontFamily: "var(--font-faction-script)", fontWeight: 700, fontSize: 21, padding: "6px 14px",
        }}>{i18n.t("feed:factionSelect.wow.cta")}</button>
      </div>
    </div>
  );
}

function SNIDESelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.snide.status.${state}` as const);
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--snide-ink)", color: "var(--snide-paper)", fontFamily: "var(--font-faction-typewriter)",
      border: "1px solid #000", boxShadow: "0 8px 26px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%",
        background: "radial-gradient(circle, var(--snide-acid) 0%, transparent 62%)", opacity: 0.22, filter: "blur(2px)" }} />
      <div style={{ position: "absolute", top: 14, left: 22, width: 74, height: 20, background: "var(--snide-tape)", transform: "rotate(-6deg)", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", flex: 1, padding: "26px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SNIDESigil size={40} color="var(--snide-acid)" />
          <div>
            <div style={{ fontFamily: "var(--font-faction-anton)", fontSize: 34, lineHeight: 0.85, color: "var(--snide-paper)", letterSpacing: "0.02em" }}>{i18n.t("feed:identity.snide.wordmark")}</div>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--snide-acid)", marginTop: 4, textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.snide.masthead")}</div>
          </div>
        </div>
        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.25)", margin: "16px 0 12px" }} />
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: "var(--snide-paper)" }}>
          {i18n.t("feed:factionSelect.snide.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 24px 20px" }}>
        <div style={{ fontFamily: "var(--font-faction-marker)", fontSize: 14, color: "var(--snide-pink)", transform: "rotate(-1deg)", marginBottom: 10 }}>{status}</div>
        <button onClick={onVisit} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", cursor: "pointer",
          border: "2px solid var(--snide-acid)", background: "transparent", color: "var(--snide-acid)",
          fontFamily: "var(--font-faction-anton)", fontSize: 15, letterSpacing: "0.08em", padding: "9px 14px", textTransform: "uppercase",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--snide-acid)"; e.currentTarget.style.color = "var(--snide-ink)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--snide-acid)"; }}
        ><span>{i18n.t("feed:factionSelect.snide.cta")}</span>{members != null && <span style={{ fontSize: 10 }}>{i18n.t("feed:factionSelect.snide.members", { count: members })}</span>}</button>
      </div>
    </div>
  );
}

function EphemeristsSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ephemerists.status.${state}` as const);
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--eph-field)", color: "var(--eph-parchment)", fontFamily: "var(--font-faction-codex)",
      border: "1px solid var(--eph-gold-deep)", boxShadow: "0 8px 26px rgba(20,59,84,0.4)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 9, border: "1px solid rgba(180,150,80,0.35)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 16, right: 18, fontSize: 9, letterSpacing: "0.1em", color: "var(--eph-gold-light)", opacity: 0.7, textAlign: "right", lineHeight: 1.5 }}>{i18n.t("feed:factionSelect.ephemerists.coords")}<br />{i18n.t("feed:factionSelect.ephemerists.coordsPolar")}</div>
      <div style={{ position: "relative", flex: 1, padding: "22px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ width: 46, height: 46, borderRadius: "50%", border: "1.5px solid var(--eph-gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <EphemeristsSigil size={26} color="var(--eph-gold-light)" stroke={1.4} />
          </span>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.24em", color: "var(--eph-gold-light)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.ephemerists.eyebrow")}</div>
            <div style={{ fontFamily: "var(--font-faction-engraved)", fontWeight: 800, fontSize: 26, lineHeight: 1, letterSpacing: "0.03em", color: "var(--eph-parchment)", marginTop: 4, textShadow: "1px 1px 0 var(--eph-field-deep)" }}>{i18n.t("feed:identity.ephemerists.wordmark")}</div>
          </div>
        </div>
        <div style={{ height: 1.5, background: "linear-gradient(90deg, var(--eph-gold) 0%, transparent 100%)", margin: "16px 0 13px" }} />
        <p style={{ margin: 0, fontFamily: "var(--font-faction-codex-script)", fontStyle: "italic", fontSize: 17, lineHeight: 1.45, color: "var(--eph-parchment)" }}>
          {i18n.t("feed:factionSelect.ephemerists.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 24px 20px" }}>
        <div style={{ fontSize: 10.5, letterSpacing: "0.03em", color: "var(--eph-gold-light)", marginBottom: 11 }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.ephemerists.members", { count: members })}`}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--eph-gold)", background: "transparent", color: "var(--eph-gold-light)",
          fontFamily: "var(--font-faction-engraved)", fontWeight: 600, fontSize: 13, letterSpacing: "0.16em", padding: "10px", textTransform: "uppercase",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--eph-gold)"; e.currentTarget.style.color = "var(--eph-field-deep)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--eph-gold-light)"; }}
        >{i18n.t("feed:factionSelect.ephemerists.cta")}</button>
      </div>
    </div>
  );
}

function SingularitySelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.singularity.status.${state}` as const);
  const green = "#4ade80";
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "#050f08", color: green, fontFamily: "var(--font-faction-terminal)",
      border: "1px solid #2563eb", boxShadow: "0 8px 26px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(rgba(74,222,128,0.05) 0 1px, transparent 1px 3px)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid rgba(96,165,250,0.4)" }}>
        {Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 1, background: "rgba(96,165,250,0.5)" }} />)}
      </div>
      <div style={{ position: "relative", flex: 1, padding: "16px 18px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#60a5fa", textTransform: "uppercase" }}>
          {i18n.t("feed:identity.singularity.protocol")}<span style={{ display: "inline-block", width: 6, height: 11, background: green, marginLeft: 4, verticalAlign: "middle", animation: "wz-blink 1s step-end infinite" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 12 }}>
          <SingularitySigil size={30} color={green} />
          <span style={{ fontSize: 30, color: green, letterSpacing: "0.02em" }}>{i18n.t("feed:factionSelect.singularity.name")}</span>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 12, lineHeight: 1.65, color: "#8fe6ac" }}>
          &gt; {i18n.t("feed:factionSelect.singularity.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 18px 18px" }}>
        <div style={{ fontSize: 11, color: "#60a5fa", marginBottom: 10 }}>{status}{members != null && <span style={{ float: "right", color: green }}>{i18n.t("feed:factionSelect.singularity.members", { count: members })}</span>}</div>
        <button onClick={onVisit} style={{
          display: "flex", alignItems: "center", width: "100%", cursor: "pointer", gap: 8,
          border: "1px solid #2563eb", background: "rgba(37,99,235,0.14)", color: green,
          fontFamily: "var(--font-faction-terminal)", fontSize: 14, letterSpacing: "0.06em", padding: "9px 13px",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = green; e.currentTarget.style.color = "#050f08"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(37,99,235,0.14)"; e.currentTarget.style.color = green; }}
        ><span style={{ opacity: 0.7 }}>$</span> {i18n.t("feed:factionSelect.singularity.cta")}</button>
      </div>
      <style>{`@keyframes wz-blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

function EverymenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.everymen.status.${state}` as const);
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--everymen-field)", color: "var(--everymen-cream)", fontFamily: "var(--font-body)",
      border: "3px solid var(--everymen-ink)", boxShadow: "0 0 0 3px var(--everymen-paper), 0 8px 26px rgba(0,0,0,0.28)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
        background: "repeating-conic-gradient(from 0deg at 50% 34%, var(--everymen-field-deep) 0deg 7deg, transparent 7deg 14deg)" }} />
      <div style={{ position: "relative", background: "var(--everymen-ink)", color: "var(--everymen-gold)", textAlign: "center",
        fontFamily: "var(--font-faction-poster)", fontSize: 14, letterSpacing: "0.3em", padding: "6px 0" }}>{i18n.t("feed:factionSelect.everymen.banner")}</div>
      <div style={{ height: 3, background: "var(--everymen-gold)" }} />
      <div style={{ position: "relative", flex: 1, padding: "14px 22px 0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <span style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--everymen-cream)", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 3px var(--everymen-ink), inset 0 0 0 4px var(--everymen-red)" }}>
            <EverymenSigil size={30} color="var(--everymen-red)" />
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-faction-poster)", fontSize: 40, lineHeight: 0.86, color: "var(--everymen-cream)", textShadow: "2px 2px 0 var(--everymen-ink)" }}>{i18n.t("feed:factionSelect.everymen.headline")}</div>
        <div style={{ display: "inline-block", marginTop: 11, background: "var(--everymen-ink)", color: "var(--everymen-gold)",
          fontFamily: "var(--font-faction-poster)", fontSize: 13, letterSpacing: "0.2em", padding: "3px 14px" }}>{i18n.t("feed:factionSelect.everymen.plaque")}</div>
      </div>
      <div style={{ position: "relative", padding: "10px 22px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--everymen-cream)", opacity: 0.9, marginBottom: 10 }}>{status}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "2px solid var(--everymen-ink)", background: "var(--everymen-gold)", color: "var(--everymen-ink)",
          fontFamily: "var(--font-faction-poster)", fontSize: 22, letterSpacing: "0.1em", padding: "8px",
        }}>{i18n.t("feed:factionSelect.everymen.cta")}{members != null ? ` ${i18n.t("feed:factionSelect.everymen.members", { count: members })}` : ""}</button>
      </div>
    </div>
  );
}

function AlbescentSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.albescent.status.${state}` as const);
  return (
    <div style={{
      width: 360, height: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--al-surface)", color: "var(--al-text)", fontFamily: "var(--font-faction-vellum)",
      border: "1px solid var(--al-border)", boxShadow: "var(--al-shadow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 12, border: "1px solid var(--al-border-faint)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, padding: "26px 30px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 9, letterSpacing: "0.34em", color: "var(--al-text-muted)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.albescent.eyebrow")}</div>
          <AlbescentSigil size={26} color="var(--al-ink)" />
        </div>
        <div style={{ fontFamily: "var(--font-faction-vellum)", fontStyle: "italic", fontWeight: 600, fontSize: 40, lineHeight: 1, letterSpacing: "0.01em", marginTop: 16 }}>{i18n.t("feed:factionSelect.albescent.name")}</div>
        <div style={{ width: 44, height: 1, background: "var(--al-text)", opacity: 0.5, margin: "13px 0" }} />
        <p style={{ margin: 0, fontStyle: "italic", fontSize: 16, lineHeight: 1.45, color: "var(--al-ink)" }}>
          {i18n.t("feed:factionSelect.albescent.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "14px 30px 22px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 9.5, letterSpacing: "0.06em", color: "var(--al-text-muted)", marginBottom: 13, textTransform: "uppercase" }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.albescent.members", { count: members })}`}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--al-text)", background: "transparent", color: "var(--al-text)",
          fontFamily: "var(--font-body)", fontSize: 10.5, letterSpacing: "0.22em", padding: "11px", textTransform: "uppercase", transition: "background 140ms, color 140ms",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--al-text)"; e.currentTarget.style.color = "var(--al-surface)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--al-text)"; }}
        >{i18n.t("feed:factionSelect.albescent.cta")}</button>
      </div>
    </div>
  );
}

// ─── Switcher ─────────────────────────────────────────────────────────────────

const BY_FACTION: Record<string, (p: Omit<FactionSelectCardProps, "faction">) => JSX.Element> = {
  ua: UASelectCard,
  wow: WOWSelectCard,
  snide: SNIDESelectCard,
  ephemerists: EphemeristsSelectCard,
  singularity: SingularitySelectCard,
  everymen: EverymenSelectCard,
  albescent: AlbescentSelectCard,
};

// Retired/renamed slugs → their live archetype. Raw slug wins first so
// `albescent` renders its own card (the repo's FACTION_ALIASES maps
// albescent→ua for the legacy skins; the select cards are first-class).
const LEGACY_SLUG: Record<string, string> = {
  gestalt: "wow",
  journeymen: "ephemerists",
};

export default function FactionSelectCard({ faction, ...rest }: FactionSelectCardProps) {
  const key = BY_FACTION[faction] ? faction : LEGACY_SLUG[faction] ?? faction;
  const Card = BY_FACTION[key] ?? UASelectCard;
  return <Card {...rest} />;
}
