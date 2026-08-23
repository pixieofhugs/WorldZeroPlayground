import { AdminOverlay } from "../shared";
import { factionSheet } from "../../../utils/factions";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The unaffiliated card — A PLAIN CREAM SHEET (#842, ADR-0039). The fallback for
 * `na` and for any task faction without a bespoke archetype.
 *
 * The point of this skin is restraint: it is a quiet sheet, and the community
 * rainbow appears in exactly THREE places on it — the score box's hairline rule
 * and the total (both in `DefaultScoreStamp`), and one 2px divider above the
 * vote widget. #820 read "the spectrum card" as a full-bleed rainbow BAND
 * wrapped around the frame plus a `DefaultSigil` masthead row; neither exists in
 * the prototype, and together they made the least-marked faction the loudest
 * card on the page. Both are gone.
 *
 * NO RUNNING HEAD (#1701). This card is the one archetype that passes no
 * `eyebrow` — the title is the first thing read. The other eight factions still
 * fill the slot from `card.masthead.*`, so the slot stays; what went is this
 * one caller's use of it plus the `default` string that fed it — spelling that
 * key out here would only leave a dead-key sweep something to find. It took the
 * rainbow's fourth appearance (the running head clipped to type) with it.
 *
 * The title is set in Bebas Neue (`--faction-default-card-font`), the design's
 * unaffiliated face. It had been resolving to Lora through the shared
 * `font-display` class — the site wordmark's serif, not this card's.
 *
 * All colour via `--faction-default-*`, so the sheet flips through the
 * `[data-theme="dark"]` cascade with no `dark ?` branch.
 */
export function DefaultPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        position: "relative",
        borderRadius: 10, // plain cream sheet
        ...factionSheet(),
        color: "var(--faction-default-card-text)",
        border: "1px solid var(--faction-default-card-line)",
        boxShadow: "0 3px 14px var(--color-cast-shadow-soft)",
        padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint="var(--faction-default-card-accent)"
        muted="var(--faction-default-card-muted)"
        paper="var(--faction-default-card-bg)"
        showCrown={showCrown}
        // Bebas Neue carries the sheet's identity; Courier Prime reads the
        // proof. The quiet sheet keeps the house body face on purpose (#888).
        fonts={{
          display: "var(--faction-default-card-font)",
          body: "var(--font-body)",
        }}
        titleStyle={{
          fontFamily: "var(--faction-default-card-font)",
          letterSpacing: "0.02em",
          lineHeight: 1,
          color: "var(--faction-default-card-text)",
        }}
        voteRule={
          <div
            aria-hidden
            style={{
              height: 2,
              // Rainbow appearance 3 of 3: the one divider on the sheet. The
              // opacity sits between the design's light (0.4) and dark (0.5)
              // values — a single number keeps this off a `dark ?` branch, and
              // the difference is one step of a wash behind a 2px rule.
              opacity: 0.45,
              background: "var(--faction-default-rainbow)",
              margin: "var(--space-lg) 0 var(--space-md)",
            }}
          />
        }
      />
    </div>
  );
}

export default DefaultPraxisCard;
