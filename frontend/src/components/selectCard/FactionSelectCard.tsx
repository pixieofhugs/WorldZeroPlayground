import i18n from "../../i18n";
// Each select card is drawn in its faction's own display face, all six from the
// lazily-fetched faction sheet (#2079). `pages/Factions.tsx` imports this
// component directly rather than through `surfaceMap`, so the directory renders
// every card with no archetype dispatch to ask for the sheet.
import "../../factionFaces";
import { pickVariant } from "../../utils/factionDispatch";
import { factionName } from "../../utils/factions";
import { hasOwnKey } from "../../utils/hasOwnKey";
import { surfaceMap } from "../../factions";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, uaShade } from "../factionMarks/uaAtoms";
import * as coven from "../factionMarks/covenSlip";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import * as eph from "../factionMarks/ephemeristsPlate";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { EverymenSigil } from "../sigil/EverymenSigil";
import { WowSigil } from "../sigil/WowSigil";
import FactionSigil from "../sigil/FactionSigil";
import DefaultSelectCard from "./DefaultSelectCard";

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

/**
 * FactionSelectCard — the faction-DIRECTORY tile, one per faction. The compact
 * card a player meets when browsing "Choose your faction": each renders in its
 * faction's full archetype (gilt placard, candlelit spell slip, ransom dispatch,
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
 * Dispatcher + per-faction archetypes. (It used to say it mirrored
 * `factionCard/FactionCard.tsx`; #2024 retired that surface — it had never had
 * a production mount, because #422 gave the directory THIS card on both form
 * factors — so this is the shape rather than a copy of one.) The
 * per-faction sigils are the shared canonical *Sigil components (one dedicated
 * file each), imported here — never re-drawn inline.
 *
 * The neutral tile lives in its own file, `DefaultSelectCard.tsx`, next to the
 * rest of the na kit (`DefaultTaskCard`, `DefaultSigil`): it is the archetype
 * for the UNAFFILIATED state, and it is what the dispatcher falls back to.
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

/**
 * UA join card — a quiet invitation, not a sales pitch (kit §4, #851).
 *
 * The crest band carries the ensō over the mandala at TEXTURE strength — one of
 * the three surfaces the pattern is allowed on (brief §5). Everything below is
 * centred, sentence-case and hairline-ruled. The gilt double border, the gold
 * rule and the ghost-outline CTA went with the salon.
 */
export function UaSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ua.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "linear-gradient(160deg, var(--faction-ua-lift), var(--faction-ua-card-bg) 60%)",
      color: "var(--faction-ua-card-text)", fontFamily: UA_TEXT,
      border: "1px solid var(--faction-ua-rule)", borderRadius: "var(--radius-md)",
      boxShadow: `0 12px 34px -20px ${uaShade(55)}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* crest band — the mark over the pattern */}
      <div style={{
        position: "relative", height: 132, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--faction-ua-panel)", borderBottom: "1px solid var(--faction-ua-hair)", overflow: "hidden",
      }}>
        <UaMandala
          size={300}
          strength="texture"
          opacity={0.16}
          rings={4}
          petalsPerRing={14}
          style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)" }}
        />
        <span style={{ position: "relative" }}><UaSigil width={96} height={96} /></span>
      </div>

      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ ...UA_EYEBROW, letterSpacing: "0.24em" }}>{i18n.t("feed:factionSelect.ua.masthead")}</div>
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-display)", lineHeight: 1, letterSpacing: "-0.01em", marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.wordmark")}</div>
        {/* #850 made the subtitle a full sentence. A sentence cannot be set in
            0.24em all-caps, so it takes the display cut here rather than the
            kicker treatment it inherited. */}
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.1, marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.subtitle")}</div>
        <p className="content-text" style={{ margin: "var(--space-md) 0 0", fontFamily: UA_TEXT, lineHeight: 1.55, color: "var(--faction-ua-card-body)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontFamily: UA_TEXT, fontSize: "var(--text-content)", color: "var(--faction-ua-card-muted)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · <span>{i18n.t("feed:factionSelect.ua.members", { count: members })}</span></>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "none", borderRadius: "var(--radius-sm)",
          background: "var(--faction-ua)", color: "var(--faction-ua-on-fill)",
          fontFamily: UA_TEXT, fontSize: "var(--text-xl)", letterSpacing: "0.14em",
          textTransform: "uppercase", padding: "var(--space-md)", transition: "background 140ms",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--faction-ua-card-accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--faction-ua)"; }}
        >{i18n.t("feed:factionSelect.ua.cta")}</button>
      </div>
    </div>
  );
}

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
export function COVENSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
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

/**
 * The Ephemerists tile — the cornice masthead the plate hangs under, standing on
 * its own (#1208). The night band, the sigil ruled in brass, and the CTA in the
 * plate’s gold. Nothing legible is
 * set in `brass`; on this ground the inks are `band-ink` (12.4:1), `gold` (9.4)
 * and `band-quiet` (8.6).
 */
export function EphemeristsSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
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

/**
 * The Singularity tile's palette (#1609).
 *
 * This tile was the last select card still painting itself in hexes — a
 * `const green = "#4ade80"` plus `#050f08`, `#2563eb`, `#8fe6ac` and `#60a5fa`
 * — while the S.N.I.D.E. tile that then stood directly above it already read
 * `var(--snide-*)` throughout. (That tile left for its own file in #2322, and
 * moved off those bare names onto `--faction-snide-note-*` while it went.) The
 * module constant is why a colour grep found the tile clean:
 * `green` reaches four style objects and two hover handlers as an Identifier,
 * which the colour rule's `someStringIn` walk cannot see (§4a, "a module
 * constant is Gap D's indirection wearing paint").
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

export function SingularitySelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.singularity.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: TERM_VOID, color: TERM_GREEN, fontFamily: "var(--font-faction-terminal)",
      border: `1px solid ${TERM_BLUE}`, boxShadow: `0 8px 26px ${CAST}`, display: "flex", flexDirection: "column",
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

export function EverymenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
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

/**
 * WOW pledge card — the Court's recruiting placard (kit §13, #900).
 *
 * A gilt-framed cream card under a checker rail of gold and plum: the crest, the
 * name in MedievalSharp, the Pig-Latin tagline in Lora italic, three tag chips,
 * and the gilt lozenge CTA.
 *
 * THE `CHOSEN` BANNER + GOLD RING are bound to `state === "member"`, not to a
 * click. The kit's card owns a local `selDone` toggle and flips itself when you
 * press Pledge; on this tile joining is not available at all — the CTA VISITS
 * the faction page, which owns the Join block and its eligibility flags. So the
 * selected dress renders when the viewer already IS one, which is the same
 * information the kit's toggle was standing in for.
 *
 * NO MUSTER FIGURES. The kit's three-up tally (Knights / in Rainbow / Modifier)
 * has no data behind it here — `members` is the only count the tile is handed,
 * and the other two are mock. The member count keeps its social-proof slot on
 * the status line, where every other tile in this file puts it.
 */
export function WOWSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.wow.status.${state}` as const);
  const chosen = state === "member";
  const tags = i18n.t("feed:factionSelect.wow.tags", { returnObjects: true }) as string[];
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--faction-wow-card-bg)", color: "var(--faction-wow-card-text)", fontFamily: "var(--faction-wow-body-font)",
      border: "2px solid var(--faction-wow-chronicle-border)", borderRadius: "var(--radius-xl)",
      boxShadow: chosen
        ? "0 0 0 3px var(--faction-wow-chronicle-gold), 0 20px 46px -22px var(--faction-wow-chronicle-shadow)"
        : "0 20px 46px -22px var(--faction-wow-chronicle-shadow)",
      display: "flex", flexDirection: "column",
    }}>
      {chosen && (
        <div style={{
          position: "absolute", zIndex: 2, top: 14, right: -32, transform: "rotate(38deg)",
          background: "var(--faction-wow-plum-surface)", color: "var(--faction-wow-on-plum)",
          fontFamily: "var(--faction-wow-card-font)", letterSpacing: "0.1em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the CHOSEN sash is a drawn banner; its lettering is struck to the ribbon, and its inset IS the ribbon's width (rounding reflows the sash off the corner).
          fontSize: 11, padding: "3px 36px",
          boxShadow: "0 2px 5px var(--faction-wow-stamp-shadow)",
        }}>{i18n.t("feed:factionSelect.wow.chosen")}</div>
      )}
      {/* the gilt checker rail */}
      <div aria-hidden="true" style={{
        height: 9,
        background: "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-plum-surface) 11px 22px)",
      }} />
      <div style={{ flex: 1, padding: "var(--space-xl) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)", filter: "drop-shadow(0 5px 6px var(--faction-wow-stamp-shadow))" }}>
          {/* above the 56px motto floor, so the seal keeps its Pig-Latin band */}
          <WowSigil size={88} />
        </div>
        <div style={{ fontFamily: "var(--faction-wow-card-font)", fontSize: "var(--text-title)", lineHeight: 1.1, color: "var(--faction-wow-card-text)" }}>
          {i18n.t("feed:factionSelect.wow.name")}
        </div>
        <p className="content-text" style={{ fontStyle: "italic", color: "var(--faction-wow-card-accent)", margin: "var(--space-xs) 0 var(--space-md)", lineHeight: 1.4 }}>
          {i18n.t("feed:factionSelect.wow.tagline")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "var(--space-xs)" }}>
          {tags.map((tag) => (
            <span key={tag} style={{
              fontSize: "var(--text-md)", color: "var(--faction-wow-card-accent)",
              background: "var(--faction-wow-chip-bg)", border: "1px solid var(--faction-wow-chip-border)",
              borderRadius: 20, padding: "var(--space-xs) var(--space-md)",
            }}>{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: "var(--space-lg) var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontSize: "var(--text-content)", color: "var(--faction-wow-card-muted)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · {i18n.t("feed:factionSelect.wow.members", { count: members })}</>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer",
          fontFamily: "var(--faction-wow-card-font)", letterSpacing: "0.05em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the CTA is struck on a gilt lozenge in MedievalSharp; a label token would flatten the placard into house chrome (§270)
          fontSize: 16,
          color: "var(--faction-wow-avatar-pill-text)",
          background: "linear-gradient(180deg, var(--faction-wow-avatar-pill-from) 0%, var(--faction-wow-gilt-mid) 45%, var(--faction-wow-avatar-pill-to) 100%)",
          border: "2px solid var(--faction-wow-gilt-border)", borderRadius: "var(--radius-md)",
          padding: "var(--space-md) var(--space-lg)",
        }}>{i18n.t("feed:factionSelect.wow.cta")}</button>
      </div>
    </div>
  );
}

/**
 * Albescent — the one tile that still wears the society's own face (#783).
 *
 * Albescent has no theme any more: it renders Default everywhere a player is
 * seen, so a member is indistinguishable from an unaffiliated one. This card is
 * the exception for the same reason the invitation letter is — it is a REVEAL
 * surface. `/factions` omits Albescent server-side until an account has been
 * revealed to it (ADR-0027, #390, routers/factions.py), so anyone who can see
 * this tile at all already knows the society exists. It reads
 * `--albescent-reveal-*`, never `factionCssVar('albescent', …)`, which resolves
 * to the neutral default.
 *
 * Deleting this component is now safe for the hiding, which it was not before
 * #796: the dispatcher below used to fall back to UA's costume, so an Albescent
 * tile without this card went UA orange rather than quiet. It falls back to
 * `DefaultSelectCard` instead, and per #783/#794 Albescent resolves to the
 * default/na path anyway — so an unregistered Albescent would get the na
 * rainbow, which is exactly "hiding by looking unaffiliated". No branch here
 * says so; the value test in `resolveCssKey` does.
 */
export function AlbescentSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.albescent.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--albescent-reveal-surface)", color: "var(--albescent-reveal-text)", fontFamily: "var(--font-faction-vellum)",
      border: "1px solid var(--albescent-reveal-border)", boxShadow: "var(--albescent-reveal-shadow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 12, border: "1px solid var(--albescent-reveal-border-faint)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-2xl) 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.34em", color: "var(--albescent-reveal-text-muted)", textTransform: "uppercase" }}>{i18n.t("feed:factionSelect.albescent.eyebrow")}</div>
          {/* Was the surveyor's cross-hair on the reveal ink; the order has no
              mark of its own any more (#1891 ruling 6). Same 26px, so the
              header row's metrics are unchanged. */}
          <FactionSigil slug="albescent" size={26} />
        </div>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: vellum-letter name — the archetype's calligraphic display type */}
        <div style={{ fontFamily: "var(--font-faction-vellum)", fontStyle: "italic", fontWeight: 600, fontSize: 40, lineHeight: 1, letterSpacing: "0.01em", marginTop: "var(--space-lg)" }}>{i18n.t("feed:factionSelect.albescent.name")}</div>
        <div style={{ width: 44, height: 1, background: "var(--albescent-reveal-text)", opacity: 0.5, margin: "var(--space-md) 0" }} />
        <p className="content-text" style={{ margin: 0, fontStyle: "italic", lineHeight: 1.45, color: "var(--albescent-reveal-ink)" }}>
          {i18n.t("feed:factionSelect.albescent.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-2xl) var(--space-xl)" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.06em", color: "var(--albescent-reveal-text-muted)", marginBottom: "var(--space-md)", textTransform: "uppercase" }}>{status}{members != null && ` · ${i18n.t("feed:factionSelect.albescent.members", { count: members })}`}</div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "1px solid var(--albescent-reveal-text)", background: "transparent", color: "var(--albescent-reveal-text)",
          fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.22em", padding: "var(--space-md)", textTransform: "uppercase", transition: "background 140ms, color 140ms",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--albescent-reveal-text)"; e.currentTarget.style.color = "var(--albescent-reveal-surface)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--albescent-reveal-text)"; }}
        >{i18n.t("feed:factionSelect.albescent.cta")}</button>
      </div>
    </div>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

// Retired/renamed slugs → their live archetype. Raw slug wins first, so a
// first-class faction always renders its own card rather than a legacy skin.
//
// This is the only alias table left in the frontend. The general-purpose one in
// utils/factions.ts had been an empty object since #232 and was deleted with the
// four resolution branches that consulted it (#1389); these two slugs were never
// in it, so nothing here changed.
const LEGACY_SLUG: Record<string, string> = {
  gestalt: "coven",
  journeymen: "ephemerists",
};

export default function FactionSelectCard({ faction, ...rest }: FactionSelectCardProps) {
  const cards = surfaceMap("factionSelectCard");
  // Own-property-only on both tables (#1821). `pickVariant` already refuses a
  // prototype key, so the rendered card was right either way — but the plain
  // bracket reads let `key` hold `Object.prototype.toString` under a `string`
  // annotation on the way there.
  const key =
    !hasOwnKey(cards, faction) && hasOwnKey(LEGACY_SLUG, faction)
      ? LEGACY_SLUG[faction]
      : faction;
  // The fallback IS the `na` registration. A manifest is override-only and
  // `na` deliberately has none (`factions/index.ts`: unaffiliated is a state,
  // not a faction, and falls through to the `Default*` skins everywhere), so
  // "register the Default archetype" means naming it here — exactly as
  // TaskCard names DefaultTaskCard and MetataskSeal names DefaultSeal.
  // It used to be UaSelectCard, which dressed every unaffiliated and unknown
  // slug in UA's costume (#796, the third instance of #418/#636).
  const Card = pickVariant(cards, key, DefaultSelectCard);
  return <Card {...rest} />;
}
