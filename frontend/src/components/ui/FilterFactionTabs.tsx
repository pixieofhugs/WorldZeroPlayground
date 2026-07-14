import { useTranslation } from "react-i18next";
import type { FactionOut } from "../../api/factions";
import {
  factionCssVar,
  sortFactionsByRainbowOrder,
} from "../../utils/factions";

/**
 * Faction filter — Diagonal Banner Tabs (Style Guide §5.3).
 * Pennant shape via .pennant-shape class, faction-colored, inactive: desaturated + low opacity.
 */

interface Props {
  factions: FactionOut[];
  value: string;
  onChange: (slug: string) => void;
}

export default function FilterFactionTabs({
  factions,
  value,
  onChange,
}: Props) {
  const { t } = useTranslation('common');
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
              background: factionCssVar(faction.slug),
              color: "var(--color-text-on-accent)",
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              padding: "4px 12px",
              cursor: "pointer",
              border: "none",
              borderRadius: 0,
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              opacity: active ? 1 : 0.85,
              filter: "none",
              transition: "all 120ms",
            }}
          >
            {faction.name}
          </button>
        );
      })}
    </div>
  );
}
