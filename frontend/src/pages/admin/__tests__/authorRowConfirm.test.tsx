// @vitest-environment jsdom
/** Seam: the author row asks before it bans or suspends, and undoing needs no ask. */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../i18n";
import type { FlaggedPraxisOut } from "../../../api/admin";
import AuthorRow from "../AuthorRow";

afterEach(cleanup);

function praxis(overrides: Partial<FlaggedPraxisOut> = {}): FlaggedPraxisOut {
  return {
    created_by_display_name: "Junk Poster",
    author_username: "junk",
    author_status: "active",
    author_account_status: "active",
    ...overrides,
  } as FlaggedPraxisOut;
}

function setup(row: FlaggedPraxisOut, confirming: "ban" | "suspend" | null = null) {
  const props = {
    onAsk: vi.fn(),
    onCancel: vi.fn(),
    onModerate: vi.fn().mockResolvedValue(undefined),
    onViewAccount: vi.fn(),
  };
  render(<AuthorRow praxis={row} confirming={confirming} {...props} />);
  return props;
}

describe("AuthorRow", () => {
  it("asks first: ban fires nothing until confirmed", () => {
    const props = setup(praxis());
    fireEvent.click(screen.getByRole("button", { name: "ban character" }));
    expect(props.onAsk).toHaveBeenCalledWith("ban");
    expect(props.onModerate).not.toHaveBeenCalled();
  });

  it("moderates only from the confirm button", async () => {
    const row = praxis();
    const props = setup(row, "suspend");
    fireEvent.click(screen.getByRole("button", { name: /confirm — suspend account/ }));
    await waitFor(() => expect(props.onModerate).toHaveBeenCalledWith(row, "suspend", true));
  });

  it("unban needs no confirm and the banned state shows", () => {
    const row = praxis({ author_status: "banned" });
    const props = setup(row);
    expect(screen.getByText("banned")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "unban character" }));
    expect(props.onModerate).toHaveBeenCalledWith(row, "ban", false);
    expect(props.onAsk).not.toHaveBeenCalled();
  });

  it("links to the author's account by username", () => {
    const props = setup(praxis());
    fireEvent.click(screen.getByRole("button", { name: "view account →" }));
    expect(props.onViewAccount).toHaveBeenCalledWith("junk");
  });
});
