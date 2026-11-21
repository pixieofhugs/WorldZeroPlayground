// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../../i18n";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  moderate: vi.fn(),
}));
vi.mock("../../../api/admin", () => ({
  listAdminPraxes: api.list,
  moderatePraxis: api.moderate,
}));
vi.mock("../../../api/praxis", () => ({ getPraxis: api.get }));
vi.mock("../../../hooks/useGameConfig", () => ({ useGameConfig: () => null }));

import PraxisTab from "../PraxisTab";

const row = (moderation_status: string) => ({
  id: 7,
  title: "Mine",
  task_title: "T",
  task_id: 1,
  type: "solo",
  status: "submitted",
  created_by_display_name: "A",
  created_by_id: 2,
  moderation_status,
});

async function openHide(status: string) {
  api.list.mockResolvedValue([row(status)]);
  api.moderate.mockResolvedValue({ moderation_status: "hidden" });
  render(
    <MemoryRouter>
      <PraxisTab />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "hide" }));
  return (await screen.findByLabelText("Reason the author sees")) as HTMLTextAreaElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe("Praxis tab Hide note", () => {
  it("sends the typed reason", async () => {
    const box = await openHide("visible");
    fireEvent.change(box, { target: { value: "Not your photo." } });
    fireEvent.click(screen.getByRole("button", { name: /confirm — hide/ }));
    await waitFor(() =>
      expect(api.moderate).toHaveBeenCalledWith(7, "hidden", "Not your photo."),
    );
    expect(api.get).not.toHaveBeenCalled();
  });

  it("keeps a Not-met praxis's note unless edited", async () => {
    api.get.mockResolvedValue({ admin_note: "No proof." });
    const box = await openHide("failed");
    await waitFor(() => expect(box.value).toBe("No proof."));
    fireEvent.click(screen.getByRole("button", { name: /confirm — hide/ }));
    await waitFor(() =>
      expect(api.moderate).toHaveBeenCalledWith(7, "hidden", "No proof."),
    );
  });

  it("prefills Fail on a Hidden praxis so the Hide reason survives", async () => {
    api.get.mockResolvedValue({ admin_note: "Not your photo." });
    api.list.mockResolvedValue([row("hidden")]);
    render(
      <MemoryRouter>
        <PraxisTab />
      </MemoryRouter>,
    );
    await screen.findAllByRole("button", { name: "restore" });
    fireEvent.click(screen.getAllByRole("button", { name: "fail" }).at(-1)!);
    const box = (await screen.findByRole("textbox", { name: /reason/i })) as HTMLTextAreaElement;
    await waitFor(() => expect(box.value).toBe("Not your photo."));
  });

  it("drops a slow prefill from an earlier row", async () => {
    let late: (v: { admin_note: string }) => void = () => {};
    api.get.mockReturnValueOnce(new Promise((r) => (late = r)));
    api.list.mockResolvedValue([row("failed"), { ...row("visible"), id: 8, title: "Other" }]);
    render(
      <MemoryRouter>
        <PraxisTab />
      </MemoryRouter>,
    );
    const hides = await screen.findAllByRole("button", { name: "hide" });
    fireEvent.click(hides[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "hide" }).at(-1)!);
    late({ admin_note: "A's note" });
    await new Promise((r) => setTimeout(r, 0));
    const box = (await screen.findByLabelText("Reason the author sees")) as HTMLTextAreaElement;
    expect(box.value).toBe("");
  });
});
