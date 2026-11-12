/**
 * The faction-detail join control's 44px tap floor (#2826): the shared
 * `JoinControl` must declare it, not leave kits to clear it by padding luck.
 * The confirm pair is reached through `JoinConfirm` (it sits behind a click).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so faction copy keys resolve to English text.
import "../../../i18n";
import { surfaceMap } from "../../../factions";
import DefaultFactionBody from "../archetypes/DefaultFactionBody";
import { JoinConfirm, type JoinControlSkin } from "../../../components/JoinControl";
import type { FactionDetailState, MembershipState } from "../useFactionDetail";

const FLOOR = "min-height:44px";

function markup(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

function stateWith(slug: string, state: MembershipState): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug, status: "visible" },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state,
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  };
}

/** The inline style of the tag carrying `data-join="<role>"`. */
function joinStyle(html: string, role: string): string {
  const at = html.indexOf(`data-join="${role}"`);
  expect(at, `a data-join="${role}" button is drawn`).toBeGreaterThan(-1);
  const tag = html.slice(html.lastIndexOf("<", at), html.indexOf(">", at));
  const style = /style="([^"]*)"/.exec(tag);
  expect(style, `the ${role} button carries an inline style`).toBeTruthy();
  return style![1];
}

/** Plus `albescent`, which falls through to the Default body. */
const bodies = { ...surfaceMap("factionBody"), albescent: DefaultFactionBody };

const BARE_SKIN: JoinControlSkin = { openStyle: {}, confirmStyle: {}, cancelStyle: {} };

describe("every faction-detail join verb declares the 44px tap floor (#2826)", () => {
  it("walks every faction page there is", () => {
    expect(Object.keys(bodies).length).toBeGreaterThanOrEqual(8);
  });

  for (const [slug, Body] of Object.entries(bodies)) {
    it(`${slug} floors its join verb`, () => {
      expect(joinStyle(markup(<Body state={stateWith(slug, "eligible")} />), "open")).toContain(
        FLOOR,
      );
    });
  }
});

describe("the confirm pair is floored too, and by the control rather than the kit", () => {
  const html = markup(
    <JoinConfirm
      membership={{
        currentFactionSlug: null,
        join: async () => {},
        joining: false,
        joinError: null,
      }}
      name="Cozy Coven"
      skin={BARE_SKIN}
      joiningLabel="Joining…"
      onCancel={() => {}}
    />,
  );

  for (const role of ["cancel", "confirm"] as const) {
    it(`${role} clears 44px with an unpainted skin`, () => {
      expect(joinStyle(html, role)).toContain(FLOOR);
    });
  }
});
