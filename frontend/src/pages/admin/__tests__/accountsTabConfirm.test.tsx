// @vitest-environment jsdom
/** Seam: Accounts tab suspend and ban fire only after the confirm; their undos need none. */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";

const api = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getAccountDetail: vi.fn(),
  suspendAccount: vi.fn(),
  banCharacter: vi.fn(),
}));
vi.mock("../../../api/admin", () => api);
vi.mock("../../../auth/AuthContext", () => ({ useAuth: () => ({ user: { is_owner: false } }) }));
vi.mock("../AdminRosterSection", () => ({ default: () => null }));
vi.mock("../VoteRingPanel", () => ({ default: () => null }));

import AccountsTab from "../AccountsTab";

const account = (status: string) => ({
  id: 7,
  email: "junk@example.com",
  status,
  created_at: "2026-01-01T00:00:00Z",
  matched_characters: [],
});

function arrange(accountStatus = "active") {
  api.getAccounts.mockResolvedValue({ items: [account(accountStatus)], total: 1, limit: 50, offset: 0 });
  api.getAccountDetail.mockResolvedValue({
    ...account(accountStatus),
    characters: [
      { id: 3, username: "junk", display_name: "Junk", faction_slug: "ua", status: "active" },
    ],
  });
  api.suspendAccount.mockResolvedValue(undefined);
  api.banCharacter.mockResolvedValue(undefined);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AccountsTab confirms", () => {
  it("suspend waits for the confirm", async () => {
    arrange();
    render(<AccountsTab />);
    fireEvent.click(await screen.findByRole("button", { name: "suspend" }));
    expect(api.suspendAccount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm — suspend account/ }));
    await waitFor(() => expect(api.suspendAccount).toHaveBeenCalledWith(7, true));
  });

  it("cancel fires nothing", async () => {
    arrange();
    render(<AccountsTab />);
    fireEvent.click(await screen.findByRole("button", { name: "suspend" }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/ }));
    expect(api.suspendAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("ban waits for the confirm", async () => {
    arrange();
    render(<AccountsTab />);
    fireEvent.click(await screen.findByText("junk@example.com"));
    fireEvent.click(await screen.findByRole("button", { name: "ban" }));
    expect(api.banCharacter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm — ban character/ }));
    await waitFor(() => expect(api.banCharacter).toHaveBeenCalledWith(3, true));
  });

  it("unsuspend needs no confirm", async () => {
    arrange("suspended");
    render(<AccountsTab />);
    fireEvent.click(await screen.findByRole("button", { name: "unsuspend" }));
    await waitFor(() => expect(api.suspendAccount).toHaveBeenCalledWith(7, false));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
