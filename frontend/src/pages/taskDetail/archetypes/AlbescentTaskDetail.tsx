import { useTranslation } from "react-i18next";
import DefaultTaskDetail from "./DefaultTaskDetail";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { showWorthBreakdown } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Albescent — the task detail's tell (#1038, ADR-0048). The THIRD Albescent
 * surface to unfreeze, and built to the same rule as the praxis card (#821) and
 * the task card (#1023): this is NOT a ninth skin. It renders the exact
 * {@link DefaultTaskDetail} an unaffiliated player sees and washes light over
 * it. Strip the three overlay spans and the worth slot and the page is `Default`
 * byte for byte, which is the property a hand-copied skin could never keep.
 *
 * The vendored design says so itself: *"Albescent's difference is the light, not
 * the layout."* Its anatomy is na's slot for slot; every delta is motion —
 * an aurora breathing under the sheet, a prism wheel turning behind it, a
 * diagonal sheen passing over, a spectrum edge that drifts, a worth ring that
 * turns once every 46s.
 *
 * ### The words are cut
 *
 * That design is the most heavily voiced file in the set — `Correspondence
 * №207`, `Albescent · in confidence`, `In hand`, `The Ask` / `in the hand of the
 * keeper`, `14 accounts inscribed`, `most witnessed`, `Acknowledge`, `withdraw`,
 * `Said quietly`, `Set something down, plainly…`. **Every one of those is gone.**
 * ADR-0057 makes this surface's copy shared and neutral, and ADR-0027 is the
 * sharper reason: a page announcing itself that loudly un-hides a society whose
 * entire premise is being indistinguishable from an unaffiliated player. A
 * per-faction WORD is as identifying as a per-faction hue (WORLD_ZERO_STYLE §3).
 * Albescent keeps the light and loses the words; the copy is inherited whole.
 *
 * The one number in that list outlived the words it travelled with: `№207` came
 * back neutrally as the inherited breadcrumb's `Task №{id}` crumb. #1124 retired
 * the task id from cards and this breadcrumb alike, so the trail this skin
 * inherits is a single `Tasks` crumb and the design's ordinal is gone in both
 * voices.
 *
 * ### Where the light sits
 *
 * THE GROUND IS IN THE SHEET (#2499, epic #2496 ruling 2). `.alb-detail-aurora`
 * was seven blooms blended over the column and `.alb-detail-foil`'s `::after` a
 * diagonal sweep passing across it; both retired. The prism sweep is that second
 * drawing, made static and moved into `--faction-default-card-sheet`, which
 * `DefaultTaskDetail` composes through `factionSheet()`. `.alb-prism` on this
 * wrapper is the whole of the change, and because it is a TOKEN it reaches every
 * sheet inside the page — the column, and the `AlbescentPraxisCard` thumbnails in
 * its gallery. Those thumbnails used to be washed TWICE on this one page (#1942's
 * trap); a token is set once per element, so they cannot be any more.
 *
 * WHAT IS LEFT SITS ON TOP. `DefaultTaskDetail` paints an OPAQUE sheet on its own
 * 1200 column, so an ornament layered behind it is invisible — that is not a
 * position an overlay can take. The prism wheel and the spectrum edge therefore
 * still blend over the sheet, `pointer-events: none`, at an opacity that leaves
 * ink legible. They are inset by `--space-2xl` top and bottom because that is the
 * column's own `py-8` band — the light is clipped to the detail COMPONENT, never
 * painted over the viewport (owner's ruling, QA on #1055/#1057/#1065).
 *
 * ### One structural delta
 *
 * The design replaces the base/total readout with a spinning prism ring. That is
 * arrangement, not data: `worthSlot` (see {@link DefaultTaskDetail}) takes the
 * node below, which is built from the SAME `state` forwarded to Default, so the
 * two can never disagree about what a task is worth. The `×mult` badge follows
 * the same rule as everywhere else — raw factor, hidden at 1.0 (ADR-0055) — and
 * so does the `base` row carrying it: this is the ONE piece of worth markup
 * Albescent owns rather than inherits, so it needs the shared gate by name
 * (`showWorthBreakdown`, #1704). Neutral, the ring stands alone above nothing.
 *
 * index.css owns every class here, both theme halves and the reduced-motion
 * guard; a component may not inject a stylesheet (#911). Stilled, the page is a
 * static wash and a static prism ring — nothing about it carries meaning through
 * motion alone.
 */
export default function AlbescentTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const desktop = useFormFactor() !== "mobile";
  const { task, basePoints, factionMultiplier, modifiedPoints } = state;

  // Guarded non-null by the dispatcher; mirrors Default so the ornament never
  // renders around an empty page.
  if (!task) return null;

  const showBreakdown = showWorthBreakdown(factionMultiplier);
  const ringSize = desktop ? 92 : 74;

  // The prism-ring worth readout — the design's one departure from na's anatomy.
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
            }}
          >
            {t("detail.points.total", { count: modifiedPoints })}
          </span>
        </span>
      </span>
    </div>
  );

  return (
    <div className="alb-detail alb-prism">
      <DefaultTaskDetail state={state} worthSlot={worth} />
      <span aria-hidden="true" className="alb-detail-foil" />
      <span aria-hidden="true" className="alb-detail-edge" />
    </div>
  );
}
