import React from "react";

/**
 * FactionActivityCard — World Zero's activity-feed card, one COMPLETELY
 * different physical archetype per faction. Mirrors the pattern of the
 * existing FactionTaskCard / FactionCommentBox components: a single
 * <FactionActivityCard faction="…"> picks the right archetype.
 *
 *   ua          → gilt salon          (submitted to the Salon)
 *   wow         → whimsy.exe window    (leveled up)
 *   snide       → ransom dispatch slip (accepted an assignment)
 *   ephemerists → the discordant map   (sealed a praxis)
 *   singularity → terminal printout    (intercepted a signal — always dark)
 *   everymen    → union dispatch slip  (completed a task)
 *   albescent   → vellum correspondence(bore witness — logs no points)
 *
 * All colour/type values come from the World Zero token CSS already in the
 * codebase (tokens/colors.css, tokens/typography.css, tokens/fonts.css —
 * mirrors frontend/src/index.css). Every card reads var(--…) so it flips
 * with [data-theme="dark"] through the cascade — except the always-light
 * (ua, albescent) and always-dark (singularity, snide) archetypes, which
 * pin their own surface on purpose.
 *
 * The data model per item is documented in sampleFeed.js.
 */

const SLUG_ALIAS = { gestalt: "wow", journeymen: "ephemerists", aged_out: "ua" };
const canonicalSlug = (s) => SLUG_ALIAS[s] ?? s ?? "";

export function FactionActivityCard({ item }) {
  switch (canonicalSlug(item.faction)) {
    case "wow": return <WowCard item={item} />;
    case "snide": return <SnideCard item={item} />;
    case "ephemerists": return <EphemeristsCard item={item} />;
    case "singularity": return <SingularityCard item={item} />;
    case "everymen": return <EverymenCard item={item} />;
    case "albescent": return <AlbescentCard item={item} />;
    case "ua":
    default: return <UaCard item={item} />;
  }
}

/* ── shared monogram avatar ─────────────────────────────────────── */
function Monogram({ initial, size = 38, style, font, fontSize }) {
  return (
    <div style={{
      flex: "none", width: size, height: size, display: "flex",
      alignItems: "center", justifyContent: "center", color: "#fff",
      fontFamily: font || "var(--font-body)", fontSize: fontSize || 15, fontWeight: 700,
      ...style,
    }}>{initial}</div>
  );
}

/* ════ SINGULARITY — terminal printout (always dark) ════ */
function Sprockets() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "5px 0" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 4, background: "#03160a", border: "1px solid #2f6f3f" }} />
      ))}
    </div>
  );
}
function SingularityCard({ item }) {
  return (
    <article style={{
      position: "relative", background: "#050f08", border: "1px solid #2563eb",
      boxShadow: "0 0 0 1px rgba(37,99,235,.3)", marginBottom: 18, overflow: "hidden",
      fontFamily: "var(--font-faction-terminal)", color: "#4ade80",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, background: "repeating-linear-gradient(to bottom, transparent 0 2px, rgba(74,222,128,.018) 2px, rgba(74,222,128,.018) 4px)" }} />
      <div style={{ borderBottom: "1px solid rgba(37,99,235,.25)" }}><Sprockets /></div>
      <div style={{ position: "relative", zIndex: 2, padding: "12px 16px 14px" }}>
        <div style={{ fontSize: 9, color: "#60a5fa", letterSpacing: ".04em" }}>
          &gt; {item.handle}@signal <span style={{ color: "#3a5f9c" }}>[{item.time}]</span>{" "}
          <span style={{ border: "1px solid #4ade80", color: "#4ade80", padding: "0 4px", fontSize: 7, letterSpacing: ".1em" }}>SINGULARITY</span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 9, color: "#9fc2ff" }}>
          &gt; {item.action}<span style={{ animation: "af-blink 1s step-end infinite" }}>_</span>
        </div>
        <div style={{ fontSize: 11, marginTop: 6, color: "#4ade80", letterSpacing: ".04em" }}>{item.object}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 11, paddingTop: 9, borderTop: "1px solid rgba(37,99,235,.25)", fontSize: 9, color: "#60a5fa" }}>
          <span>SIGNAL: <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 700 }}>+{item.points}</span></span>
          <span>LVL {item.level}</span>
          <span style={{ marginLeft: "auto", color: "#3a5f9c", fontSize: 8, letterSpacing: ".06em" }}>{item.motto}</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(37,99,235,.25)", position: "relative", zIndex: 2 }}><Sprockets /></div>
    </article>
  );
}

/* ════ EVERYMEN — union dispatch slip (completed a task) ════ */
function EverymenCard({ item }) {
  const t = item.task;
  return (
    <article style={{
      position: "relative", background: "var(--everymen-paper)", color: "var(--everymen-paper-text)",
      border: "1px solid color-mix(in srgb, var(--everymen-paper-text) 26%, transparent)", borderLeft: "none",
      marginBottom: 18, overflow: "hidden", display: "flex", fontFamily: "var(--font-body)",
      boxShadow: "0 6px 16px -12px rgba(0,0,0,.5)",
    }}>
      <div style={{ width: 8, flex: "none", background: "var(--everymen-red)", backgroundImage: "repeating-linear-gradient(180deg, transparent 0 13px, color-mix(in srgb, var(--everymen-cream) 55%, transparent) 13px 15px)" }} />
      <div style={{ flex: 1, minWidth: 0, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <div style={{ position: "relative", flex: "none", width: 38, height: 38 }}>
            <Monogram initial={item.initial} font="var(--font-accent)" fontSize={16} style={{ borderRadius: "50%", background: "linear-gradient(135deg,#b06a2e,#6b4220)", color: "var(--everymen-cream)", boxShadow: "0 0 0 2px var(--everymen-ink), 0 0 0 4px var(--everymen-paper)" }} />
            <div style={{ position: "absolute", right: -4, bottom: -4, width: 17, height: 17, borderRadius: "50%", background: "var(--everymen-red)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1.5px var(--everymen-paper)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--everymen-cream)" strokeWidth="2.4" /><circle cx="12" cy="12" r="2" fill="var(--everymen-cream)" /></svg>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", lineHeight: 1.4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{item.actor}</span>
              <span style={{ fontSize: 12, color: "var(--everymen-muted)" }}>{item.action}</span>
              <span style={{ position: "relative", display: "inline-block", background: "var(--everymen-red)", color: "var(--everymen-cream)", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", padding: "3px 8px", transform: "rotate(-2deg)" }}>
                {item.badge}<span style={{ position: "absolute", inset: 2, border: "1px dashed rgba(255,255,255,.35)" }} />
              </span>
            </div>
            <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--everymen-muted)", marginTop: 3 }}>{item.time}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 12, paddingLeft: 49 }}>
          <div style={{ flex: "none", width: 5, alignSelf: "stretch", minHeight: 34, background: "var(--everymen-red)", borderTop: "4px solid var(--everymen-gold)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-accent)", fontSize: 25, lineHeight: .96, letterSpacing: ".01em" }}>{t.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-accent)", fontSize: 16, color: "var(--everymen-red)", letterSpacing: ".02em" }}>{t.points} PTS</span>
              <span style={{ background: "var(--everymen-ink)", color: "var(--everymen-cream)", fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", padding: "2px 7px" }}>lvl {t.level}</span>
              <span style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--everymen-muted)" }}>{item.motto}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ════ WARRIORS OF WHIMSY — whimsy.exe window (leveled up) ════ */
function WowCard({ item }) {
  return (
    <article style={{
      position: "relative", background: "var(--gestalt-card-bg)", border: "2px solid var(--gestalt-pink-deep)",
      borderRadius: 10, boxShadow: "4px 4px 0 var(--gestalt-pink-lt)", marginBottom: 18, overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 11px", background: "linear-gradient(180deg,var(--gestalt-title-from),var(--gestalt-title-to))", borderBottom: "2px solid var(--gestalt-win-border)" }}>
        <span style={{ fontFamily: "var(--font-faction-script)", fontSize: 17, color: "#fff", textShadow: "1px 1px 0 #a83a6e", lineHeight: .9 }}>✦ levelup.exe</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
          <span style={{ width: 11, height: 11, background: "#fff", border: "1.5px solid #a83a6e", borderRadius: 3 }} />
          <span style={{ width: 11, height: 11, background: "#fde2ee", border: "1.5px solid #a83a6e", borderRadius: 3 }} />
        </span>
      </div>
      <div style={{ position: "relative", padding: "13px 15px 15px", backgroundImage: "radial-gradient(var(--gestalt-border-soft) 1.3px, transparent 1.3px)", backgroundSize: "13px 13px" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <Monogram initial={item.initial} font="var(--font-faction-script)" fontSize={20} style={{ borderRadius: 8, background: "linear-gradient(135deg,#f9b6d4,#d23b7e)", border: "2px solid #ec5f99", boxShadow: "2px 2px 0 #fbcfe2" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-faction-script)", fontSize: 21, color: "var(--gestalt-ink)", lineHeight: 1 }}>{item.actor} ✦</span>
              <span style={{ fontSize: 9, color: "var(--gestalt-ink-soft)" }}>{item.action}</span>
              <span style={{ marginLeft: "auto", fontSize: 8, color: "var(--gestalt-label)" }}>{item.time}</span>
            </div>
            <div style={{ fontFamily: "var(--font-faction-script)", fontSize: 26, lineHeight: 1.05, color: "var(--gestalt-ink)", marginTop: 4 }}>{item.headline}</div>
            <div style={{ fontSize: 9, color: "var(--gestalt-ink-soft)", marginTop: 5 }}>{item.motto}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11, paddingTop: 9, borderTop: "1px solid var(--gestalt-border-soft)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-faction-script)", fontSize: 18, color: "var(--gestalt-pink)" }}>
            <svg width="15" height="15" viewBox="0 0 36 36"><path d="M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z" fill="var(--gestalt-pink)" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" /></svg>
            {item.hearts}
          </span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 20, background: "var(--gestalt-pink-lt)", color: "var(--gestalt-ink)", border: "1px solid var(--gestalt-border-soft)" }}>
            <svg width="9" height="9" viewBox="0 0 24 24"><path d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z" fill="var(--gestalt-pink)" /></svg>
            lvl {item.level}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ════ UA — gilt salon (submitted to the Salon; always-light) ════ */
function UaCard({ item }) {
  return (
    <article style={{ marginBottom: 18, padding: 6, background: "var(--ua-gilt)", boxShadow: "0 10px 24px rgba(60,40,10,.26), inset 0 0 0 1px rgba(255,255,255,.45)", fontFamily: "'EB Garamond', Georgia, serif" }}>
      <div style={{ padding: 3, background: "linear-gradient(135deg,var(--ua-gold),var(--ua-gold-pale))" }}>
        <div style={{ border: "1px solid rgba(60,40,10,.45)", background: "var(--ua-paper)", padding: "14px 17px 13px", color: "var(--ua-ink)", backgroundImage: "radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)", backgroundSize: "5px 5px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: 8.5, letterSpacing: ".13em", color: "var(--ua-orange)" }}>University of Asthmatics</span>
            <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 11, color: "var(--ua-sub)" }}>{item.time}</span>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg,var(--ua-gold),transparent)", margin: "9px 0 11px" }} />
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Monogram initial={item.initial} size={40} font="var(--font-faction-gilt)" fontSize={18} style={{ borderRadius: "50%", background: "linear-gradient(135deg,#d8a24a,#9c6a1a)", filter: "sepia(.3)", border: "2px solid #c9962f", boxShadow: "0 0 0 1px #a9781f, 0 0 0 3px #f0e2c0", color: "#fce4c4", fontStyle: "italic", fontWeight: 400 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", fontWeight: 600, fontSize: 20, color: "var(--ua-ink)", lineHeight: 1 }}>{item.actor}</span>
                <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 12, color: "var(--ua-sub)" }}>{item.action}</span>
              </div>
              <div style={{ fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", fontSize: 17, color: "var(--ua-ink)", marginTop: 6 }}>{item.work}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid var(--ua-line-soft)", marginTop: 12, paddingTop: 10 }}>
            <span style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: 8, letterSpacing: ".07em", color: "#fce4c4", background: "var(--ua-orange)", padding: "3px 8px" }}>Critique · {item.critique}</span>
            <span style={{ fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", fontWeight: 700, fontSize: 17, color: "var(--ua-orange)", marginLeft: "auto" }}>{item.points}<span style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: 8, marginLeft: 3, color: "var(--ua-sub)" }}>pts</span></span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ════ S.N.I.D.E. — ransom dispatch slip (accepted an assignment) ════ */
const RANSOM_WORD = [
  { bg: "var(--snide-paper)", col: "var(--snide-ink)", font: "var(--font-faction-anton)", rot: -4 },
  { bg: "var(--snide-acid)", col: "var(--snide-ink)", font: "var(--font-faction-black)", rot: 3 },
  { bg: "var(--snide-pink)", col: "#fff", font: "var(--font-faction-anton)", rot: -3 },
];
function SnideCard({ item }) {
  return (
    <article style={{
      position: "relative", background: "var(--snide-ink)", color: "#fff", padding: "26px 18px 18px",
      marginBottom: 24, overflow: "hidden", boxShadow: "6px 8px 0 rgba(0,0,0,.28)",
      transform: "rotate(-.6deg)", fontFamily: "var(--font-body)",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(182,255,46,.08) 32%, transparent 34%)", backgroundSize: "5px 5px" }} />
      <div style={{ position: "absolute", top: -10, left: 28, width: 56, height: 22, background: "var(--snide-tape)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)", transform: "rotate(-8deg)" }} />
      <div style={{ position: "absolute", top: -8, right: 22, width: 56, height: 22, background: "var(--snide-tape)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)", transform: "rotate(7deg)" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "2px solid var(--snide-acid)", paddingBottom: 6, marginBottom: 11 }}>
        <span style={{ fontFamily: "var(--font-accent)", fontSize: 15, letterSpacing: ".22em", color: "var(--snide-acid)" }}>S.N.I.D.E.</span>
        <span style={{ fontSize: 7.5, letterSpacing: ".16em", color: "#8f9183", textTransform: "uppercase" }}>dispatch {item.dispatch} · {item.time}</span>
      </div>
      <div style={{ position: "relative", display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Monogram initial={item.initial} size={36} font="var(--font-faction-anton)" fontSize={18} style={{ background: "linear-gradient(135deg,#6b6d60,#2a2a22)", filter: "grayscale(1) contrast(1.4)", border: "1.5px solid var(--snide-acid)", color: "#e7e4d8", fontWeight: 400 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-faction-anton)", fontSize: 16, letterSpacing: ".04em", textTransform: "uppercase", color: "#f4f1e8", lineHeight: 1 }}>{item.actor}</span>
          <div style={{ fontFamily: "var(--font-faction-marker)", fontSize: 13, color: "var(--snide-pink)", transform: "rotate(-1.5deg)", marginTop: 2 }}>{item.action}</div>
        </div>
      </div>
      <div style={{ position: "relative", display: "inline-flex", flexWrap: "wrap", gap: "5px 4px", alignItems: "center", marginBottom: 14 }}>
        {item.ransomWords.map((w, i) => {
          const s = RANSOM_WORD[i % RANSOM_WORD.length];
          return <span key={i} style={{ display: "inline-block", background: s.bg, color: s.col, fontFamily: s.font, fontSize: 24, lineHeight: .92, padding: "2px 7px 0", transform: `rotate(${s.rot}deg)`, boxShadow: "1.5px 2.5px 0 rgba(0,0,0,.4)", textTransform: "uppercase" }}>{w}</span>;
        })}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", fontFamily: "var(--font-faction-anton)", color: "var(--snide-acid)", lineHeight: .8 }}>
          <span style={{ fontSize: 32 }}>+{item.points}</span>
          <span style={{ fontSize: 9, letterSpacing: ".1em", marginLeft: 3 }}>PTS</span>
          <svg viewBox="0 0 120 60" style={{ position: "absolute", inset: "-11px -10px", width: "calc(100% + 20px)", height: "calc(100% + 22px)" }}><ellipse cx="60" cy="30" rx="54" ry="23" fill="none" stroke="var(--snide-pink)" strokeWidth="2.5" /></svg>
        </div>
        <span style={{ fontFamily: "var(--font-accent)", fontSize: 12, letterSpacing: ".1em", border: "1.5px dashed #6b6d60", color: "#cfd1c4", padding: "3px 8px", transform: "rotate(2deg)" }}>LVL {item.level}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-faction-typewriter)", fontSize: 8.5, color: "#8f9183", maxWidth: 120, textAlign: "right", lineHeight: 1.4 }}>{item.motto}</span>
      </div>
    </article>
  );
}

/* ════ THE EPHEMERISTS — the discordant map (sealed a praxis) ════ */
function EphemeristsCard({ item }) {
  return (
    <article style={{
      position: "relative", background: "var(--eph-vellum)", color: "var(--eph-vellum-text)",
      border: "1.5px solid var(--eph-ink)", borderLeft: "3px solid var(--eph-gold)", marginBottom: 18,
      overflow: "hidden", fontFamily: "var(--font-faction-codex)",
    }}>
      <div style={{ padding: "12px 16px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--eph-gold)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--eph-gold)" strokeWidth="1.4"><ellipse cx="12" cy="12" rx="11" ry="4.4" transform="rotate(-24 12 12)" /><path d="M4 12 C7.5 8.2 16.5 8.2 20 12 C16.5 15.8 7.5 15.8 4 12 Z" /><circle cx="12" cy="12" r="2.7" /></svg>
          <span style={{ fontFamily: "var(--font-faction-engraved)", fontWeight: 600, fontSize: 8.5, letterSpacing: ".22em" }}>THE EPHEMERISTS</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-faction-codex-script)", fontStyle: "italic", fontSize: 10, color: "var(--eph-muted)" }}>exhibit · {item.time}</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 10 }}>
          <Monogram initial={item.initial} size={38} font="var(--font-faction-engraved)" fontSize={16} style={{ borderRadius: "50%", background: "linear-gradient(135deg,#c8a55e,#8a6622)", filter: "sepia(.5)", border: "2px solid #b0863a", boxShadow: "0 0 0 1px #2a1d12", color: "#f1e8cf", fontWeight: 400 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-faction-engraved)", fontSize: 14, letterSpacing: ".04em", color: "var(--eph-vellum-text)", lineHeight: 1 }}>{item.actor}</span>
              <span style={{ fontFamily: "var(--font-faction-codex)", fontStyle: "italic", fontSize: 11, color: "var(--eph-muted)" }}>{item.action}</span>
            </div>
            <div style={{ position: "relative", height: 58, marginTop: 8, border: "1px solid var(--eph-gold-deep)", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, opacity: .5, backgroundImage: "repeating-linear-gradient(0deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 12px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 12px)" }} />
              <svg viewBox="0 0 260 58" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .7 }}><g stroke="var(--eph-lapis)" strokeWidth="0.8" fill="none"><line x1="0" y1="58" x2="150" y2="6" /><line x1="40" y1="58" x2="160" y2="6" /><line x1="80" y1="58" x2="170" y2="6" /><line x1="130" y1="58" x2="180" y2="6" /><line x1="190" y1="58" x2="195" y2="6" /></g></svg>
              <svg viewBox="0 0 260 58" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .72 }}><g stroke="var(--eph-rubric)" strokeWidth="0.7" fill="none"><circle cx="168" cy="30" r="14" /><circle cx="168" cy="30" r="26" /><line x1="168" y1="30" x2="200" y2="14" /><line x1="168" y1="30" x2="140" y2="46" /></g></svg>
              <div style={{ position: "absolute", left: "64%", top: "50%", transform: "translate(-50%,-50%)", width: 8, height: 8, borderRadius: "50%", background: "var(--eph-gold-light)", boxShadow: "0 0 9px 3px color-mix(in srgb, var(--eph-gold-light) 70%, transparent)" }} />
            </div>
            <div style={{ fontFamily: "var(--font-faction-engraved)", fontWeight: 700, fontSize: 17, lineHeight: 1, color: "var(--eph-vellum-text)", marginTop: 9 }}>{item.title} <span style={{ color: "var(--eph-lapis)" }}>{item.titleAccent}</span><sup style={{ fontFamily: "var(--font-faction-codex)", fontSize: 9, color: "var(--eph-lapis)", fontWeight: 400 }}>†</sup></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 8, marginTop: 7 }}>
              <span style={{ color: "var(--eph-vellum-text)" }}>▦ grade {item.grade}</span>
              <span style={{ color: "var(--eph-gold-deep)" }}>·</span>
              <span style={{ fontFamily: "var(--font-faction-engraved)", fontWeight: 700, fontSize: 13, color: "var(--eph-rubric)" }}>{item.pvncta} pvncta</span>
              <span style={{ marginLeft: "auto", fontStyle: "italic", color: "var(--eph-muted)", fontSize: 8 }}>{item.motto}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ════ ALBESCENT — vellum correspondence (bore witness; always-light) ════ */
function AlbescentCard({ item }) {
  return (
    <article style={{ background: "var(--al-surface)", border: "1px solid var(--al-border)", boxShadow: "var(--al-shadow)", padding: "22px 20px 18px", marginBottom: 18, fontFamily: "var(--font-faction-vellum)", color: "var(--al-text)", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.6" stroke="var(--al-text)" strokeWidth="0.44" opacity="0.18" /><circle cx="10" cy="10" r="4.7" stroke="var(--al-text)" strokeWidth="0.76" opacity="0.5" /><line x1="10" y1="4.8" x2="10" y2="2.2" stroke="var(--al-text)" strokeWidth="0.76" /><line x1="10" y1="15.2" x2="10" y2="17.8" stroke="var(--al-text)" strokeWidth="0.76" /><line x1="4.8" y1="10" x2="2.2" y2="10" stroke="var(--al-text)" strokeWidth="0.76" /><line x1="15.2" y1="10" x2="17.8" y2="10" stroke="var(--al-text)" strokeWidth="0.76" /><circle cx="10" cy="10" r="0.88" fill="var(--al-text)" /></svg>
      </div>
      <div style={{ height: 1, background: "var(--al-border-faint)", marginBottom: 13 }} />
      <div style={{ fontFamily: "var(--font-body)", fontSize: 6, letterSpacing: ".32em", textTransform: "uppercase", color: "var(--al-text-muted)", marginBottom: 11 }}>Albescent</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 11, marginBottom: 10 }}>
        <Monogram initial={item.initial} size={34} font="var(--font-faction-vellum)" fontSize={15} style={{ borderRadius: "50%", background: "linear-gradient(135deg,#d8d6d2,#a8a6a2)", filter: "grayscale(1) brightness(1.05)", fontStyle: "italic", fontWeight: 400 }} />
        <div style={{ textAlign: "left" }}>
          <div style={{ fontFamily: "var(--font-faction-vellum)", fontSize: 16, color: "var(--al-text)", lineHeight: 1 }}>{item.actor}</div>
          <div style={{ fontFamily: "var(--font-faction-vellum)", fontStyle: "italic", fontSize: 12, color: "var(--al-text-muted)" }}>{item.action}</div>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-faction-vellum)", fontStyle: "italic", fontSize: 16, lineHeight: 1.5, color: "var(--al-ink)", maxWidth: 330, margin: "0 auto 13px" }}>{item.quote}</div>
      <div style={{ height: 1, background: "var(--al-border-faint)", marginBottom: 10 }} />
      <div style={{ fontFamily: "var(--font-body)", fontSize: 6.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--al-text-muted)" }}>No points logged · {item.time}</div>
    </article>
  );
}
