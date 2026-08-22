/**
 * Sealing metatasks onto a praxis (#933) — the applied stack, the Section-D
 * picker, and the Section-E peel-off.
 *
 * Note the two halves this deliberately does NOT merge. The *catalogue* of
 * seals a viewer may apply is a load keyed on the viewer
 * (`eligible_for_current_user`), and it stays with the composer's other loads;
 * what lives here is the *applied* set, which is keyed on the praxis and
 * changes only when the player seals or peels one. `addMetatask` and
 * `toggleMetatask` take the whole `TaskOut` row, so this side never needs the
 * catalogue to do its work.
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
  toggleMetatask: (mt: TaskOut) => Promise<void>;
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

export function useMetataskApply(
  praxis: PraxisOut | null,
  setError: (message: string) => void,
): MetataskApply {
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

  // Legacy toggle (apply when absent, remove when present) kept on the state
  // shape; the new compose flow adds through the picker and removes through the
  // confirm below. All three keep `appliedMetataskList` in sync.
  const toggleMetatask = useCallback(
    async (mt: TaskOut) => {
      if (!praxis) return;
      if (applyingMetatask !== null) return;
      setApplyingMetatask(mt.id);
      setError("");
      try {
        if (appliedMetatasks.has(mt.id)) {
          await removeMetatask(praxis.id, mt.id);
          setAppliedMetataskList((previous) =>
            previous.filter((m) => m.id !== mt.id),
          );
        } else {
          await applyMetatask(praxis.id, mt.id);
          setAppliedMetataskList((previous) => [...previous, mt]);
        }
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.updateMetatask")),
        );
      } finally {
        setApplyingMetatask(null);
      }
    },
    [praxis, applyingMetatask, appliedMetatasks, setError],
  );

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
        await applyMetatask(praxis.id, mt.id);
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
    [praxis, applyingMetatask, appliedMetatasks, setError],
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
      await removeMetatask(praxis.id, target.id);
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
  }, [praxis, metataskRemovalTarget, setError]);

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
    toggleMetatask,
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
