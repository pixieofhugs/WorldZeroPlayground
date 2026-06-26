import React from "react";

/**
 * FactionlessActivityCard — the unaffiliated / system cards that fill the
 * shared activity feed between faction posts. These wear World Zero's
 * NEUTRAL app chrome (var(--color-bg-surface), var(--color-text-*),
 * var(--font-body) mono) rather than any faction archetype, and lean on the
 * shared --badge-* tokens so they read as "everyone's feed", not a faction's.
 *
 *   announcement → World Zero dispatch banner (dark, admin tokens)
 *   join         → a new player joined (global badge)
 *   duel         → a duel challenge (duel badge, accept / decline)
 *
 * Reads var(--…) so it flips with [data-theme="dark"] through the cascade.
 */

export function FactionlessActivityCard({ item }) {
  switch (item.kind) {
    case "announcement": return <AnnouncementCard item={item} />;
    case "duel": return <DuelCard item={item} />;
    case "join":
    default: return <JoinCard item={item} />;
  }
}

function Monogram({ initial, gradient }) {
  return (
    <div style={{
      flex: "none", width: 38, height: 38, borderRadius: "50%", background: gradient,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700,
      boxShadow: "0 0 0 1px var(--color-border-strong)",
    }}>{initial}</div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "#fff", background: color, padding: "3px 7px", borderRadius: 3 }}>{label}</span>
  );
}

/* ════ World Zero dispatch — admin announcement banner ════ */
function AnnouncementCard({ item }) {
  return (
    <article style={{ position: "relative", background: "var(--badge-admin-bg)", color: "var(--badge-admin-text)", padding: "15px 18px", marginBottom: 18, display: "flex", gap: 15, alignItems: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, background: "repeating-linear-gradient(135deg, rgba(247,244,238,.05) 0 1px, transparent 1px 7px)" }} />
      <div style={{ position: "relative", flex: "none", width: 40, height: 40, border: "1px solid rgba(247,244,238,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--badge-admin-text)" strokeWidth="1.2"><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="2" fill="var(--badge-admin-text)" stroke="none" /></svg>
      </div>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 8, letterSpacing: ".26em", textTransform: "uppercase", opacity: .65 }}>{item.eyebrow}</span>
          <span style={{ fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", border: "1px solid rgba(247,244,238,.35)", padding: "2px 6px" }}>{item.tag}</span>
          <span style={{ marginLeft: "auto", fontSize: 8, letterSpacing: ".14em", textTransform: "uppercase", opacity: .55 }}>{item.time}</span>
        </div>
        <div style={{ fontFamily: "var(--font-accent)", fontSize: 24, letterSpacing: ".02em", lineHeight: 1, marginTop: 7 }}>{item.title}</div>
      </div>
    </article>
  );
}

/* ════ New player joined — global ════ */
function JoinCard({ item }) {
  return (
    <article style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: 7, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 13, alignItems: "flex-start" }}>
      <Monogram initial={item.initial} gradient="linear-gradient(135deg,#9b8e7d,#6b6050)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", lineHeight: 1.4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{item.actor}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{item.action}</span>
          <Badge label={item.badge} color="var(--badge-global)" />
          <span style={{ marginLeft: "auto", fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>{item.time}</span>
        </div>
        <div style={{ marginTop: 9, padding: "8px 12px", borderLeft: "2px dashed var(--color-border-strong)", fontSize: 10, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
          {item.note} <span style={{ color: "var(--color-accent-primary)" }}>{item.cta}</span>
        </div>
      </div>
    </article>
  );
}

/* ════ Duel challenge ════ */
function DuelCard({ item }) {
  return (
    <article style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: 7, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 13, alignItems: "flex-start" }}>
      <Monogram initial={item.initial} gradient="linear-gradient(135deg,#7c5fb5,#4f46e5)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", lineHeight: 1.4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{item.actor}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{item.action}</span>
          <Badge label={item.badge} color="var(--badge-duel)" />
          <span style={{ marginLeft: "auto", fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>{item.time}</span>
        </div>
        <div style={{ marginTop: 9, padding: "9px 12px", background: "var(--color-bg-surface-alt)", borderRadius: 5, fontSize: 10, lineHeight: 1.55, color: "var(--color-text-primary)" }}>
          <span style={{ fontWeight: 700 }}>{item.contestTitle}</span> <span style={{ color: "var(--color-text-secondary)" }}>{item.contestNote}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "#fff", background: "var(--color-text-primary)", padding: "6px 14px", borderRadius: 4 }}>Accept</span>
          <span style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-strong)", padding: "6px 14px", borderRadius: 4 }}>Decline</span>
        </div>
      </div>
    </article>
  );
}
