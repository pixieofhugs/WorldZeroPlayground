/**
 * #827 — which era the rollover control may be pointed at.
 *
 * The whole decision is one filter, and it is worth its own module because
 * getting it wrong is unrecoverable: a rollover into the LIVE era is a second
 * reset of every score, level, vote budget and faction, plus a second freeze of
 * every unresolved duel, for no change at all and with no undo. So the live row
 * is not a target, and an all-live register has no target rather than a
 * defaulted one.
 */
import { describe, it, expect } from "vitest";
import type { EraOption } from "../../../api/admin";
import { defaultEraTarget, selectableEras } from "../eraRollTargets";

const era = (config_key: string, is_live: boolean): EraOption => ({
  config_key,
  name: config_key.toUpperCase(),
  is_live,
});

const REGISTER: EraOption[] = [era("era_1", true), era("era_2", false)];

describe("selectableEras — the live era is never a rollover target (#827)", () => {
  it("drops the live era", () => {
    expect(selectableEras(REGISTER)).toEqual([era("era_2", false)]);
  });

  it("keeps the backend's era order", () => {
    const many = [era("era_1", true), era("era_2", false), era("era_3", false)];
    expect(selectableEras(many).map((e) => e.config_key)).toEqual([
      "era_2",
      "era_3",
    ]);
  });

  it("yields nothing when every registered era is live", () => {
    expect(selectableEras([era("era_1", true)])).toEqual([]);
  });

  it("passes an all-dormant list through untouched", () => {
    // No live row is not this helper's problem to solve — the backend always
    // flags one, and inventing a fallback here would hide it if it stopped.
    const dormant = [era("era_1", false), era("era_2", false)];
    expect(selectableEras(dormant)).toEqual(dormant);
  });
});

describe("defaultEraTarget — where the selector starts (#827)", () => {
  it("is the first non-live era", () => {
    expect(defaultEraTarget(REGISTER)).toEqual(era("era_2", false));
  });

  it("skips the live era even when it leads the list", () => {
    const many = [era("era_1", true), era("era_2", false), era("era_3", false)];
    expect(defaultEraTarget(many)?.config_key).toBe("era_2");
  });

  it("is null when every registered era is live", () => {
    // The tab reads this as "say so and render no control", which is why null
    // is a real answer here and not an error to throw.
    expect(defaultEraTarget([era("era_1", true)])).toBeNull();
  });

  it("is null for an empty register", () => {
    expect(defaultEraTarget([])).toBeNull();
  });
});
