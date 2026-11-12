import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar, isKnownFaction } from "../../utils/factions";

/**
 * Level gem: a 45° outlined square with the numeral and a mandatory caption
 * (#728). Outlined so the numeral takes the surface's own ink (`currentColor`,
 * #1932), never the hue, which fails contrast; stroke and glow keep the hue.
 *
 * Unaffiliated/unknown slugs get the rainbow (ADR-0039), via `isKnownFaction`
 * so they never hit factionCssVar's `ua` default. Shape lives in `.level-gem*`.
 */
export default function LevelGem({
  level,
  factionSlug,
  size = 24,
}: {
  level: number;
  factionSlug?: string | null;
  /** Overall box in px. ~24 reads at task-card scale, ~34 at roster scale. */
  size?: number;
}) {
  const { t } = useTranslation("common");
  const known = isKnownFaction(factionSlug);

  const vars = {
    "--gem-size": `${size}px`,
    "--gem-stroke": known
      ? factionCssVar(factionSlug)
      : "var(--faction-default-rainbow)",
    "--gem-ink": known ? "currentColor" : "transparent",
    "--gem-glow": known ? factionCssVar(factionSlug) : "var(--glow-neutral)",
  } as CSSProperties;

  return (
    <span className="level-gem" style={vars}>
      <span className="level-gem-box">
        <span className="level-gem-shape" aria-hidden />
        <span
          className={
            known
              ? "level-gem-number"
              : "level-gem-number level-gem-number-rainbow"
          }
        >
          {level}
        </span>
      </span>
      <span className="level-gem-caption">{t("level.caption")}</span>
    </span>
  );
}
