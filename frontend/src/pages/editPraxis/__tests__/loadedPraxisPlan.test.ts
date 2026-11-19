import { describe, it, expect } from "vitest";
import { planLoadedPraxis } from "../loadedPraxisPlan";
import { aPraxis } from "../../../test/fixtures";

const member = { character_id: 5 } as ReturnType<
  typeof aPraxis
>["members"][number];

describe("what the composer does with a loaded praxis", () => {
  it("hydrates the draft for a member", () => {
    const praxis = aPraxis({ members: [member], title: "T", body_text: "B" });
    expect(planLoadedPraxis(praxis, 5)).toEqual({
      kind: "edit",
      title: "T",
      body: "B",
    });
  });

  it("falls back to empty strings for a null title or body", () => {
    const praxis = aPraxis({ members: [member], title: "", body_text: "" });
    expect(planLoadedPraxis(praxis, 5)).toEqual({
      kind: "edit",
      title: "",
      body: "",
    });
  });

  it("redirects a non-member and a viewer with no character", () => {
    const praxis = aPraxis({ members: [member] });
    expect(planLoadedPraxis(praxis, 6)).toEqual({ kind: "redirect" });
    expect(planLoadedPraxis(praxis, undefined)).toEqual({ kind: "redirect" });
  });
});
