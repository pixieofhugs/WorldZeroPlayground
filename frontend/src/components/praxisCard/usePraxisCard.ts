/**
 * usePraxisCard — the praxis-card moderation state shared by every archetype.
 *
 * Holds the optimistic local copy of the praxis (so a hide/fail reflects
 * immediately without a refetch), the admin-control visibility, and the
 * moderate handlers. Returns the live praxis plus the assembled
 * {@link AdminProps} every archetype forwards to <AdminOverlay>. Behaviour is
 * lifted 1:1 from the original PraxisCard switcher component.
 *
 * Voting is deliberately NOT owned here: the PraxisVoteFooter slot renders
 * <VoteUI>, whose per-faction variants self-manage casting through useVote /
 * castVote. A vote handler on this hook would be dead code (#587 §2).
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

  // Read off the card rather than restated by hand: the wire enum always had
  // five members and the frontend's copy of it was short one until #1400. A
  // union copied by hand is how that discrepancy survives, silently, in a file
  // that has no opinion about moderation states.
  const applyModeration = (status: PraxisCardOut["moderation_status"]) => {
    setLocalPraxis((prev) => ({ ...prev, moderation_status: status }));
  };

  // `api/admin` is loaded per action rather than at module scope (#1141). A
  // praxis card renders for every visitor, so a static import shipped the admin
  // chunk to readers who can never reach these two handlers.
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
