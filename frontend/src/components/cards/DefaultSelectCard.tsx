import i18n from "../../i18n";
import { factionFill, UNAFFILIATED_FACTION_SLUG } from "../../utils/factions";
// Type-only, so this does NOT close a runtime cycle with the dispatcher that
// imports this component as its fallback.
import type { FactionSelectCardProps } from "./FactionSelectCard";
import DefaultSigil from "./DefaultSigil";

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
 * Every one of them is a FILL, taken from `factionFill(slug, shape)` and never
 * from `factionCssVar` (ADR-0039): a gradient is not expressible in `color:` or
 * `border: Npx solid X`, so the scalars here — body ink, the muted status line,
 * the CTA's hairline — stay genuinely neutral. That is the ADR's ruling, not a
 * shortfall, and the reason there is no `background-clip: text` on this card.
 *
 * Reaching the spectrum through `factionFill(UNAFFILIATED_FACTION_SLUG, …)`
 * rather than naming `--faction-default-rainbow` inline keeps this card on the
 * VALUE-test path (`resolveCssKey` → `default`), the same seam every other
 * unaffiliated surface reads. Key-presence testing is the #749 regression.
 *
 * All colour via `--faction-default-*`, so the sheet flips through the
 * `[data-theme="dark"]` cascade with no `dark ?` branch.
 */

const MONO = "var(--font-body)";
/** Bebas Neue — the unaffiliated display face, as on the Default praxis card. */
const DISPLAY = "var(--faction-default-card-font)";

export default function DefaultSelectCard({
  state = "locked",
  members,
  onVisit,
}: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.na.status.${state}` as const);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        minHeight: 300,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        // Rainbow 1 of 3: the spectrum IS the card's edge. `frame` paints the
        // gradient into the border box and the neutral sheet into the padding
        // box, and brings its own `boxSizing`/`border`.
        ...factionFill(UNAFFILIATED_FACTION_SLUG, "frame"),
        borderRadius: 14,
        color: "var(--faction-default-card-text)",
        fontFamily: MONO,
        boxShadow: "0 12px 32px -14px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ flex: 1, padding: "var(--space-xl) var(--space-xl) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {/* Rainbow 2 of 3: the seven-segment conic mark. */}
          <DefaultSigil size={40} />
          <div
            className="eyebrow"
            style={{ letterSpacing: "0.2em", color: "var(--faction-default-card-muted)" }}
          >
            {i18n.t("feed:factionSelect.na.eyebrow")}
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
          {i18n.t("feed:factionSelect.na.name")}
        </div>

        {/* Rainbow 3 of 3: the single rule on the sheet. Trimmed to the same
            0.45 the Default praxis card's divider carries, so the two surfaces
            read as one identity. */}
        <div
          aria-hidden="true"
          style={{
            height: 2,
            opacity: 0.45,
            margin: "var(--space-md) 0",
            ...factionFill(UNAFFILIATED_FACTION_SLUG, "bar"),
          }}
        />

        <p
          className="content-text"
          style={{ margin: 0, lineHeight: 1.55, color: "var(--faction-default-card-muted)" }}
        >
          {i18n.t("feed:factionSelect.na.blurb")}
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
          {members != null && (
            <> · {i18n.t("feed:factionSelect.na.members", { count: members })}</>
          )}
        </div>
        <button
          onClick={onVisit}
          style={{
            width: "100%",
            cursor: "pointer",
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
          {i18n.t("feed:factionSelect.na.cta")}
        </button>
      </div>
    </div>
  );
}
