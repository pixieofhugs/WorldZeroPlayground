/** #827: the live era is never a rollover target (a second, no-undo reset). */
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
    // The backend always flags a live row; a fallback here would hide its loss.
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
    // The tab renders "say so, no control" for null.
    expect(defaultEraTarget([era("era_1", true)])).toBeNull();
  });

  it("is null for an empty register", () => {
    expect(defaultEraTarget([])).toBeNull();
  });
});
