import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../utils/factions";

/**
 * Dark pill showing level requirement, shared by all faction cards.
 * Uses CSS variables for theming — dark mode handled automatically by the cascade.
 *
 * Pass factionSlug to get faction-colored pill in dark mode.
 * Falls back to ink/white if no faction specified.
 */
export default function LevelPill({
  level,
  factionSlug,
}: {
  level: number;
  factionSlug?: string | null;
}) {
  const { t } = useTranslation('common');
  const bg = factionSlug
    ? factionCssVar(factionSlug, "card-accent")
    : "var(--color-text-primary)";
  const fg = factionSlug
    ? factionCssVar(factionSlug, "card-bg")
    : "var(--color-bg-page)";

  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontSize: 7,
        padding: "1px 6px",
        borderRadius: 6,
        textTransform: "uppercase",
        fontFamily: "'Courier Prime', monospace",
        letterSpacing: "0.08em",
      }}
    >
      {t("level.short", { level })}
    </span>
  );
}
