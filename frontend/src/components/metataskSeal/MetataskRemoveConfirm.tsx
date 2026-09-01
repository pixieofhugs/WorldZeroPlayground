/**
 * Section-E peel-off confirm (#933) — the light "are you sure" between a seal's
 * `×` and actually removing the metatask.
 *
 * Removing a seal is always allowed pre-submit, so this is a gentle guard, not a
 * consequence dialog like the duel seal. Desktop gets a small centred card;
 * mobile gets a bottom confirm sheet (`useFormFactor()`). Confirming calls
 * `confirmRemoveMetatask()` (→ `removeMetatask`), returning the praxis to
 * the empty-slot "+ Add" state.
 *
 * Mounted once from the EditPraxis dispatcher, so every composer surface shares
 * it. The target faction/points come from `metataskRemovalTarget`.
 */
import { useTranslation } from "react-i18next";
import { drawAtRoot } from "../ui/drawAtRoot";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionName } from "../../utils/factions";
import type { EditPraxisState } from "../../pages/editPraxis/useEditPraxis";

export default function MetataskRemoveConfirm({
  metataskRemovalTarget,
  applyingMetatask,
  confirmRemoveMetatask,
  cancelRemoveMetatask,
}: Pick<
  EditPraxisState,
  | "metataskRemovalTarget"
  | "applyingMetatask"
  | "confirmRemoveMetatask"
  | "cancelRemoveMetatask"
>) {
  const { t } = useTranslation("forms");
  const isMobile = useFormFactor() === "mobile";
  const target = metataskRemovalTarget;
  if (!target) return null;

  const faction = factionName(target.metatask_faction_slug);
  const busy = applyingMetatask === target.id;

  // Drawn at the root (#2244): a bottom sheet under a fixed tab bar is a sheet
  // whose confirm button cannot be pressed. See `drawAtRoot`.
  return drawAtRoot(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("editPraxis.attach.removeTitle")}
      className={`fixed inset-0 z-50 flex justify-center ${
        isMobile ? "items-end" : "items-center"
      }`}
      style={{
        padding: isMobile ? 0 : "var(--space-lg)",
        background: "var(--color-overlay-strong)",
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
          boxShadow: "0 8px 28px var(--color-cast-shadow)",
        }}
      >
        <h2
          className="font-display"
          style={{
            fontSize: "var(--text-content)",
            color: "var(--color-text-primary)",
          }}
        >
          {t("editPraxis.attach.removeTitle")}
        </h2>
        <p
          className="font-body"
          style={{
            fontSize: "var(--text-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          {t("editPraxis.attach.removeBody", {
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
            onClick={cancelRemoveMetatask}
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
            {t("editPraxis.attach.removeCancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirmRemoveMetatask()}
            className="font-body"
            style={{
              fontSize: "var(--text-md)",
              padding: "var(--space-sm) var(--space-lg)",
              background: "var(--color-danger)",
              color: "var(--color-on-danger)",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {t("editPraxis.attach.removeConfirm")}
          </button>
        </div>
      </div>
    </div>,
  );
}
