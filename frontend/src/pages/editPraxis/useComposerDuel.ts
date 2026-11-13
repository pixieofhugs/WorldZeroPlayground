/**
 * The duel a praxis may be one side of (#311, #718, #956). A duel isn't a
 * praxis type: the praxis stays `solo` with a `duel_id` (ADR-0011).
 *
 * Setters are returned because `changeMode` opens/clears the pane. Actions
 * touching the praxis or error line return a `DuelOutcome` for `useEditPraxis`
 * to apply (#2879; `__tests__/composerDuelStandsAlone.test.tsx`).
 */
import { useCallback, useEffect, useState } from "react";
import { getPraxis, type PraxisOut } from "../../api/praxis";
import {
  cancelChallenge,
  getDuelDetail,
  type DuelDetailOut,
} from "../../api/duel";
import { dissolveDuelConfirm } from "../../components/confirm/composerConfirms";
import type { ConfirmRequest } from "../../components/confirm/composerConfirms";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/** `unchanged`: nothing attempted (no duel, or confirm declined) — leave the error line be. */
export type DuelOutcome =
  | { kind: "unchanged" }
  | { kind: "cancelled"; praxis: PraxisOut }
  | { kind: "failed"; message: string };

interface ComposerDuel {
  duel: DuelDetailOut | null;
  setDuel: (duel: DuelDetailOut | null) => void;
  duelPaneOpen: boolean;
  setDuelPaneOpen: (open: boolean) => void;
  duelSealOpen: boolean;
  setDuelSealOpen: (open: boolean) => void;
  requestDuelSeal: () => void;
  cancelDuelSeal: () => void;
  cancelDuel: () => Promise<DuelOutcome>;
  dissolveDuel: () => Promise<DuelOutcome>;
}

export function useComposerDuel(options: {
  praxis: PraxisOut | null;
  askConfirm: (request: ConfirmRequest) => Promise<boolean>;
}): ComposerDuel {
  const { praxis, askConfirm } = options;

  const [duelPaneOpen, setDuelPaneOpen] = useState(false);
  const [duel, setDuel] = useState<DuelDetailOut | null>(null);
  // Seal confirmation (#718), opened by PublishButton in duel mode.
  const [duelSealOpen, setDuelSealOpen] = useState(false);

  useEffect(() => {
    const duelId = praxis?.duel_id ?? null;
    if (duelId == null) {
      setDuel(null);
      return;
    }
    let cancelled = false;
    getDuelDetail(duelId)
      .then((d) => {
        if (!cancelled) setDuel(d);
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, [praxis?.duel_id]);

  const cancelDuel = useCallback(async (): Promise<DuelOutcome> => {
    if (!praxis?.duel_id) return { kind: "unchanged" };
    try {
      await cancelChallenge(praxis.duel_id);
      const refreshed = await getPraxis(praxis.id);
      setDuel(null);
      setDuelPaneOpen(false);
      return { kind: "cancelled", praxis: refreshed };
    } catch (err) {
      return {
        kind: "failed",
        message: extractError(
          err,
          i18n.t("forms:editPraxis.errors.cancelChallenge"),
        ),
      };
    }
  }, [praxis]);

  // Active duel (#956): confirm first, it ends it for both sides.
  const dissolveDuel = useCallback(async (): Promise<DuelOutcome> => {
    if (!praxis?.duel_id) return { kind: "unchanged" };
    if (!(await askConfirm(dissolveDuelConfirm()))) return { kind: "unchanged" };
    return await cancelDuel();
  }, [praxis?.duel_id, cancelDuel, askConfirm]);

  const requestDuelSeal = useCallback(() => setDuelSealOpen(true), []);
  const cancelDuelSeal = useCallback(() => setDuelSealOpen(false), []);

  return {
    duel,
    setDuel,
    duelPaneOpen,
    setDuelPaneOpen,
    duelSealOpen,
    setDuelSealOpen,
    requestDuelSeal,
    cancelDuelSeal,
    cancelDuel,
    dissolveDuel,
  };
}
