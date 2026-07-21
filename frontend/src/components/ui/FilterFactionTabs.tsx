import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { FactionOut } from "../../api/factions";
import {
  factionCssVar,
  factionFill,
  factionName,
  sortFactionsByRainbowOrder,
  UNAFFILIATED_FACTION_SLUG,
} from "../../utils/factions";

/**
 * Faction filter — Diagonal Banner Tabs (Style Guide §5.3).
 * Pennant shape via .pennant-shape class, faction-colored, inactive: desaturated + low opacity.
 *
 * After the registry factions comes one extra pennant for the unaffiliated
 * sentinel (#921): cross-faction is the default kind of proposed task, yet it is
 * the one slice you couldn't isolate. `na` is a state, not a faction (ADR-0030 /
 * ADR-0039), so it is deliberately absent from `GET /factions` and from
 * `FACTION_RAINBOW_ORDER` — this component supplies it explicitly, appended
 * last, exactly where `sortFactionsByRainbowOrder` sorts unknown slugs. Its fill
 * is the rainbow spectrum (`factionFill('na', 'bar')`), NOT `factionCssVar('na')`
 * which resolves to neutral grey.
 */

interface Props {
  factions: FactionOut[];
  value: string;
  onChange: (slug: string) => void;
}

// Shared pennant chrome — the fill (and, for `na`, only the fill) varies per
// pennant; everything else is identical across the row.
const PENNANT_STYLE: CSSProperties = {
  color: "var(--color-text-on-accent)",
  fontFamily: "'Courier Prime', monospace",
  fontSize: "var(--text-sm)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  padding: "var(--space-xs) var(--space-md)",
  cursor: "pointer",
  border: "none",
  borderRadius: 0,
  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
  filter: "none",
  transition: "all 120ms",
};

export default function FilterFactionTabs({
  factions,
  value,
  onChange,
}: Props) {
  const { t } = useTranslation('common');
  const unaffiliatedActive = value === UNAFFILIATED_FACTION_SLUG;
  return (
    <div className="flex gap-1 items-center">
      <span className="eyebrow">{t("filters.faction")}</span>
      {sortFactionsByRainbowOrder(factions).map((faction) => {
        const active = value === faction.slug;
        return (
          <button
            key={faction.slug}
            onClick={() => onChange(value === faction.slug ? "" : faction.slug)}
            className="pennant-shape"
            style={{
              ...PENNANT_STYLE,
              background: factionCssVar(faction.slug),
              opacity: active ? 1 : 0.85,
            }}
          >
            {factionName(faction.slug)}
          </button>
        );
      })}
      <button
        key={UNAFFILIATED_FACTION_SLUG}
        onClick={() =>
          onChange(unaffiliatedActive ? "" : UNAFFILIATED_FACTION_SLUG)
        }
        className="pennant-shape"
        style={{
          ...PENNANT_STYLE,
          ...factionFill(UNAFFILIATED_FACTION_SLUG, "bar"),
          opacity: unaffiliatedActive ? 1 : 0.85,
        }}
      >
        {factionName(UNAFFILIATED_FACTION_SLUG)}
      </button>
    </div>
  );
}
