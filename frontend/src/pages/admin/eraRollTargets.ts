import type { EraOption } from "../../api/admin";

/**
 * Eras a rollover may target (#827), in backend order. The live era is
 * excluded, not disabled: rolling into it is a no-gain, no-undo second reset.
 */
export function selectableEras(eras: EraOption[]): EraOption[] {
  return eras.filter((era) => !era.is_live);
}

/** `null` when only the live era exists; the tab renders a sentence, not a `<select>`. */
export function defaultEraTarget(eras: EraOption[]): EraOption | null {
  return selectableEras(eras)[0] ?? null;
}
