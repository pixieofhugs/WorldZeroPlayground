import i18n from "../../i18n";
import { UaSigil } from "./UaSigil";
import { WowSigil } from "./WowSigil";
import { SnideSigil } from "../snide/snideAtoms";
import { EphemeristsSigil } from "./ephemeristsAtoms";
import { SingularitySigil } from "./SingularitySigil";
import { EverymenSigil } from "./EverymenSigil";
import AlbescentSigil from "./AlbescentSigil";

/**
 * FactionSelectCard — the faction-DIRECTORY tile, one per faction. The compact
 * card a player meets when browsing "Choose your faction": each renders in its
 * faction's full archetype (gilt placard, whimsy.exe window, ransom dispatch,
 * codex leaf, terminal printout, union poster, vellum letter) at a UNIFORM
 * 360×300 ceiling so the desktop grid stays tidy. The box is FLUID, not fixed:
 * `width: 100%` up to a 360 max, `minHeight` rather than a hard height, so the
 * same art survives a 375px phone in the single-column mobile directory (#732).
 * Desktop is unchanged — DesktopFactions' flexWrap grid still hands each 360px.
 *
 * Ported from the Claude Design select.card. Faction-agnostic payload is just
 * { state, members?, onVisit }; name / archetype / blurb / status copy / CTA
 * are component-owned, derived from the faction slug. Joining is NOT on the
 * tile — the CTA visits the faction's detail page, which owns the Join block.
 *
 * Mirrors FactionCard.tsx's structure: dispatcher + per-faction archetypes. The
 * per-faction sigils are the shared canonical *Sigil components (one dedicated
 * file each), imported here — never re-drawn inline.
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

// ─── Per-faction archetypes ───────────────────────────────────────────────────

function UaSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ua.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--ua-paper)", color: "var(--ua-ink)", fontFamily: "var(--font-body)",
      border: "1px solid var(--ua-line)", boxShadow: "0 6px 24px rgba(61,36,16,0.12)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 6, border: "2px solid var(--ua-gold)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 9, border: "1px solid var(--ua-line-soft)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: "var(--text-base)", letterSpacing: "0.32em", color: "var(--ua-gold)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.ua.masthead")}</div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: gilt-placard wordmark — display type at 0.9 leading, the UA archetype's voice */}
            <div style={{ fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", fontWeight: 800, fontSize: 52, lineHeight: 0.9, letterSpacing: "0.01em", marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.wordmark")}</div>
            <div style={{ fontFamily: "var(--font-faction-engraved-caps)", fontSize: "var(--text-lg)", letterSpacing: "0.24em", color: "var(--ua-sub)", textTransform: "uppercase", marginTop: "var(--space-xs)" }}>{i18n.t("feed:factionSelect.ua.subtitle")}</div>
          </div>
          <UaSigil width={44} height={53} />
        </div>
        <div style={{ height: 2, background: "var(--ua-gilt)", margin: "var(--space-lg) 0 var(--space-md)", opacity: 0.85 }} />
        <p className="content-text" style={{ margin: 0, fontFamily: "var(--font-faction-gilt)", fontStyle: "italic", lineHeight: 1.4, color: "var(--ua-ink)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-xl) var(--space-lg)" }}>
        <div style={{ fontSize: "var(--text-base)", letterSpacing: "0.04em", color: "var(--ua-sub)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · <span style={{ color: "var(--ua-muted)" }}>{i18n.t("feed:factionSelect.ua.members", { count: members })}</span></>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--ua-gold)", background: "transparent",
          color: "var(--ua-orange)", fontFamily: "var(--font-faction-engraved-caps)", fontSize: "var(--text-xl)", letterSpacing: "0.18em",
          textTransform: "uppercase", padding: "var(--space-md)", transition: "background 140ms, color 140ms",
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
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--gestalt-card-bg)", color: "var(--gestalt-ink)", fontFamily: "var(--font-body)",
      border: "1.5px solid var(--gestalt-win-border)", borderRadius: 10,
      boxShadow: "0 10px 30px var(--gestalt-glow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-sm) var(--space-md)",
        background: "linear-gradient(var(--gestalt-title-from), var(--gestalt-title-to))",
        borderBottom: "1.5px solid var(--gestalt-win-border)" }}>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: gutter between the 11px window traffic-light dots; in register with that raw geometry. */}
        <span style={{ display: "flex", gap: 6 }}>
          {["#f6c75e", "#7fc59e", "#ec5f99"].map((color) => <i key={color} style={{ width: 11, height: 11, borderRadius: "50%", background: color, border: "1px solid rgba(0,0,0,0.15)" }} />)}
        </span>
        <span style={{ fontSize: "var(--text-lg)", color: "var(--gestalt-title-text)", letterSpacing: "0.02em" }}>{i18n.t("feed:identity.wow.windowTitle")}</span>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ▢ ✕ are drawn window-chrome glyphs used as icons, not text */}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gestalt-title-text)", opacity: 0.7 }}>▢ ✕</span>
      </div>
      <div style={{ flex: 1, padding: "var(--space-lg) var(--space-xl) 0", position: "relative" }}>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: hand-script faction name, the whimsy.exe window's display type */}
        <div style={{ fontFamily: "var(--font-faction-script)", fontWeight: 700, fontSize: 27, lineHeight: 1.1, color: "var(--gestalt-ink)", whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-block", verticalAlign: "-3px", marginRight: "var(--space-sm)" }}><WowSigil size={18} color="var(--faction-wow)" /></span>{i18n.t("feed:factionSelect.wow.name")}
        </div>
        <p className="content-text" style={{ margin: "var(--space-md) 0 0", lineHeight: 1.6, color: "var(--gestalt-ink-soft)" }}>
          {i18n.t("feed:factionSelect.wow.blurb")}
        </p>
      </div>
      <div style={{ padding: "0 var(--space-xl) var(--space-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: inset of the rotated status sticker; rounding reflows the sticker. */}
          <div style={{ transform: "rotate(-1.5deg)", background: "var(--gestalt-pink-lt)", color: "var(--gestalt-ink)", fontSize: "var(--text-md)", padding: "5px 10px", borderRadius: 4 }}>{status}</div>
          {members != null && <div style={{ flexShrink: 0, fontSize: "var(--text-sm)", letterSpacing: "0.04em", color: "var(--gestalt-label)" }}>{i18n.t("feed:factionSelect.wow.members", { count: members })}</div>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer",
          border: "1.5px solid var(--gestalt-pink)", borderRadius: 7, background: "var(--gestalt-pink)", color: "#fff",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: CTA is set in the faction's hand-script at display size; a label token would flatten the archetype (§270)
          fontFamily: "var(--font-faction-script)", fontWeight: 700, fontSize: 21, padding: "var(--space-sm) var(--space-lg)",
        }}>{i18n.t("feed:factionSelect.wow.cta")}</button>
      </div>
    </div>
  );
}

function SnideSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.snide.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--snide-ink)", color: "var(--snide-paper)", fontFamily: "var(--font-faction-typewriter)",
      border: "1px solid #000", boxShadow: "0 8px 26px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%",
        background: "radial-gradient(circle, var(--snide-acid) 0%, transparent 62%)", opacity: 0.22, filter: "blur(2px)" }} />
      <div style={{ position: "absolute", top: 14, left: 22, width: 74, height: 20, background: "var(--snide-tape)", transform: "rotate(-6deg)", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <SnideSigil size={40} color="var(--snide-acid)" />
          <div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ransom-dispatch wordmark — Anton slammed at 0.85 leading */}
            <div style={{ fontFamily: "var(--font-faction-anton)", fontSize: 34, lineHeight: 0.85, color: "var(--snide-paper)", letterSpacing: "0.02em" }}>{i18n.t("feed:identity.snide.wordmark")}</div>
            <div style={{ fontSize: "var(--text-base)", letterSpacing: "0.14em", color: "var(--snide-acid)", marginTop: "var(--space-xs)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.snide.masthead")}</div>
          </div>
        </div>
        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.25)", margin: "var(--space-lg) 0 var(--space-md)" }} />
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

function EphemeristsSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ephemerists.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--eph-field)", color: "var(--eph-parchment)", fontFamily: "var(--font-faction-codex)",
      border: "1px solid var(--eph-gold-deep)", boxShadow: "0 8px 26px rgba(20,59,84,0.4)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 9, border: "1px solid rgba(180,150,80,0.35)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 16, right: 18, fontSize: "var(--text-sm)", letterSpacing: "0.1em", color: "var(--eph-gold-light)", opacity: 0.7, textAlign: "right", lineHeight: 1.5 }}>{i18n.t("feed:factionSelect.ephemerists.coords")}<br />{i18n.t("feed:factionSelect.ephemerists.coordsPolar")}</div>
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <span style={{ width: 46, height: 46, borderRadius: "50%", border: "1.5px solid var(--eph-gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <EphemeristsSigil size={26} color="var(--eph-gold-light)" stroke={1.4} />
          </span>
          <div>
            <div style={{ fontSize: "var(--text-sm)", letterSpacing: "0.24em", color: "var(--eph-gold-light)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.ephemerists.eyebrow")}</div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: codex-leaf wordmark — engraved caps with a hard letterpress shadow */}
            <div style={{ fontFamily: "var(--font-faction-engraved)", fontWeight: 800, fontSize: 26, lineHeight: 1, letterSpacing: "0.03em", color: "var(--eph-parchment)", marginTop: "var(--space-xs)", textShadow: "1px 1px 0 var(--eph-field-deep)" }}>{i18n.t("feed:identity.ephemerists.wordmark")}</div>
          </div>
        </div>
        <div style={{ height: 1.5, background: "linear-gradient(90deg, var(--eph-gold) 0%, transparent 100%)", margin: "var(--space-lg) 0 var(--space-md)" }} />
        <p className="content-text" style={{ margin: 0, fontFamily: "var(--font-faction-codex-script)", fontStyle: "italic", lineHeight: 1.45, color: "var(--eph-parchment)" }}>
          {i18n.t("feed:factionSelect.ephemerists.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-xl) var(--space-lg)" }}>
        <div style={{ fontSize: "var(--text-md)", letterSpacing: "0.03em", color: "var(--eph-gold-light)", marginBottom: "var(--space-md)" }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.ephemerists.members", { count: members })}`}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--eph-gold)", background: "transparent", color: "var(--eph-gold-light)",
          fontFamily: "var(--font-faction-engraved)", fontWeight: 600, fontSize: "var(--text-xl)", letterSpacing: "0.16em", padding: "var(--space-md)", textTransform: "uppercase",
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
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "#050f08", color: green, fontFamily: "var(--font-faction-terminal)",
      border: "1px solid #2563eb", boxShadow: "0 8px 26px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(rgba(74,222,128,0.05) 0 1px, transparent 1px 3px)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid rgba(96,165,250,0.4)" }}>
        {Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 1, background: "rgba(96,165,250,0.5)" }} />)}
      </div>
      <div style={{ position: "relative", flex: 1, padding: "var(--space-lg) var(--space-lg) 0" }}>
        <div style={{ fontSize: "var(--text-md)", letterSpacing: "0.14em", color: "#60a5fa", textTransform: "uppercase" }}>
          {i18n.t("feed:identity.singularity.protocol")}<span style={{ display: "inline-block", width: 6, height: 11, background: green, marginLeft: "var(--space-xs)", verticalAlign: "middle", animation: "wz-blink 1s step-end infinite" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          <SingularitySigil size={30} color={green} />
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: terminal-printout faction name — display-size mono, the archetype's banner */}
          <span style={{ fontSize: 30, color: green, letterSpacing: "0.02em" }}>{i18n.t("feed:factionSelect.singularity.name")}</span>
        </div>
        <p className="content-text" style={{ margin: "var(--space-lg) 0 0", lineHeight: 1.65, color: "#8fe6ac" }}>
          &gt; {i18n.t("feed:factionSelect.singularity.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-lg) var(--space-lg)" }}>
        <div style={{ fontSize: "var(--text-md)", color: "#60a5fa", marginBottom: "var(--space-md)" }}>{status}{members != null && <span style={{ float: "right", color: green }}>{i18n.t("feed:factionSelect.singularity.members", { count: members })}</span>}</div>
        <button onClick={onVisit} style={{
          display: "flex", alignItems: "center", width: "100%", cursor: "pointer", gap: "var(--space-sm)",
          border: "1px solid #2563eb", background: "rgba(37,99,235,0.14)", color: green,
          fontFamily: "var(--font-faction-terminal)", fontSize: "var(--text-xl)", letterSpacing: "0.06em", padding: "var(--space-sm) var(--space-md)",
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
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--everymen-field)", color: "var(--everymen-cream)", fontFamily: "var(--font-body)",
      border: "3px solid var(--everymen-ink)", boxShadow: "0 0 0 3px var(--everymen-paper), 0 8px 26px rgba(0,0,0,0.28)",
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

function AlbescentSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.albescent.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--al-surface)", color: "var(--al-text)", fontFamily: "var(--font-faction-vellum)",
      border: "1px solid var(--al-border)", boxShadow: "var(--al-shadow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 12, border: "1px solid var(--al-border-faint)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-2xl) 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", letterSpacing: "0.34em", color: "var(--al-text-muted)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.albescent.eyebrow")}</div>
          <AlbescentSigil size={26} color="var(--al-ink)" />
        </div>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: vellum-letter name — the archetype's calligraphic display type */}
        <div style={{ fontFamily: "var(--font-faction-vellum)", fontStyle: "italic", fontWeight: 600, fontSize: 40, lineHeight: 1, letterSpacing: "0.01em", marginTop: "var(--space-lg)" }}>{i18n.t("feed:factionSelect.albescent.name")}</div>
        <div style={{ width: 44, height: 1, background: "var(--al-text)", opacity: 0.5, margin: "var(--space-md) 0" }} />
        <p className="content-text" style={{ margin: 0, fontStyle: "italic", lineHeight: 1.45, color: "var(--al-ink)" }}>
          {i18n.t("feed:factionSelect.albescent.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-2xl) var(--space-xl)" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", letterSpacing: "0.06em", color: "var(--al-text-muted)", marginBottom: "var(--space-md)", textTransform: "uppercase" }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.albescent.members", { count: members })}`}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--al-text)", background: "transparent", color: "var(--al-text)",
          fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.22em", padding: "var(--space-md)", textTransform: "uppercase", transition: "background 140ms, color 140ms",
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
  ua: UaSelectCard,
  wow: WOWSelectCard,
  snide: SnideSelectCard,
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
  const Card = BY_FACTION[key] ?? UaSelectCard;
  return <Card {...rest} />;
}
