import { useTranslation } from "react-i18next";
import type { FactionOut } from "../../api/factions";
import {
  factionCssVar,
  factionName,
  sortFactionsByRainbowOrder,
} from "../../utils/factions";
import FactionSigil from "../sigil/FactionSigil";

/**
 * Faction filter — mobile sigil row (ADR-0040 §3, #659). The touch-native
 * sibling of `FilterFactionTabs`: same `{factions, value, onChange}` shape,
 * so it's a drop-in swap for a chip row. Renders one round sigil button per
 * faction from the `factions` prop (never a hardcoded list — ADR-0027) plus
 * an "all factions" circle using the shared spectrum-ring token. The row
 * itself is neutral chrome; only the sigils/rings render faction color as
 * data.
 */
interface Props {
  factions: FactionOut[];
  value: string;
  onChange: (slug: string) => void;
}

const CIRCLE_DIAMETER = 36;
const SIGIL_SIZE = 20;

/**
 * The toggle-off decision a faction circle's click makes: tapping the
 * already-active faction clears the filter, otherwise selects it. Exported
 * so the interaction can be unit-tested without a DOM (mirrors
 * `FilterFactionTabs`'s inline `value === faction.slug ? "" : faction.slug`).
 */
export function nextFactionValue(current: string, slug: string): string {
  return current === slug ? "" : slug;
}

export default function FactionSigilRow({ factions, value, onChange }: Props) {
  const { t } = useTranslation("common");
  const { t: tt } = useTranslation("tasks");
  const allActive = value === "";

  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow flex-none">{t("filters.faction")}</span>
      <div
        className="flex gap-2 pb-0.5"
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
      >
        <button
          type="button"
          aria-label={tt("mobile.allFactions")}
          onClick={() => onChange("")}
          className="rounded-full flex-none"
          style={{
            width: CIRCLE_DIAMETER,
            height: CIRCLE_DIAMETER,
            background: "var(--faction-default-rainbow)",
            boxShadow: allActive
              ? "0 0 0 2px var(--color-text-primary)"
              : "0 0 0 1px var(--color-border-strong)",
            opacity: allActive ? 1 : 0.85,
            cursor: "pointer",
          }}
        />
        {sortFactionsByRainbowOrder(factions).map((faction) => {
          const active = value === faction.slug;
          return (
            <button
              key={faction.slug}
              type="button"
              aria-label={factionName(faction.slug)}
              onClick={() => onChange(nextFactionValue(value, faction.slug))}
              className="rounded-full flex-none flex items-center justify-center"
              style={{
                width: CIRCLE_DIAMETER,
                height: CIRCLE_DIAMETER,
                background: "var(--color-bg-surface)",
                boxShadow: active
                  ? `0 0 0 2px ${factionCssVar(faction.slug)}`
                  : "0 0 0 1px var(--color-border-strong)",
                opacity: active ? 1 : 0.85,
                cursor: "pointer",
              }}
            >
              <FactionSigil slug={faction.slug} size={SIGIL_SIZE} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
