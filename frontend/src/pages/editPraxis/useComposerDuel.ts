/**
 * The duel a praxis may be one side of (#311, #718, #956).
 *
 * A duel is never a praxis *type*: the praxis stays `solo` and gains a
 * `duel_id` (ADR-0011), so the composer holds three pieces of state around it —
 * whether the challenge pane is open, the duel detail itself, and whether the
 * seal dialog is up — and they change together.
 *
 * Split out of `useEditPraxis.ts` (#1392). The mode picker still owns the flip
 * into duel mode, which is why the pane and the detail setters are handed back:
 * `changeMode` opens the pane, and clears both when the player picks solo or
 * collab instead.
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

interface ComposerDuel {
  duel: DuelDetailOut | null;
  setDuel: (duel: DuelDetailOut | null) => void;
  /** The challenge pane is open: the search box is picking an opponent. */
  duelPaneOpen: boolean;
  setDuelPaneOpen: (open: boolean) => void;
  duelSealOpen: boolean;
  setDuelSealOpen: (open: boolean) => void;
  requestDuelSeal: () => void;
  cancelDuelSeal: () => void;
  cancelDuel: () => Promise<void>;
  dissolveDuel: () => Promise<void>;
}

export function useComposerDuel(options: {
  praxis: PraxisOut | null;
  setPraxis: (praxis: PraxisOut) => void;
  askConfirm: (request: ConfirmRequest) => Promise<boolean>;
  setError: (message: string) => void;
}): ComposerDuel {
  const { praxis, setPraxis, askConfirm, setError } = options;

  const [duelPaneOpen, setDuelPaneOpen] = useState(false);
  const [duel, setDuel] = useState<DuelDetailOut | null>(null);
  // Seal confirmation (#718) — opened by PublishButton in duel mode.
  const [duelSealOpen, setDuelSealOpen] = useState(false);

  // ---- Duel detail (opponent chip + status) whenever this praxis is a duel side ----
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

  const cancelDuel = useCallback(async () => {
    if (!praxis?.duel_id) return;
    setError("");
    try {
      await cancelChallenge(praxis.duel_id);
      const refreshed = await getPraxis(praxis.id);
      setPraxis(refreshed);
      setDuel(null);
      setDuelPaneOpen(false);
    } catch (err) {
      setError(
        extractError(err, i18n.t("forms:editPraxis.errors.cancelChallenge")),
      );
    }
  }, [praxis, setPraxis, setError]);

  // Dissolve an *active* duel (#956). Same neutral cancel as `cancelDuel`, but
  // gated behind a confirm because it ends an accepted duel for both sides.
  const dissolveDuel = useCallback(async () => {
    if (!praxis?.duel_id) return;
    if (!(await askConfirm(dissolveDuelConfirm()))) return;
    await cancelDuel();
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
