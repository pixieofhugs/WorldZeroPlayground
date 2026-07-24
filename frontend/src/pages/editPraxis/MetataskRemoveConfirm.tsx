/**
 * Section-E peel-off confirm (#933) — the light "are you sure" between a seal's
 * `×` and actually removing the metatask.
 *
 * Removing a seal is always allowed pre-submit, so this is a gentle guard, not a
 * consequence dialog like the duel seal. Desktop gets a small centred card;
 * mobile gets a bottom confirm sheet (`useFormFactor()`). Confirming calls
 * `state.confirmRemoveMetatask()` (→ `removeMetatask`), returning the praxis to
 * the empty-slot "+ Add" state.
 *
 * Mounted once from the EditPraxis dispatcher, so every composer surface shares
 * it. The target faction/points come from `state.metataskRemovalTarget`.
 */
import { useTranslation } from "react-i18next";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionName } from "../../utils/factions";
import type { EditPraxisState } from "./useEditPraxis";

export default function MetataskRemoveConfirm({
  state,
}: {
  state: EditPraxisState;
}) {
  const { t } = useTranslation("forms");
  const isMobile = useFormFactor() === "mobile";
  const target = state.metataskRemovalTarget;
  if (!target) return null;

  const faction = factionName(target.metatask_faction_slug);
  const busy = state.applyingMetatask === target.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("editPraxis.seal.removeTitle")}
      className={`fixed inset-0 z-50 flex justify-center ${
        isMobile ? "items-end" : "items-center"
      }`}
      style={{
        padding: isMobile ? 0 : "var(--space-lg)",
        background: "radial-gradient(circle, rgba(0,0,0,0.45), rgba(0,0,0,0.65))",
      }}
    >
      <div
        className="flex flex-col"
        style={{
          gap: "var(--space-md)",
          padding: "var(--space-lg)",
          width: isMobile ? "100%" : "min(400px, 100%)",
          background: "var(--color-bg-page)",
          border: isMobile ? "none" : "1px solid var(--color-border)",
          borderRadius: isMobile ? "16px 16px 0 0" : 12,
          boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
        }}
      >
        <h2
          className="font-display"
          style={{
            fontSize: "var(--text-content)",
            color: "var(--color-text-primary)",
          }}
        >
          {t("editPraxis.seal.removeTitle")}
        </h2>
        <p
          className="font-body"
          style={{
            fontSize: "var(--text-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          {t("editPraxis.seal.removeBody", {
            faction,
            points: target.point_value,
          })}
        </p>
        <div
          className="flex items-center"
          style={{ gap: "var(--space-sm)", marginLeft: "auto" }}
        >
          <button
            type="button"
            onClick={state.cancelRemoveMetatask}
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              padding: "var(--space-sm) var(--space-md)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {t("editPraxis.seal.removeCancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void state.confirmRemoveMetatask()}
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              padding: "var(--space-sm) var(--space-lg)",
              background: "var(--color-danger)",
              color: "var(--color-bg-page)",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {t("editPraxis.seal.removeConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
