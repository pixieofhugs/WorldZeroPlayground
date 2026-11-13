/**
 * The owner-only admin roster (#3258). Seam: structure — the section is in the
 * markup for the owner and absent for a plain admin. The harness runs no
 * effects, so the owner render shows the loading state; that is enough to prove
 * the gate. The server-side 403 is pinned in test_admin_roster.py.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import AdminRosterSection from "../AdminRosterSection";

describe("AdminRosterSection", () => {
  it("renders for the owner", () => {
    const html = renderToStaticMarkup(<AdminRosterSection isOwner={true} />);
    expect(html).toContain("Admins");
    expect(html).toContain("grant admin");
  });

  it("renders nothing for a plain admin", () => {
    expect(renderToStaticMarkup(<AdminRosterSection isOwner={false} />)).toBe("");
  });
});
