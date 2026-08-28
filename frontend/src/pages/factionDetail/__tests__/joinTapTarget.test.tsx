/**
 * THE FACTION-DETAIL JOIN CONTROL'S 44px TAP FLOOR (#2826).
 *
 * ### The seam
 *
 * The inline `style` of the rendered `data-join` buttons — the three the shared
 * `JoinControl` draws, read off `renderToStaticMarkup`. This harness has no
 * layout engine and does not need one: the defect is that NOTHING declared a
 * floor, so six of the seven kits cleared 44px only because their own padding
 * and type happened to add up to it. A declaration survives without a layout
 * pass, and it is the declaration that is the fix.
 *
 * ### Why it is a fourth surface and not a repeat
 *
 * `CARD_CTA` has carried the floor for the task card since #2030 and for the
 * faction SELECT card since #2818. The faction DETAIL page's join verb is a
 * third consumer of the same act and had none: measured at `origin/main`
 * (`10e41471`), `min-height` computed to `0px` on all seven detail CTAs and
 * Singularity's `> CONNECT` stood at 40.5px — `12 + 16.5 + 12` at 11px in Share
 * Tech Mono, the smallest type of the seven. Coven landed on exactly 44.0, which
 * is coincidence doing load-bearing work.
 *
 * ### All three buttons, not just the verb
 *
 * The eligible state's confirm step replaces the verb with [Cancel] … [Confirm],
 * and those two had no floor either. They are asserted through `JoinConfirm`
 * directly, the same way `joinControlOrder.test.tsx` reaches them: the confirm
 * step sits behind a click and this harness has no DOM.
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

/** What `minHeight: 44` serializes to. React appends the unit. */
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
    viewerFactionSlug: null,
    gameFactions: [],
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

/**
 * The inline style of the tag carrying `data-join="<role>"`.
 *
 * Both halves are tripwires: a probe that cannot find the button, or finds it
 * without a `style` attribute at all, fails as itself rather than reporting a
 * missing floor.
 */
function joinStyle(html: string, role: string): string {
  const at = html.indexOf(`data-join="${role}"`);
  expect(at, `a data-join="${role}" button is drawn`).toBeGreaterThan(-1);
  const tag = html.slice(html.lastIndexOf("<", at), html.indexOf(">", at));
  const style = /style="([^"]*)"/.exec(tag);
  expect(style, `the ${role} button carries an inline style`).toBeTruthy();
  return style![1];
}

/**
 * Every registered body, plus the Default under `albescent` — the faction that
 * falls through to it. Same census `burnedNotice.test.tsx` walks, for the same
 * reason: the fall-through is a live faction page, not a spare part.
 */
const bodies = { ...surfaceMap("factionBody"), albescent: DefaultFactionBody };

/** A skin that paints nothing: the floor is not a kit's to supply. */
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
