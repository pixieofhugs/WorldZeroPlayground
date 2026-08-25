import {
  factionSpectrumSheet,
  isFactionRedacted,
  redactableText,
  UNAFFILIATED_FACTION_SLUG,
} from "../../utils/factions";
// Type-only, so this does NOT close a runtime cycle with the dispatcher that
// imports this component as its fallback.
import type { FactionSelectCardProps } from "./FactionSelectCard";
import FactionSigil from "../sigil/FactionSigil";

/**
 * DefaultSelectCard — THE OPEN SHEET. The faction-directory tile for the
 * UNAFFILIATED (`na`) state, and the fallback every unregistered slug lands on
 * (#796). `na` ≡ Default is one identity: this IS the unaffiliated kit, not a
 * generic neutral, so it carries the spectrum rather than grey.
 *
 * Until #796 this surface had no Default archetype at all, so `FactionSelectCard`
 * fell back to `UaSelectCard` — an unaffiliated or unknown slug wore UA's gilt
 * costume. That is the #418/#636 bug, third instance.
 *
 * VISUAL LANGUAGE — the Default PRAXIS card (#820, #842). A quiet cream sheet in
 * `--faction-default-card-bg`, its name set in Bebas Neue
 * (`--faction-default-card-font`, the unaffiliated face) and Courier Prime for
 * everything a player reads. The point of the skin is restraint: where each
 * faction commits to one loud archetype, this one commits to none.
 *
 * The rainbow appears in exactly THREE places — the frame that IS the card's
 * edge, the conic ring of the sigil, and the one hairline rule under the name.
 * Every one of them is a FILL and never a `factionCssVar` scalar (ADR-0039): a
 * gradient is not expressible in `color:` or `border: Npx solid X`, so the
 * scalars here — body ink, the muted status line, the CTA's hairline — stay
 * genuinely neutral. That is the ADR's ruling, not a shortfall, and the reason
 * there is no `background-clip: text` on this card.
 *
 * None of the three names `--faction-default-rainbow` inline any more, and each
 * left by a different door: the edge is `factionSpectrumSheet()`, the mark is
 * `FactionSigil`'s na ring, and the hairline is `.spectrum-rule`. What that buys
 * is the same thing `factionFill(UNAFFILIATED_FACTION_SLUG, …)` bought before —
 * one declaration of the ramp, reached through a seam — plus a mount a
 * stylesheet can dress, which an inline fill can never be (#2497).
 *
 * All colour via `--faction-default-*`, so the sheet flips through the
 * `[data-theme="dark"]` cascade with no `dark ?` branch.
 *
 * ── IT IS ALBESCENT'S TILE TOO NOW, AND IT DOES NOT KNOW THAT (#2632) ───────
 *
 * The `/factions` tile was the last of four surfaces painted from the
 * hand-authored `--albescent-reveal-*` vellum register, and the owner's ruling
 * purged it: `AlbescentSelectCard` collapsed to a wrapper over this component,
 * which deletes #1891 ruling 1 ("the tile keeps its face throughout") on
 * purpose. Three things had to become reachable for that to be true, and each
 * is generic — nothing below names Albescent:
 *
 *  1. **The copy stem is a prop.** `slug` picks which `feed:factionSelect.<slug>`
 *     block is read and which mark `FactionSigil` resolves. It does NOT pick a
 *     colour: the fills stay pinned to `UNAFFILIATED_FACTION_SLUG` on purpose,
 *     so a future unregistered slug landing here still gets the spectrum rather
 *     than its own livery — the #796 / #418 / #636 bug, which is a fallback's to
 *     avoid. (Albescent would be unharmed either way: `resolveCssKey` maps it to
 *     `default`, which is the whole of #783.)
 *  2. **The copy goes through the redaction gate.** `redactableText` redacts
 *     Albescent-SCOPED keys and plain-`t()`s every other one, so `na` reads
 *     exactly as it did and the tile needs no branch to tell the two apart. The
 *     CTA takes `disabled` from the SAME predicate, because a card that
 *     un-redacts and unlocks in two answers eventually shows a readable card
 *     with a dead door (#2409, ADR-0082).
 *  3. **The ground and the hairline became dressable.** The sheet is the
 *     `--faction-default-card-sheet` TRIPLE rather than an inline fill, so
 *     `.alb-prism` on a wrapper can repaint it; the hairline wears
 *     `.spectrum-rule`, so `.alb-moves` can walk it. Both render byte-identical
 *     paint for `na` — the sheet token declares today's exact value and the
 *     class carries exactly `--faction-default-rainbow` — which is why this is a
 *     change of REACH, not of looks.
 */

const MONO = "var(--font-body)";
/** Bebas Neue — the unaffiliated display face, as on the Default praxis card. */
const DISPLAY = "var(--faction-default-card-font)";

export interface DefaultSelectCardProps
  extends Omit<FactionSelectCardProps, "faction"> {
  /**
   * Whose words and whose mark. Defaults to the unaffiliated sheet, which is
   * both this archetype's own identity and what every unregistered slug gets.
   */
  slug?: string;
}

export default function DefaultSelectCard({
  state = "locked",
  members,
  onVisit,
  slug = UNAFFILIATED_FACTION_SLUG,
}: DefaultSelectCardProps) {
  const say = (key: string, options?: Record<string, unknown>) =>
    redactableText(`feed:factionSelect.${slug}.${key}`, options);
  const status = say(`status.${state}`);
  // ONE predicate for the words and the door (#2409). The wrapper reads the
  // same function for the ground; what may never happen is a SECOND answer.
  const redacted = isFactionRedacted(slug);
  return (
    <div
      className={redacted ? "redacted" : undefined}
      data-redacted={redacted ? "true" : undefined}
      style={{
        width: "100%",
        maxWidth: 360,
        minHeight: 300,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        // Rainbow 1 of 3: the spectrum IS the card's edge — the ramp painted
        // into the border box under a sheet clipped to the padding box. The
        // TRIPLE rather than `factionFill(…, "frame")`'s two-layer shorthand, so
        // a dresser can repaint the ground by overriding one token and the arity
        // follows it (#2497). Same pixels for na: the sheet token declares
        // exactly `linear-gradient(card-bg, card-bg)`.
        boxSizing: "border-box",
        border: "2px solid transparent",
        ...factionSpectrumSheet(),
        borderRadius: 14,
        color: "var(--faction-default-card-text)",
        fontFamily: MONO,
        boxShadow: "0 12px 32px -14px var(--color-cast-shadow)",
      }}
    >
      <div style={{ flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {/* Rainbow 2 of 3: the mark, through the canonical dispatcher — the
              seven-segment conic ring for na and every unregistered slug, and
              whatever the manifest names for one that has its own. A mark is
              never drawn inline and never part of a wrapper (ADR-0083 §1). */}
          <FactionSigil slug={slug} size={40} />
          <div
            className="label-heading"
            style={{ letterSpacing: "0.2em", color: "var(--faction-default-card-muted)" }}
          >
            {say("eyebrow")}
          </div>
        </div>

        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: "var(--text-display)",
            lineHeight: 1,
            letterSpacing: "0.02em",
            marginTop: "var(--space-md)",
          }}
        >
          {say("name")}
        </div>

        {/* Rainbow 3 of 3: the single rule on the sheet. Trimmed to the same
            0.45 the Default praxis card's divider carries, so the two surfaces
            read as one identity. `.spectrum-rule` carries the ramp and nothing
            else, so a dresser reaches it (#2497); the height, the opacity and
            the margin are this mount's geometry and stay here. ORNAMENT, so it
            must stay CHILDLESS — `.alb-moves .spectrum-rule:empty` is what walks
            it, and a child added here silently stops it. */}
        <div
          aria-hidden="true"
          className="spectrum-rule"
          style={{
            height: 2,
            opacity: 0.45,
            margin: "var(--space-md) 0",
          }}
        />

        <p
          className="content-text"
          style={{ margin: 0, lineHeight: 1.55, color: "var(--faction-default-card-muted)" }}
        >
          {say("blurb")}
        </p>
      </div>

      <div style={{ padding: "var(--space-lg) var(--space-xl)" }}>
        <div
          style={{
            fontSize: "var(--text-content)",
            color: "var(--faction-default-card-muted)",
            marginBottom: "var(--space-md)",
          }}
        >
          {status}
          {members != null && <> · {say("members", { count: members })}</>}
        </div>
        {/* THE DOOR IS VISIBLE AND SHUT, never absent (#2409). A redacted tile
            keeps its control and disables it — an absent button would be the old
            hiding wearing a different shape — and it takes the same `redacted`
            answer the words above take. */}
        <button
          onClick={onVisit}
          disabled={redacted}
          style={{
            width: "100%",
            cursor: redacted ? "default" : "pointer",
            fontFamily: DISPLAY,
            fontSize: "var(--text-xl)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "var(--space-md)",
            borderRadius: 11,
            color: "var(--faction-default-card-text)",
            background: "transparent",
            // A scalar context, so it stays neutral on purpose (ADR-0039) — the
            // same hairline the Default task card's CTA carries.
            border:
              "1px solid color-mix(in srgb, var(--faction-default-card-accent) 35%, transparent)",
          }}
        >
          {say("cta")}
        </button>
      </div>
    </div>
  );
}
