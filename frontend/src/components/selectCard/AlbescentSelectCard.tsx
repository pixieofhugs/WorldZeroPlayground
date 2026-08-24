import type { FactionSelectCardProps } from "./FactionSelectCard";
import FactionSigil from "../sigil/FactionSigil";
import {
  ALBESCENT_FACTION_SLUG,
  isFactionRedacted,
  redactableText,
} from "../../utils/factions";

/**
 * Albescent — the one tile that still wears the society's own face (#783).
 *
 * Albescent has no theme any more: it renders Default everywhere a player is
 * seen, so a member is indistinguishable from an unaffiliated one. This card is
 * the exception for the same reason the invitation letter is — it is a REVEAL
 * surface. It reads `--albescent-reveal-*`, never
 * `factionCssVar('albescent', …)`, which resolves to the neutral default.
 *
 * ── EVERYONE SEES THIS TILE NOW, AND MOST OF THEM CANNOT READ IT (#2409) ────
 *
 * The premise above used to continue "…so anyone who can see this tile at all
 * already knows the society exists", because `/factions` omitted Albescent
 * server-side until an account was revealed. ADR-0082 ended that: the row ships
 * to every caller and the tile draws in every directory, with every string
 * resolved through `redactableText` to `[REDACTED]` and painted in the sheet's
 * own colour. A locked door with no keyhole, rather than no door.
 *
 * ONE MARK REDACTS THE WHOLE TILE. `.redacted` is set on the root and the CSS
 * catches the subtree, because each slot below declares its own ink and an
 * inherited `transparent` would lose to every one of them. That is also why a
 * slot added later is redacted for free — the failure mode of seven wrappers is
 * an eighth string somebody forgets to wrap.
 *
 * THE WORDS AND THE DOOR MOVE TOGETHER — see the comment on the button.
 *
 * The tile keeps its face throughout, which is #1891 ruling 1 and unamended:
 * the vellum, the inner rule, the labyrinth and the frame all render for an
 * unrevealed viewer exactly as they do for a member. Only the words go.
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
 * ── THE PARKED REPAINT, NOW SETTLED (#2301) ─────────────────────────────────
 *
 * The other seven children each gathered their tile's register off its own task
 * card. This one could not, and the reason was not scheduling — there was no
 * register to gather. `AlbescentTaskCard` is fifty lines that draw nothing of
 * their own: it renders `DefaultTaskCard` and washes two motion overlays over
 * it, because ADR-0048 and that card's own docstring rule that *"a secret
 * society hiding in plain sight is revealed by a shimmer, never by a colour — a
 * repaint in Albescent's own hues would put it back in the spectrum and un-hide
 * it."* Its token families are `--faction-default-*`.
 *
 * That tension — a reveal surface painting in `--albescent-reveal-*` while every
 * ordinary surface must not — is real, and #2301 has now dissolved rather than
 * resolved it. The reveal register gained a dark half whose values ARE the na
 * card's (`--faction-default-card-bg` / `-text` / `-muted`), so after dark this
 * tile paints in the very family adopting outright would have handed it, and it
 * still keeps its own pale face by day. Nothing below changed to get that: every
 * colour here was already a reveal token, and the cascade did the rest.
 *
 * Both halves are measured now, which closes the one acceptance line of #2321
 * this tile did not meet. Its inks, being the reveal register's, are the three
 * rows `factionContrast.test.ts` holds under `albescent reveal sheet, …` in
 * BOTH themes: 17.07 / 6.74 / 4.64 by day, 13.75 / 8.04 / 5.44 by night.
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
  const status = redactableText(`feed:factionSelect.albescent.status.${state}`);
  const redacted = isFactionRedacted(ALBESCENT_FACTION_SLUG);
  return (
    <div
      className={redacted ? "redacted" : undefined}
      data-redacted={redacted ? "true" : undefined}
      style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--albescent-reveal-surface)", color: "var(--albescent-reveal-text)", fontFamily: "var(--font-faction-vellum)",
      border: "1px solid var(--albescent-reveal-border)", boxShadow: "var(--albescent-reveal-shadow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 12, border: "1px solid var(--albescent-reveal-border-faint)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-2xl) 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.34em", color: "var(--albescent-reveal-text-muted)", textTransform: "uppercase" }}>{redactableText("feed:factionSelect.albescent.eyebrow")}</div>
          {/* Was the surveyor's cross-hair on the reveal ink; the order has no
              mark of its own any more (#1891 ruling 6). Same 26px, so the
              header row's metrics are unchanged. */}
          <FactionSigil slug="albescent" size={26} />
        </div>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: vellum-letter name — the archetype's calligraphic display type */}
        <div style={{ fontFamily: "var(--font-faction-vellum)", fontStyle: "italic", fontWeight: 600, fontSize: 40, lineHeight: 1, letterSpacing: "0.01em", marginTop: "var(--space-lg)" }}>{redactableText("feed:factionSelect.albescent.name")}</div>
        <div style={{ width: 44, height: 1, background: "var(--albescent-reveal-text)", opacity: 0.5, margin: "var(--space-md) 0" }} />
        <p className="content-text" style={{ margin: 0, fontStyle: "italic", lineHeight: 1.45, color: "var(--albescent-reveal-ink)" }}>
          {redactableText("feed:factionSelect.albescent.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-2xl) var(--space-xl)" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.06em", color: "var(--albescent-reveal-text-muted)", marginBottom: "var(--space-md)", textTransform: "uppercase" }}>{status}{members != null && ` · ${redactableText("feed:factionSelect.albescent.members", { count: members })}`}</div>
        {/* THE CONTROL RENDERS AND IS DISABLED UNTIL THE ACCOUNT QUALIFIES
            (#2409). It is the same `redacted` answer the words take, and it has
            to be the same one: the card un-redacts and unlocks in the same
            moment, so there is no state showing a readable card with a dead
            button or a redacted card with a live one. A second predicate here
            is how that pair would drift.

            Disabled rather than absent — the door is visible, which is the
            whole mechanic. The hover swap goes with it: a `:disabled` button
            that repaints under the cursor reads as clickable, and the inline
            handlers would outrank the redaction's own colour. */}
        <button
          onClick={onVisit}
          disabled={redacted}
          style={{
          width: "100%", cursor: redacted ? "default" : "pointer", border: "1px solid var(--albescent-reveal-text)", background: "transparent", color: "var(--albescent-reveal-text)",
          fontFamily: "var(--font-body)", fontSize: "var(--text-md)", letterSpacing: "0.22em", padding: "var(--space-md)", textTransform: "uppercase", transition: "background 140ms, color 140ms",
        }}
          onMouseEnter={redacted ? undefined : (e) => { e.currentTarget.style.background = "var(--albescent-reveal-text)"; e.currentTarget.style.color = "var(--albescent-reveal-surface)"; }}
          onMouseLeave={redacted ? undefined : (e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--albescent-reveal-text)"; }}
        >{redactableText("feed:factionSelect.albescent.cta")}</button>
      </div>
    </div>
  );
}
