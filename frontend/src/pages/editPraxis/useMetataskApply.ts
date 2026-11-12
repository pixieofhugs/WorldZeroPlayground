/**
 * The *applied* metatask seals on a praxis (#933): stack, picker, peel-off. The
 * viewer-keyed catalogue stays in `useEditPraxis`. Mutations return a
 * `SealOutcome` (#2878, `__tests__/metataskApplyStandsAlone.test.tsx`).
 */
import { useCallback, useMemo, useState } from "react";
import { applyMetatask, removeMetatask, type PraxisOut } from "../../api/praxis";
import type { TaskOut } from "../../api/tasks";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/**
 * `unchanged`: nothing attempted — leave the error line be. `applied` carries
 * the server's re-scored praxis.
 */
export type SealOutcome =
  | { kind: "unchanged" }
  | { kind: "applied"; praxis: PraxisOut }
  | { kind: "failed"; message: string };

const NOTHING_CHANGED: SealOutcome = { kind: "unchanged" };

export interface MetataskApply {
  appliedMetatasks: Set<number>;
  appliedMetataskList: TaskOut[];
  applyingMetatask: number | null;
  addMetatask: (mt: TaskOut) => Promise<SealOutcome>;
  metataskPickerOpen: boolean;
  openMetataskPicker: () => void;
  closeMetataskPicker: () => void;
  metataskRemovalTarget: TaskOut | null;
  requestRemoveMetatask: (taskId: number) => void;
  confirmRemoveMetatask: () => Promise<SealOutcome>;
  cancelRemoveMetatask: () => void;
  /** From the loaded praxis; the picker's "already sealed" check reads it. */
  seedApplied: (applied: TaskOut[]) => void;
}

/**
 * Both mutations report the re-scored praxis: the score stamp reads
 * `praxis.score`/`metatask_points`, which go stale otherwise (#2464). No refetch.
 */
export function useMetataskApply(options: {
  praxis: PraxisOut | null;
}): MetataskApply {
  const { praxis } = options;
  // Source of truth; the id Set is derived.
  const [appliedMetataskList, setAppliedMetataskList] = useState<TaskOut[]>([]);
  const appliedMetatasks = useMemo(
    () => new Set(appliedMetataskList.map((mt) => mt.id)),
    [appliedMetataskList],
  );
  const [applyingMetatask, setApplyingMetatask] = useState<number | null>(null);
  const [metataskPickerOpen, setMetataskPickerOpen] = useState(false);
  const [metataskRemovalTarget, setMetataskRemovalTarget] =
    useState<TaskOut | null>(null);

  // One at a time, then the picker closes.
  const addMetatask = useCallback(
    async (mt: TaskOut): Promise<SealOutcome> => {
      if (!praxis || applyingMetatask !== null) return NOTHING_CHANGED;
      if (appliedMetatasks.has(mt.id)) {
        setMetataskPickerOpen(false);
        return NOTHING_CHANGED;
      }
      setApplyingMetatask(mt.id);
      try {
        const rescored = await applyMetatask(praxis.id, mt.id);
        setAppliedMetataskList((previous) => [...previous, mt]);
        setMetataskPickerOpen(false);
        return { kind: "applied", praxis: rescored };
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.updateMetatask"),
          ),
        };
      } finally {
        setApplyingMetatask(null);
      }
    },
    [praxis, applyingMetatask, appliedMetatasks],
  );

  // The seal's × confirms first.
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

  const confirmRemoveMetatask =
    useCallback(async (): Promise<SealOutcome> => {
      const target = metataskRemovalTarget;
      if (!praxis || !target) return NOTHING_CHANGED;
      setApplyingMetatask(target.id);
      try {
        const rescored = await removeMetatask(praxis.id, target.id);
        setAppliedMetataskList((previous) =>
          previous.filter((mt) => mt.id !== target.id),
        );
        setMetataskRemovalTarget(null);
        return { kind: "applied", praxis: rescored };
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.updateMetatask"),
          ),
        };
      } finally {
        setApplyingMetatask(null);
      }
    }, [praxis, metataskRemovalTarget]);

  // The assembler clears the error line on open (#2382, #2878).
  const openMetataskPicker = useCallback(() => setMetataskPickerOpen(true), []);
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
