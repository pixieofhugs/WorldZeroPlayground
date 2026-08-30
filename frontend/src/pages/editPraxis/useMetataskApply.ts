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
 *
 * It borrowed the assembler's `setPraxis` and `setError` until #2878. It no
 * longer does: the praxis and the composer's shared error line are not this
 * stack's state, so a mutation *reports* what it changed as a `SealOutcome` and
 * `useEditPraxis` writes what it owns. That is what lets the stack be driven on
 * its own — see `__tests__/metataskApplyStandsAlone.test.tsx`. Opening the
 * picker clears the shared line (#2382) and so moved out with it.
 */
import { useCallback, useMemo, useState } from "react";
import { applyMetatask, removeMetatask, type PraxisOut } from "../../api/praxis";
import type { TaskOut } from "../../api/tasks";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/**
 * What a seal mutation leaves for the composer around this stack to apply.
 *
 * `unchanged` means nothing was attempted — no praxis yet, a seal already on
 * the stack, another mutation in flight, or no removal target — so the error
 * line must be left exactly as it was found.
 *
 * `applied` carries the praxis the server answered with, and both mutations
 * answer with one: the stack alone is not the whole state a seal changes (see
 * `useMetataskApply` below).
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
  /** Seals one metatask on. The caller applies the outcome. */
  addMetatask: (mt: TaskOut) => Promise<SealOutcome>;
  metataskPickerOpen: boolean;
  openMetataskPicker: () => void;
  closeMetataskPicker: () => void;
  metataskRemovalTarget: TaskOut | null;
  requestRemoveMetatask: (taskId: number) => void;
  confirmRemoveMetatask: () => Promise<SealOutcome>;
  cancelRemoveMetatask: () => void;
  /**
   * Seed the stack from the persisted seals on a freshly loaded praxis, so a
   * reloaded draft shows what is already sealed (the picker's "already sealed"
   * check reads this).
   */
  seedApplied: (applied: TaskOut[]) => void;
}

/**
 * Both mutations answer with the re-scored praxis, so both paths below report
 * it as an `applied` outcome rather than discarding it (#2464). The seal stack
 * alone is not the whole state a seal changes: the composer's score stamp reads
 * `praxis.score` and `praxis.metatask_points`, and leaving those at whatever the
 * initial load returned is why sealing a +100 metatask onto a task worth 10 kept
 * printing 10. Not a refetch — the server already sent the number
 * (#1382 / #2402).
 */
export function useMetataskApply(options: {
  praxis: PraxisOut | null;
}): MetataskApply {
  const { praxis } = options;
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

  // The sheet must open onto a clear error line — the picker prints `error`
  // itself (#2382), and the composer shares one error slot, so a failure from
  // publish or a duel would otherwise greet the author the moment it opens.
  // That line is the assembler's, so the assembler clears it (#2878).
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
