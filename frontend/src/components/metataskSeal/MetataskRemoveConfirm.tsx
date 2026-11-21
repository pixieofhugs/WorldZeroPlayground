/**
 * Section-E peel-off confirm (#933) — the light "are you sure" between a seal's
 * `×` and removing the metatask. Mounted once from the EditPraxis dispatcher;
 * the target faction/points come from `metataskRemovalTarget`.
 */
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../confirm/ConfirmDialog";
import { factionName } from "../../utils/factions";
import type { EditPraxisState } from "../../pages/editPraxis/useEditPraxis";

export default function MetataskRemoveConfirm({
  metataskRemovalTarget: target,
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
  if (!target) return null;

  return (
    <ConfirmDialog
      request={{
        kind: "metatask-remove",
        title: t("editPraxis.attach.removeTitle"),
        body: t("editPraxis.attach.removeBody", {
          faction: factionName(target.metatask_faction_slug),
          points: target.point_value,
        }),
        confirmLabel: t("editPraxis.attach.removeConfirm"),
        danger: true,
      }}
      factionSlug={target.metatask_faction_slug}
      onConfirm={() => void confirmRemoveMetatask()}
      onDismiss={cancelRemoveMetatask}
      confirmDisabled={applyingMetatask === target.id}
    />
  );
}
