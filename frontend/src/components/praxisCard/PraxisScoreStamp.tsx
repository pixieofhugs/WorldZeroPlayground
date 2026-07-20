import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { PraxisCardOut } from "../../api/praxis";
import { TaskCrown } from "../cards/TaskCrown";

/**
 * The shared conditional score stamp (ADR-0047). One selector decides which
 * rows a card shows; two presentations render those rows the same way:
 *
 *   • {@link PraxisScoreStamp} — the desktop corner stamp.
 *   • {@link PraxisScoreStrip} — the mobile horizontal `BASE | MULT | VOTES | TOT`
 *     strip (the MULT / META cells collapse out when their row is hidden).
 *
 * Both read the #819 breakdown fields off `PraxisCardOut` and never derive
 * vote-points by subtraction (the old Merit assumption in `PraxisScoreHero`).
 * This is the pattern #821 rolls to every faction skin, so the visual is driven
 * entirely by themeable CSS-var props — no hardcoded hue.
 */

export interface ScoreBreakdown {
  base: number;
  /** The display multiplier, or null when the mult row is hidden (collab / ×1.0). */
  mult: number | null;
  /** Metatask points, or null when the meta row is hidden (`≤ 0`). */
  meta: number | null;
  votes: number;
  total: number;
}

/**
 * Resolve the rows a stamp should show (ADR-0047):
 *  - mult row only when `display_multiplier != null && !== 1.0`
 *  - meta row only when `metatask_points > 0`
 *  - votes row always (`+0` is valid)
 *  - total to 1 decimal at the render sites
 */
export function scoreBreakdown(praxis: PraxisCardOut): ScoreBreakdown {
  const rawMult = praxis.display_multiplier;
  const showMult = rawMult != null && rawMult !== 1;
  const rawMeta = praxis.metatask_points ?? 0;
  return {
    base: praxis.base_points ?? 0,
    mult: showMult ? rawMult : null,
    meta: rawMeta > 0 ? rawMeta : null,
    votes: praxis.points_from_votes ?? 0,
    total: praxis.total ?? 0,
  };
}

/** `×0.80` — two decimals, matching the ADR-0047 sample. */
function formatMult(mult: number): string {
  return `×${mult.toFixed(2)}`;
}

// ─── Desktop — corner stamp ─────────────────────────────────────────────────

export interface ScoreStampTheme {
  /** Primary numerals / total. */
  color?: string;
  /** Stamp border + accent. */
  border?: string;
  /** Row labels / secondary text. */
  muted?: string;
  /** The card's paper colour — inner disc of the Task Crown (ADR-0028). */
  paper?: string;
}

/** One `label  value` line inside the desktop stamp. */
function StampRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: string;
}) {
  return (
    <span
      className="font-body"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "var(--space-md)",
        fontSize: "var(--text-xs)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75, color: muted }}>
        {label}
      </span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  );
}

/**
 * The desktop corner stamp — a bordered, slightly-tilted plate laying out the
 * conditional rows, then the computed total to 1 decimal. Supersedes the content
 * of `PraxisScoreHero` (which derived votes by subtraction). Keeps the Task Crown
 * (ADR-0028). Renders nothing when the breakdown total is absent.
 */
export function PraxisScoreStamp({
  praxis,
  theme = {},
  showCrown,
}: {
  praxis: PraxisCardOut;
  theme?: ScoreStampTheme;
  /** Set false when the surface renders its own TaskCrown (the faction pages). */
  showCrown?: boolean;
}) {
  const { t } = useTranslation("praxis");
  if (praxis.total === null || praxis.total === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const crowned = praxis.is_top_for_task && showCrown !== false;
  const border = theme.border ?? "currentColor";
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        gap: "var(--space-xs)",
        flexShrink: 0,
        minWidth: 96,
        padding: "var(--space-sm) var(--space-md)",
        border: `2px solid ${border}`,
        borderRadius: 4,
        transform: "rotate(-3deg)",
        color: theme.color ?? "inherit",
        lineHeight: 1.1,
      }}
    >
      {crowned && (
        <TaskCrown
          size={26}
          ringInset={3}
          innerBg={theme.paper}
          glyphColor={theme.color ?? "currentColor"}
          rotate="8deg"
          style={{ position: "absolute", top: -13, right: -12, zIndex: 3 }}
        />
      )}
      <StampRow label={t("card.stamp.base")} value={String(base)} muted={theme.muted} />
      {mult !== null && (
        <StampRow label={t("card.stamp.mult")} value={formatMult(mult)} muted={theme.muted} />
      )}
      {meta !== null && (
        <StampRow label={t("card.stamp.meta")} value={`+${meta}`} muted={theme.muted} />
      )}
      <StampRow label={t("card.stamp.votes")} value={`+${votes}`} muted={theme.muted} />
      <span
        style={{
          marginTop: "var(--space-xs)",
          paddingTop: "var(--space-xs)",
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "var(--space-md)",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-xs)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.8,
            color: theme.muted,
          }}
        >
          {t("card.stamp.total")}
        </span>
        <span className="font-display" style={{ fontWeight: 800, fontSize: "var(--text-content)", whiteSpace: "nowrap" }}>
          {total.toFixed(1)}
        </span>
      </span>
    </div>
  );
}

// ─── Mobile — horizontal strip ──────────────────────────────────────────────

export interface ScoreStripTheme {
  ink: string;
  muted: string;
  accent: string;
}

/** One cell in the mobile strip: value over a tiny uppercase label. */
function StripCell({
  label,
  value,
  color,
  labelColor,
  emphasis,
}: {
  label: string;
  value: string;
  color: string;
  labelColor: string;
  emphasis?: boolean;
}) {
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-xs)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        className="font-display"
        style={{
          fontSize: emphasis ? "var(--text-xl)" : "var(--text-content)",
          fontWeight: emphasis ? 800 : 700,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "var(--text-xs)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * The mobile horizontal strip — `BASE | MULT | META | VOTES | TOT`. The MULT and
 * META cells collapse out (are not rendered) when their row is hidden, so the
 * common case reads exactly the ADR-0047 `BASE | MULT | VOTES | TOT`. Same
 * conditional rules as the desktop stamp, driven by the same selector.
 */
export function PraxisScoreStrip({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut;
  theme: ScoreStripTheme;
}) {
  const { t } = useTranslation("praxis");
  if (praxis.total === null || praxis.total === undefined) return null;
  const { base, mult, meta, votes, total } = scoreBreakdown(praxis);
  const divider: CSSProperties = {
    width: 1,
    alignSelf: "stretch",
    background: `color-mix(in srgb, ${theme.accent} 30%, transparent)`,
  };
  const cells = [
    <StripCell key="base" label={t("card.stamp.base")} value={String(base)} color={theme.ink} labelColor={theme.muted} />,
  ];
  if (mult !== null) {
    cells.push(
      <StripCell key="mult" label={t("card.stamp.mult")} value={formatMult(mult)} color={theme.ink} labelColor={theme.muted} />,
    );
  }
  if (meta !== null) {
    cells.push(
      <StripCell key="meta" label={t("card.stamp.meta")} value={`+${meta}`} color={theme.ink} labelColor={theme.muted} />,
    );
  }
  cells.push(
    <StripCell key="votes" label={t("card.stamp.votes")} value={`+${votes}`} color={theme.ink} labelColor={theme.muted} />,
    <StripCell
      key="tot"
      label={t("card.stamp.totalShort")}
      value={total.toFixed(1)}
      color={theme.accent}
      labelColor={theme.muted}
      emphasis
    />,
  );
  // Interleave dividers between cells.
  const withDividers = cells.flatMap((cell, index) =>
    index === 0 ? [cell] : [<span key={`d${index}`} aria-hidden style={divider} />, cell],
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-md)",
        borderRadius: 6,
        border: `1px solid color-mix(in srgb, ${theme.accent} 30%, transparent)`,
      }}
    >
      {withDividers}
    </div>
  );
}
