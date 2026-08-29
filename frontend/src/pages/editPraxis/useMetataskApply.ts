/**
 * Sealing metatasks onto a praxis (#933) — the applied stack, the Section-D
 * picker, and the Section-E peel-off.
 *
 * Note the two halves this deliberately does NOT merge. The *catalogue* of
 * seals a viewer may apply is a load keyed on the viewer
 * (`eligible_for_current_user`), and it stays with the composer's other loads;
 * what lives here is the *applied* set, which is keyed on the praxis and
 * changes only when the player seals or peels one. `addMetatask` takes the
 * whole `TaskOut` row, so this side never needs the catalogue to do its work.
 *
 * Split out of `useEditPraxis.ts` (#1392); behaviour unchanged.
 */
import { useCallback, useMemo, useState } from "react";
import { applyMetatask, removeMetatask, type PraxisOut } from "../../api/praxis";
import type { TaskOut } from "../../api/tasks";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

export interface MetataskApply {
  appliedMetatasks: Set<number>;
  appliedMetataskList: TaskOut[];
  applyingMetatask: number | null;
  addMetatask: (mt: TaskOut) => Promise<void>;
  metataskPickerOpen: boolean;
  openMetataskPicker: () => void;
  closeMetataskPicker: () => void;
  metataskRemovalTarget: TaskOut | null;
  requestRemoveMetatask: (taskId: number) => void;
  confirmRemoveMetatask: () => Promise<void>;
  cancelRemoveMetatask: () => void;
  /**
   * Seed the stack from the persisted seals on a freshly loaded praxis, so a
   * reloaded draft shows what is already sealed (the picker's "already sealed"
   * check reads this).
   */
  seedApplied: (applied: TaskOut[]) => void;
}

/**
 * Both mutations answer with the re-scored praxis, so both paths below
 * write it back through `setPraxis` (#2464). The seal stack alone is not the
 * whole state a seal changes: the composer's score stamp reads `praxis.score`
 * and `praxis.metatask_points`, and leaving those at whatever the initial load
 * returned is why sealing a +100 metatask onto a task worth 10 kept printing
 * 10. Not a refetch — the server already sent the number (#1382 / #2402).
 */
export function useMetataskApply(options: {
  praxis: PraxisOut | null;
  setPraxis: (praxis: PraxisOut) => void;
  setError: (message: string) => void;
}): MetataskApply {
  const { praxis, setPraxis, setError } = options;
  // The applied metatasks as full rows (source of truth for the seal stack);
  // `appliedMetatasks` (the id Set) is derived from it below.
  const [appliedMetataskList, setAppliedMetataskList] = useState<TaskOut[]>([]);
  const appliedMetatasks = useMemo(
    () => new Set(appliedMetataskList.map((mt) => mt.id)),
    [appliedMetataskList],
  );
  const [applyingMetatask, setApplyingMetatask] = useState<number | null>(null);
  const [metataskPickerOpen, setMetataskPickerOpen] = useState(false);
  const [metataskRemovalTarget, setMetataskRemovalTarget] =
    useState<TaskOut | null>(null);

  // Section D: the picker seals one metatask at a time, then closes.
  const addMetatask = useCallback(
    async (mt: TaskOut) => {
      if (!praxis || applyingMetatask !== null) return;
      if (appliedMetatasks.has(mt.id)) {
        setMetataskPickerOpen(false);
        return;
      }
      setApplyingMetatask(mt.id);
      setError("");
      try {
        setPraxis(await applyMetatask(praxis.id, mt.id));
        setAppliedMetataskList((previous) => [...previous, mt]);
        setMetataskPickerOpen(false);
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.updateMetatask")),
        );
      } finally {
        setApplyingMetatask(null);
      }
    },
    [praxis, setPraxis, applyingMetatask, appliedMetatasks, setError],
  );

  // Section E: the seal's × asks first — open the confirm for that metatask.
  const requestRemoveMetatask = useCallback(
    (taskId: number) => {
      setMetataskRemovalTarget(
        appliedMetataskList.find((mt) => mt.id === taskId) ?? null,
      );
    },
    [appliedMetataskList],
  );

  const cancelRemoveMetatask = useCallback(
    () => setMetataskRemovalTarget(null),
    [],
  );

  const confirmRemoveMetatask = useCallback(async () => {
    const target = metataskRemovalTarget;
    if (!praxis || !target) return;
    setApplyingMetatask(target.id);
    setError("");
    try {
      setPraxis(await removeMetatask(praxis.id, target.id));
      setAppliedMetataskList((previous) =>
        previous.filter((mt) => mt.id !== target.id),
      );
      setMetataskRemovalTarget(null);
    } catch (err) {
      setError(
        extractError(err, i18n.t("forms:editPraxis.errors.updateMetatask")),
      );
    } finally {
      setApplyingMetatask(null);
    }
  }, [praxis, setPraxis, metataskRemovalTarget, setError]);

  // Clear first: the picker now prints `error` itself (#2382), and the composer
  // shares one error slot, so a failure from publish or a duel would otherwise
  // greet the author the moment the sheet opens.
  const openMetataskPicker = useCallback(() => {
    setError("");
    setMetataskPickerOpen(true);
  }, [setError]);
  const closeMetataskPicker = useCallback(
    () => setMetataskPickerOpen(false),
    [],
  );

  return {
    appliedMetatasks,
    appliedMetataskList,
    applyingMetatask,
    addMetatask,
    metataskPickerOpen,
    openMetataskPicker,
    closeMetataskPicker,
    metataskRemovalTarget,
    requestRemoveMetatask,
    confirmRemoveMetatask,
    cancelRemoveMetatask,
    seedApplied: setAppliedMetataskList,
  };
}
