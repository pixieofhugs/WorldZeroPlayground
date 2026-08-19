import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import FactionSigil from "../sigil/FactionSigil";

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
 * #796: the dispatcher used to fall back to UA's costume, so an Albescent tile
 * without this card went UA orange rather than quiet. It falls back to
 * `DefaultSelectCard` instead, and per #783/#794 Albescent resolves to the
 * default/na path anyway — so an unregistered Albescent would get the na
 * rainbow, which is exactly "hiding by looking unaffiliated". No branch here
 * says so; the value test in `resolveCssKey` does.
 *
 * ── ONE FILE PER FACTION (#2329, the last child of #2321) ───────────────────
 *
 * The eighth and final archetype to leave the 595-line `FactionSelectCard.tsx`,
 * mirroring how `components/taskCard/` is laid out. That file is now the
 * dispatcher, the shared types and `LEGACY_SLUG` and nothing else. This move is
 * a PURE move: not a byte of the markup below changed, and the six
 * `state` × `members` renders are identical before and after.
 *
 * ── THE REPAINT IS PARKED, DELIBERATELY (#2301) ─────────────────────────────
 *
 * The other seven children each gathered their tile's register off its own task
 * card. This one cannot, and the reason is not scheduling — there is no register
 * to gather. `AlbescentTaskCard` is fifty lines that draw nothing of their own:
 * it renders `DefaultTaskCard` and washes two motion overlays over it, because
 * ADR-0048 and that card's own docstring rule that *"a secret society hiding in
 * plain sight is revealed by a shimmer, never by a colour — a repaint in
 * Albescent's own hues would put it back in the spectrum and un-hide it."* Its
 * token families are `--faction-default-*`. Adopting them here would delete this
 * tile's face outright.
 *
 * That tension — a reveal surface painting in `--albescent-reveal-*` while every
 * ordinary surface must not — is real, and it is NOT settled here. The owner has
 * ruled the reveal family gets a dark half (#2301, still `needs-design`) and
 * `index.css` still carries a comment forbidding exactly that. Whatever #2301
 * lands is what decides this tile's ground, so the colour is left untouched and
 * the extraction stands on its own. The light half is therefore still UNMEASURED
 * here, which is the one acceptance line of #2321 this tile does not yet meet.
 *
 * The sigil comes from the shared canonical dispatcher — `FactionSigil` resolves
 * `albescent` to `AlbescentSigil` (the labyrinth, which carries no hue of its
 * own) through an adapter, so the mark is never re-drawn inline.
 *
 * The box is FLUID, not fixed: `width: 100%` up to a 360 max and `minHeight`
 * rather than a hard height, so the same art survives a 375px phone in the
 * single-column mobile directory (#732).
 */
export default function AlbescentSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
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
