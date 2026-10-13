import {
  factionSpectrumSheet,
  isFactionRedacted,
  redactableText,
  UNAFFILIATED_FACTION_SLUG,
} from "../../utils/factions";
import { factionRoleVars } from "../../utils/factionRoles";
import { CTA_SELECT_SIZE, DEFAULT_CARD_CTA } from "../taskCard/cardCta";
// Type-only, so this does NOT close a runtime cycle with the dispatcher that
// imports this component as its fallback.
import type { FactionSelectCardProps } from "./FactionSelectCard";
import FactionSigil from "../sigil/FactionSigil";
import DefaultSelectSeal from "./DefaultSelectSeal";
import {
  SelectCardBand,
  SelectCardBody,
  SelectCardCall,
  SelectCardFooter,
  SelectCardFrame,
  SelectCardMotto,
  SelectCardOrnament,
  SelectCardPitch,
  SelectCardStanding,
} from "./selectCardBlocks";

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
 * The rainbow appears in exactly FOUR places — the frame that IS the card's
 * edge, the conic ring of the sigil, the member seal, and the one hairline rule
 * that is the tile's ornament. Every one of them is a FILL and never a `factionCssVar` scalar (ADR-0039): a
 * gradient is not expressible in `color:` or `border: Npx solid X`, so the
 * scalars here — body ink, the muted status line, the CTA's hairline — stay
 * genuinely neutral. That is the ADR's ruling, not a shortfall, and the reason
 * there is no `background-clip: text` on this card.
 *
 * None of them names `--faction-default-rainbow` inline any more, and each
 * left by a different door: the edge is `factionSpectrumSheet()`, the mark is
 * `FactionSigil`'s na ring, the seal is `DefaultSelectSeal`, and the hairline is
 * `.spectrum-rule`. What that buys
 * is the same thing `factionFill(UNAFFILIATED_FACTION_SLUG, …)` bought before —
 * one declaration of the ramp, reached through a seam — plus a mount a
 * stylesheet can dress, which an inline fill can never be (#2497).
 *
 * THE TREE IS THE SELECT-CARD CHASSIS (#3130, #3139). The seven slots, their
 * order and the outer box come from `selectCardBlocks.tsx`; what this file
 * hands them is the na dress — a row band, the tagline as the display line, the
 * spectrum rule as the ornament. This tile was the blocks' first consumer.
 *
 * All colour via `--faction-default-*`, so the sheet flips through the
 * `[data-theme="dark"]` cascade with no `dark ?` branch.
 *
 * ── IT IS ALBESCENT'S TILE TOO NOW, AND IT DOES NOT KNOW THAT (#2632) ───────
 *
 * The `/factions` tile was the last of four surfaces painted from the
 * hand-authored vellum register, and the owner's ruling
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
const DISPLAY = "var(--na-select-card-face)";

interface DefaultSelectCardProps
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
  // The member noun is the faction page header's, not a second one written for
  // the tile. `na` has no header block of its own and reads the shared noun.
  const membersKey =
    slug === UNAFFILIATED_FACTION_SLUG
      ? "feed:factionHero.stats.members"
      : `feed:factionHero.${slug}.stats.members`;
  // ONE predicate for the words and the door (#2409). The wrapper reads the
  // same function for the ground; what may never happen is a SECOND answer.
  const redacted = isFactionRedacted(slug);
  return (
    <SelectCardFrame
      className={redacted ? "redacted" : undefined}
      data-redacted={redacted ? "true" : undefined}
      style={{
        // The role map (#2672) — and PINNED, deliberately not off `slug`.
        // Point 1 of the note above is a standing ruling: `slug` picks the
        // words and the mark and never a colour, because an unregistered slug
        // landing here must get the spectrum rather than a livery (#796 / #418
        // / #636, the same bug three times). The ground says the same thing —
        // `factionSpectrumSheet()` is na's and cannot follow a slug — and an
        // ink may not leave a ground that stays put (#2361, and the 1.03:1 the
        // contrast loop caught on #2669). What the prefix buys is a NAME a host
        // can dress this one surface by, instead of overriding
        // `--faction-default-card-text` and repainting every na descendant.
        ...factionRoleVars("na", "na-select-card"),
        // Rainbow 1 of 4: the spectrum IS the card's edge — the ramp painted
        // into the border box under a sheet clipped to the padding box. The
        // TRIPLE rather than `factionFill(…, "frame")`'s two-layer shorthand, so
        // a dresser can repaint the ground by overriding one token and the arity
        // follows it (#2497). Same pixels for na: the sheet token declares
        // exactly `linear-gradient(card-bg, card-bg)`.
        border: "2px solid transparent",
        ...factionSpectrumSheet(),
        borderRadius: 14,
        color: "var(--na-select-card-ink)",
        fontFamily: MONO,
        boxShadow: "0 12px 32px -14px var(--color-cast-shadow)",
      }}
    >
      {/* A ROW, name hard against the mark, as the reference draws this tile. */}
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        /* Rainbow 2 of 4: the mark, through the canonical dispatcher — the
           conic ring for na and every unregistered slug, and whatever the
           manifest names for one that has its own. A mark is never drawn
           inline and never part of a wrapper (ADR-0083 §1). */
        mark={<FactionSigil slug={slug} size={40} />}
        /* Rainbow 3 of 4, and a member's alone. PROVISIONAL — see the file. */
        seal={<DefaultSelectSeal />}
        style={{ padding: "var(--space-xl) var(--space-xl) 0" }}
        nameStyle={{
          fontFamily: DISPLAY,
          fontSize: "var(--text-display)",
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {/* The CANONICAL name (ADR-0038), not a copy of it under this tile's
            own stem (#2806), and read through the redaction gate:
            `ALBESCENT_SCOPED_KEY` matches the segment in any namespace, so
            `factions:names.albescent` redacts exactly as the tile's own copy
            does. `factionName()` would NOT — it returns the MASKED name, which
            is a different ruled behaviour (ADR-0082 §2) and would silently
            reverse this tile. */}
        {redactableText(`factions:names.${slug}`)}
      </SelectCardBand>

      <SelectCardBody style={{ padding: "0 var(--space-xl)" }}>
        {/* THE DISPLAY LINE (#3130). The tagline used to sit under the name in
            the quiet ink; promoted, it takes the sheet's own ink. The reference
            draws it at 19px, which is no rung: the content floor's 18 is the
            nearest, and a size between two tiers is what the scale forbids. */}
        <SelectCardMotto
          className="content-text"
          style={{ fontStyle: "italic", lineHeight: 1.4, marginTop: "var(--space-lg)" }}
        >
          {say("tagline")}
        </SelectCardMotto>

        <SelectCardPitch
          className="content-text"
          style={{
            lineHeight: 1.55,
            marginTop: "var(--space-md)",
            color: "var(--na-select-card-quiet)",
          }}
        >
          {say("blurb")}
        </SelectCardPitch>

        {/* Rainbow 4 of 4, and THE ORNAMENT: the single rule on the sheet,
            moved from under the name to between pitch and footer (#3130).
            Trimmed to the same 0.45 the Default praxis card's divider carries,
            so the two surfaces read as one identity. `.spectrum-rule` carries
            the ramp and nothing else, so a dresser reaches it (#2497); the
            height, the opacity and the margin are this mount's geometry and
            stay here. It is passed NO CHILDREN on purpose —
            `.alb-moves .spectrum-rule:empty` is what walks it, and a child
            added here silently stops it. */}
        <SelectCardOrnament
          className="spectrum-rule"
          style={{ height: 2, opacity: 0.45, marginTop: "var(--space-lg)" }}
        />
      </SelectCardBody>

      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-xl)" }}>
        <SelectCardStanding
          members={members}
          /* The figure is the tile's to draw and the noun is the faction page
             header's (#3148). A redacted tile withholds the figure with the
             noun. */
          headcount={(count) => (
            <>
              {!redacted && <>{count} </>}
              {redactableText(membersKey, { count })}
            </>
          )}
          separator=" · "
          style={{
            fontSize: "var(--text-content)",
            color: "var(--na-select-card-quiet)",
            marginBottom: "var(--space-md)",
          }}
        >
          {say(`status.${state}`)}
        </SelectCardStanding>
        {/* THE DOOR IS VISIBLE AND SHUT, never absent (#2409). A redacted tile
            keeps its control and disables it — an absent button would be the old
            hiding wearing a different shape — and it takes the same `redacted`
            answer the words above take.

            THE PAINT IS THE TASK CARD'S, AND IT IS NOT SPELT HERE (#2818).
            This button used to restate `DEFAULT_CARD_CTA` declaration for
            declaration — same face, same tracking, same 11px radius, the same
            35% hairline — which is the pair #2642 unified, one surface further
            out. What is left at this call site is geometry (`CTA_SELECT_SIZE`,
            spread LAST for the reason its docblock gives); the affordance
            (`cursor`, which is `disabled`'s partner) is the block's.

            The constant reads `--na-task-card-*` where this file reads
            `--na-select-card-*`, and for `na` that is the same value: the role
            map is EMPTY for the unaffiliated slug, so both arms resolve to the
            `--faction-default-card-*` fallback they always did. A
            surface-prefixed name cannot travel between surfaces — `cardCta.ts`
            says so at length — so the CTA is the one slot on this tile a host
            dresses through the task card's prefix rather than this one's. */}
        <SelectCardCall
          onClick={onVisit}
          disabled={redacted}
          style={{ ...DEFAULT_CARD_CTA, ...CTA_SELECT_SIZE }}
        >
          {say("cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
