import i18n from "../../i18n";
// Each select card is drawn in its faction's own display face, all six from the
// lazily-fetched faction sheet (#2079). `pages/Factions.tsx` imports this
// component directly rather than through `surfaceMap`, so the directory renders
// every card with no archetype dispatch to ask for the sheet.
import "../../factionFaces";
import { pickVariant } from "../../utils/factionDispatch";
import { hasOwnKey } from "../../utils/hasOwnKey";
import { surfaceMap } from "../../factions";
import FactionSigil from "../sigil/FactionSigil";
import DefaultSelectCard from "./DefaultSelectCard";

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
