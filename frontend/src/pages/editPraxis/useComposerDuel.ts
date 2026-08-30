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
 *
 * It borrowed the assembler's `setPraxis` and `setError` until #2879. It no
 * longer does: the praxis and the composer's error line are not this pane's
 * state, so an action that changes either one *reports* it as a `DuelOutcome`
 * and `useEditPraxis` writes what it owns. That is what lets the pane be driven
 * on its own — see `__tests__/composerDuelStandsAlone.test.tsx`.
 *
 * `askConfirm` stays injected, which is not the same borrowing: it is a
 * collaborator that raises a dialog somebody else draws and answers, not a
 * setter for state this hook is describing.
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

/**
 * What a duel action leaves for the composer around this pane to apply.
 *
 * `unchanged` means nothing was attempted — there was no duel to end, or the
 * player answered no to the dissolve — so the error line must be left exactly
 * as it was found.
 */
export type DuelOutcome =
  | { kind: "unchanged" }
  | { kind: "cancelled"; praxis: PraxisOut }
  | { kind: "failed"; message: string };

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
  /** Ends a pending challenge. The caller applies the outcome. */
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

  // Dissolve an *active* duel (#956). Same neutral cancel as `cancelDuel`, but
  // gated behind a confirm because it ends an accepted duel for both sides.
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
