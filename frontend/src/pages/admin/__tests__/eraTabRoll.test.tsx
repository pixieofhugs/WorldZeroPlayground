// @vitest-environment jsdom
/** EraTab through the real client and catalogs, stubbed `fetch`: the preflight, the type-to-confirm gate, the roll's result and its 409. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import adminCatalog from "../../../locales/en/admin.json";
import factionsCatalog from "../../../locales/en/factions.json";
import errorsCatalog from "../../../locales/en/errors.json";

const wire = vi.hoisted(() => {
  const roll: { status: number; body: unknown; calls: number } = { status: 200, body: null, calls: 0 };
  const preflight = {
    name: "Era Two", characters_reset: 3, duels_frozen: 2, tasks_retired: 5, tasks_arriving: 0,
    leaving_factions: [{ slug: "coven", characters: 4 }], duels_awaiting_answer: 2, open_reports: 1,
  };
  const eras = [
    { config_key: "era_1", is_live: true, name: "Era One" },
    { config_key: "era_2", is_live: false, name: "Era Two" },
  ];
  globalThis.fetch = (async (input: Request) => {
    const isRoll = input.method === "PUT";
    if (isRoll) roll.calls += 1;
    const body = isRoll ? roll.body : input.url.endsWith("/preflight") ? preflight : eras;
    return new Response(JSON.stringify(body), {
      status: isRoll ? roll.status : 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;
  return { roll, preflight };
});

import EraTab from "../EraTab";

const submit = () => screen.getByRole("button", { name: "Roll into Era Two" }) as HTMLButtonElement;
const confirmBox = () => screen.getByLabelText(/to confirm/) as HTMLInputElement;

async function open() {
  i18n.addResourceBundle("en", "admin", adminCatalog, true, true);
  i18n.addResourceBundle("en", "factions", factionsCatalog, true, true);
  render(<MemoryRouter><EraTab /></MemoryRouter>);
  await screen.findByText(adminCatalog.console.era.check);
}

afterEach(() => {
  cleanup();
  wire.roll.calls = 0;
});

describe("EraTab preflight", () => {
  it("counts what the roll does and lists the warnings with their links", async () => {
    await open();
    expect(screen.getByText(/3 characters are reset by Era Two/)).toBeTruthy();
    expect(screen.getByText(/2 duels in progress/)).toBeTruthy();
    expect(screen.getByText(/5 tasks retire/)).toBeTruthy();
    expect(screen.getByText(/Cozy Coven \(4\)/)).toBeTruthy();
    expect(screen.getByText("Era Two has no tasks.")).toBeTruthy();
    expect(screen.getByText("2 duel challenges are still waiting for an answer.")).toBeTruthy();
    expect(screen.getByText("Stage tasks first").getAttribute("href")).toBe("/admin/tasks");
    expect(screen.getByText("Review it").getAttribute("href")).toBe("/admin/reports");
  });
});

describe("EraTab type-to-confirm", () => {
  it("keeps the button disabled until the name matches exactly", async () => {
    await open();
    expect(submit().disabled).toBe(true);
    fireEvent.change(confirmBox(), { target: { value: "era two" } });
    expect(submit().disabled).toBe(true);
    fireEvent.change(confirmBox(), { target: { value: "Era Tw" } });
    expect(submit().disabled).toBe(true);
    fireEvent.change(confirmBox(), { target: { value: " Era Two " } });
    expect(submit().disabled).toBe(false);
  });

  it("never calls the roll while the gate is shut", async () => {
    await open();
    fireEvent.click(submit());
    expect(wire.roll.calls).toBe(0);
  });
});

describe("EraTab roll result", () => {
  it("shows the reactivated and created task counts beside the reset count", async () => {
    wire.roll.status = 200;
    wire.roll.body = {
      era_id: 2, config_key: "era_2", name: "Era Two",
      characters_reset: 3, tasks_reactivated: 1, tasks_created: 4,
    };
    await open();
    fireEvent.change(confirmBox(), { target: { value: "Era Two" } });
    fireEvent.click(submit());
    expect(await screen.findByText("3 characters were reset.")).toBeTruthy();
    expect(screen.getByText("1 task was reactivated.")).toBeTruthy();
    expect(screen.getByText("4 tasks were created.")).toBeTruthy();
  });

  it("renders the ERA_ROLL_NEEDS_CHARACTER catalog copy on a 409", async () => {
    wire.roll.status = 409;
    wire.roll.body = { detail: { code: "ERA_ROLL_NEEDS_CHARACTER", message: "raw" } };
    await open();
    fireEvent.change(confirmBox(), { target: { value: "Era Two" } });
    fireEvent.click(submit());
    expect(await screen.findByText(errorsCatalog.codes.ERA_ROLL_NEEDS_CHARACTER)).toBeTruthy();
  });
});
