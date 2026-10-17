// @vitest-environment jsdom
/**
 * The seam: the sheet's `onClickCapture` guard (see "TWO SAFETY RULES" in
 * `FactionCopySheet`). The sheet embeds the live invitation letter, whose
 * ENLIST button would really join a faction; a click must go no further than
 * the sheet's capture handler. `renderToStaticMarkup` cannot click.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { chooseFaction } from "../../../api/factions";
import { AuthContext } from "../../../auth/AuthContext";
import { ThemeProvider } from "../../../hooks/useTheme";
import i18n from "../../../i18n";
import { aCurrentUser } from "../../../test/fixtures";
import FactionCopySheet from "../FactionCopySheet";

vi.mock("../../../api/factions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/factions")>()),
  chooseFaction: vi.fn(),
}));

afterEach(cleanup);

describe("FactionCopySheet", () => {
  it("swallows an ENLIST click: no confirm step, no join", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <ThemeProvider>
        <AuthContext.Provider
          value={{
            user: aCurrentUser(),
            loading: false,
            refetch: async () => {},
            applyUser: () => {},
            signOut: async () => {},
          }}
        >
          <MemoryRouter initialEntries={["/admin/copy/wow"]}>
            <Routes>
              <Route path="/admin/copy/:slug" element={<FactionCopySheet />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    const enlist = screen.getByText(i18n.t("factions:wow.invitation.cta.join"));
    fireEvent.click(enlist);

    // The click never reached the button's own handler, so the confirm step
    // that would precede a join was never armed...
    expect(screen.getByText(i18n.t("factions:wow.invitation.cta.join"))).toBe(enlist);
    // ...and nothing joined.
    expect(chooseFaction).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
