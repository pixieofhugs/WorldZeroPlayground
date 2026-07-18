import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar, isKnownFaction } from "../../utils/factions";

/**
 * Level gem — a 45°-rotated outlined square with the bare level numeral inside
 * and a small muted "LVL" caption under it (issue #728). Replaces the old
 * "LVL 6" pill everywhere.
 *
 * Outlined rather than filled on purpose: the numeral sits on the surface the
 * gem lands on instead of a saturated faction fill, which keeps it legible on
 * every card archetype without per-faction contrast tuning.
 *
 * An unaffiliated / unknown slug gets the rainbow stroke and numeral (ADR-0039,
 * #636) — the outline frames the spectrum. It never falls back to grey, and it
 * must not fall through to factionCssVar's silent `ua` default, hence the
 * isKnownFaction branch.
 *
 * The caption is mandatory and has no opt-out: the gem now appears on task
 * cards that carry no "level" column header, so the word is what makes the
 * number self-explanatory.
 *
 * All the shape lives in the .level-gem* classes in index.css; this component
 * only chooses the four paint/size custom properties.
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
    "--gem-ink": known ? factionCssVar(factionSlug) : "transparent",
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
