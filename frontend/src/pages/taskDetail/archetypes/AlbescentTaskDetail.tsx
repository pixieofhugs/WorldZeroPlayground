import { useTranslation } from "react-i18next";
import DefaultTaskDetail from "./DefaultTaskDetail";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { showWorthBreakdown } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Albescent task detail (#1038, ADR-0048): NOT a ninth skin. Renders the exact
 * {@link DefaultTaskDetail} and washes light over it; strip the overlays and the
 * worth slot and the page is Default byte for byte.
 *
 * No faction words: copy is inherited whole (ADR-0057). A per-faction word
 * un-hides a society whose premise is looking unaffiliated (ADR-0027).
 *
 * The ground is a token: `.alb-prism` sets `--faction-default-card-sheet`
 * (#2499), so every sheet inside is washed exactly once. The remaining ornament
 * blends over the opaque sheet via `sheetOverlay`, `pointer-events: none`.
 *
 * The one structural delta is the prism-ring worth readout (`worthSlot`), built
 * from the same `state`; its base/`×mult` row uses the shared gate
 * `showWorthBreakdown` (ADR-0055, #1704).
 *
 * index.css owns every class, both themes and the reduced-motion guard (#911).
 */
export default function AlbescentTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  const { task, basePoints, factionMultiplier, modifiedPoints } = state;

  // So the ornament never renders around an empty page.
  if (!task) return null;

  const showBreakdown = showWorthBreakdown(factionMultiplier);
  const ringSize = desktop ? 92 : 74;

  const worth = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      {showBreakdown && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "var(--space-sm)",
            flexWrap: "wrap",
          }}
        >
          <span className="label-caption">{t("detail.points.base")}</span>
          <span
            style={{
              fontFamily: "var(--font-accent)",
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              lineHeight: 1,
              color: "var(--faction-default-card-text)",
            }}
          >
            {basePoints}
          </span>
          <span
            className="font-display"
            style={{
              fontWeight: 600,
              fontSize: "var(--text-lg)",
              lineHeight: 1,
              color: "var(--faction-default-chip-text)",
              background: "var(--faction-default-chip)",
              borderRadius: 5,
              padding: "var(--space-xs) var(--space-sm)",
              whiteSpace: "nowrap",
            }}
          >
            {t("detail.points.multiplier", {
              multiplier: factionMultiplier.toFixed(2),
            })}
          </span>
        </div>
      )}
      <span
        className="alb-detail-ring"
        style={{ width: ringSize, height: ringSize }}
      >
        <span className="alb-detail-ring-face">
          <span
            style={{
              fontFamily: "var(--font-accent)",
              fontSize: desktop ? "var(--text-heading)" : "var(--text-title)",
              lineHeight: 1,
              color: "var(--faction-default-card-text)",
            }}
          >
            {modifiedPoints}
          </span>
          <span
            className="label-caption"
            style={{
              marginTop: "var(--space-xs)",
              color: "var(--faction-default-gold)",
              // Shout is CSS, not copy (#2598); inline to beat `.label-caption`.
              textTransform: "uppercase",
            }}
          >
            {t("detail.points.total", { count: modifiedPoints })}
          </span>
        </span>
      </span>
    </div>
  );

  /* Via `sheetOverlay` the sheet is their containing block, so they trace it
     rather than the band that also holds the Breadcrumb (#2549). */
  const light = (
    <>
      <span aria-hidden="true" className="alb-detail-foil" />
      <span aria-hidden="true" className="alb-detail-edge" />
    </>
  );

  return (
    <div className="alb-detail alb-moves alb-prism">
      <DefaultTaskDetail state={state} worthSlot={worth} sheetOverlay={light} />
    </div>
  );
}
