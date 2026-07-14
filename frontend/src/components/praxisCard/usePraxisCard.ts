/**
 * usePraxisCard — the praxis-card moderation state shared by every archetype.
 *
 * Holds the optimistic local copy of the praxis (so a hide/fail reflects
 * immediately without a refetch), the admin-control visibility, and the
 * moderate handlers. Returns the live praxis plus the assembled
 * {@link AdminProps} every archetype forwards to <AdminOverlay>. Behaviour is
 * lifted 1:1 from the original PraxisCard switcher component.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PraxisCardOut } from "../../api/praxis";
import { useAuth } from "../../auth/AuthContext";
import { useAdminMode } from "../../auth/AdminModeContext";
import { moderatePraxis } from "../../api/admin";
import { extractError } from "../../utils/errors";
import type { AdminProps } from "./shared";

export interface PraxisCardModeration {
  localPraxis: PraxisCardOut;
  adminProps: AdminProps;
}

export function usePraxisCard(
  praxis: PraxisCardOut,
  onModerated?: () => void,
): PraxisCardModeration {
  const { t } = useTranslation("praxis");
  const { user } = useAuth();
  const { adminMode } = useAdminMode();
  const showAdminControls = (user?.is_admin && adminMode) ?? false;
  const [localPraxis, setLocalPraxis] = useState(praxis);
  const [moderateError, setModerateError] = useState<string | null>(null);

  const applyModeration = (
    status: "hidden" | "failed" | "visible" | "flagged",
  ) => {
    setLocalPraxis((prev) => ({ ...prev, moderation_status: status }));
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModerateError(null);
    try {
      const updated = await moderatePraxis(localPraxis.id, "hidden");
      applyModeration(updated.moderation_status);
      onModerated?.();
    } catch (err) {
      setModerateError(extractError(err, t("card.errors.hide")));
    }
  };

  const handleFail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModerateError(null);
    try {
      const updated = await moderatePraxis(localPraxis.id, "failed");
      applyModeration(updated.moderation_status);
      onModerated?.();
    } catch (err) {
      setModerateError(extractError(err, t("card.errors.fail")));
    }
  };

  return {
    localPraxis,
    adminProps: {
      praxis: localPraxis,
      showAdminControls,
      onHide: handleHide,
      onFail: handleFail,
      moderateError,
    },
  };
}
