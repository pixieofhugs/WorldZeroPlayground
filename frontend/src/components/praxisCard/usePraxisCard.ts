/**
 * Praxis-card moderation state shared by every archetype: an optimistic local
 * copy, admin-control visibility, hide/fail handlers, assembled
 * {@link AdminProps}. Voting is not here: `<VoteUI>` self-manages (#587 §2).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PraxisCardOut } from "../../api/praxis";
import { useAuth } from "../../auth/AuthContext";
import { useAdminMode } from "../../auth/AdminModeContext";
import { extractError } from "../../utils/errors";
import type { AdminProps } from "./shared";

interface PraxisCardModeration {
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

  // Typed off the card, not a hand-copied union (one drifted until #1400).
  const applyModeration = (status: PraxisCardOut["moderation_status"]) => {
    setLocalPraxis((prev) => ({ ...prev, moderation_status: status }));
  };

  // Lazy import (#1141): keeps the admin chunk off every reader's page.
  const moderate = async (status: "hidden" | "failed") => {
    const { moderatePraxis } = await import("../../api/admin");
    return moderatePraxis(localPraxis.id, status);
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModerateError(null);
    try {
      const updated = await moderate("hidden");
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
      const updated = await moderate("failed");
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
