import type { EraOption } from "../../api/admin";

/**
 * The eras a rollover may actually be pointed at (#827).
 *
 * The live era is excluded, not disabled: rolling into the era the game is
 * already in is a second reset — every score, level, vote budget and faction
 * cleared again, every unresolved duel frozen again — with nothing gained and
 * no undo. An option a mod can pick is an option a mod can pick by mistake, so
 * the live row stays visible as a label and never as a target.
 *
 * Order is the backend's (era order), preserved.
 */
export function selectableEras(eras: EraOption[]): EraOption[] {
  return eras.filter((era) => !era.is_live);
}

/**
 * The era the selector should start on, or `null` when there is nothing to roll
 * into.
 *
 * `null` is a real answer, not an error: a registry holding exactly one era —
 * the live one — has no rollover target, and the tab renders that as a sentence
 * rather than as an empty `<select>` a mod can submit.
 */
export function defaultEraTarget(eras: EraOption[]): EraOption | null {
  return selectableEras(eras)[0] ?? null;
}
