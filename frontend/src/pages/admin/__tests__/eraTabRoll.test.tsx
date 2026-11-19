// @vitest-environment jsdom
/** EraTab through the real client and `errors.json`, stubbed `fetch`: the roll's counts and its 409. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../i18n";
import adminCatalog from "../../../locales/en/admin.json";
import errorsCatalog from "../../../locales/en/errors.json";

const wire = vi.hoisted(() => {
  const roll: { status: number; body: unknown } = { status: 200, body: null };
  globalThis.fetch = (async (input: Request) => {
    const isRoll = input.method === "PUT";
    return new Response(JSON.stringify(isRoll ? roll.body : eras), {
      status: isRoll ? roll.status : 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;
  const eras = [
    { config_key: "era_1", is_live: true, name: "Era One" },
    { config_key: "era_2", is_live: false, name: "Era Two" },
  ];
  return { roll };
});

import EraTab from "../EraTab";

async function rollNow() {
  i18n.addResourceBundle("en", "admin", adminCatalog, true, true);
  render(<EraTab />);
  fireEvent.click(await screen.findByText(adminCatalog.era.begin));
  fireEvent.click(await screen.findByText("Roll into Era Two", { exact: false }));
}

afterEach(cleanup);

describe("EraTab roll result", () => {
  it("shows the reactivated and created task counts beside the reset count", async () => {
    wire.roll.status = 200;
    wire.roll.body = {
      era_id: 2, config_key: "era_2", name: "Era Two",
      characters_reset: 3, tasks_reactivated: 1, tasks_created: 4,
    };
    await rollNow();
    expect(await screen.findByText("3 characters were reset.")).toBeTruthy();
    expect(screen.getByText("1 task was reactivated.")).toBeTruthy();
    expect(screen.getByText("4 tasks were created.")).toBeTruthy();
  });

  it("renders the ERA_ROLL_NEEDS_CHARACTER catalog copy on a 409", async () => {
    wire.roll.status = 409;
    wire.roll.body = { detail: { code: "ERA_ROLL_NEEDS_CHARACTER", message: "raw" } };
    await rollNow();
    expect(
      await screen.findByText(errorsCatalog.codes.ERA_ROLL_NEEDS_CHARACTER),
    ).toBeTruthy();
  });
});
