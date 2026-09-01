/**
 * The composer's two waiting notices read the label seam (#1819).
 *
 * THE SEAM IS THE MOUNTED MARKUP, not the token table. `factionContrast.test.ts`
 * measures `--label-ink` against every faction sheet and stays green through a
 * caption that never reads it — which is exactly how a 2.01:1 notice sat on the
 * Ephemerists plate with every ratio in the repo reporting clean. The defect is
 * REACHABILITY, so the assertion has to be about what the element paints with,
 * and the cheapest true statement of that is: it paints with nothing of its own.
 *
 * `.label-caption` already carries `color: var(--label-ink)` (index.css), and a
 * faction frame repoints that variable once on its own root. An inline `color`
 * on the same element wins over the class and takes the seam out of reach for
 * all eight factions at once — the fork #1783 ruled on.
 *
 * This harness has no CSS and no effects, so it cannot report a RATIO; the
 * rendered sweep in `e2e/contrast.spec.ts` owns that and is nightly. What it can
 * prove is the half a ratio cannot see, and that half is where the bug lived.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { aMember, aPraxis, anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisRoom } from "../../praxisRoom";

// The connecting notice is gated on the ROOM (`ytext !== null && !seeded`), and
// `PraxisRoomContext` is deliberately not exported — an archetype rendered
// outside the page gets `null` and draws an editor bound to nothing. Stubbing
// the hook is how a static render reaches a state only the socket produces,
// without widening the module's API for a test.
const room = vi.hoisted(() => ({ current: null as PraxisRoom | null }));
vi.mock("../../praxisRoom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../praxisRoom")>()),
  usePraxisRoom: () => room.current,
}));

const { BodyTextarea } = await import("../controls");

// Everything not named here is the fixture's quiet default (#2877).
function state(proposalLive: boolean): EditPraxisState {
  return anEditPraxisState({
    body: "## What I did\n\nCaught the papers.",
    praxis: aPraxis({
      type: "collab",
      // `pending` is "a proposal is live" since ADR-0079; the timestamp is what
      // identifies the proposal.
      status: proposalLive ? "pending" : "in_progress",
      submitted_at: null,
      submit_proposed_at: proposalLive ? "2026-08-17T10:00:00Z" : null,
      media_items: [],
      members: [aMember({ id: 1, character_id: 1, has_submitted: false }), aMember({ id: 2, character_id: 2, has_submitted: false })],
    }),
    proposalConfirmArmed: proposalLive,
  });
}

/**
 * The room as it is while the socket is open and the seed has not landed —
 * `unreachable` false is the "…" half of the one line #1804 made two-valued.
 */
function waitingRoom(unreachable: boolean): PraxisRoom {
  return {
    body: { toString: () => "", observe: () => {}, unobserve: () => {} },
    seeded: false,
    unreachable,
    present: [],
  } as unknown as PraxisRoom;
}

function html(
  options: { proposalLive?: boolean; room?: PraxisRoom | null } = {},
): string {
  room.current = options.room ?? null;
  try {
    return renderToStaticMarkup(
      <BodyTextarea
        {...state(options.proposalLive ?? false)}
        skin={{ textareaStyle: {} }}
      />,
    ).replace(/&#x27;|&#39;/g, "'");
  } finally {
    room.current = null;
  }
}

/** The `<p>` that carries `line`, with its attributes — or `null` if absent. */
function paragraphFor(markup: string, line: string): string | null {
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markup.match(new RegExp(`<p[^>]*>(?:(?!</p>).)*${escaped}`, "s"))?.[0] ?? null;
}

const connectingLine = i18n.t("forms:editPraxis.composer.bodyConnecting");
const unreachableLine = i18n.t("forms:editPraxis.composer.bodyUnreachable");
const proposalLine = i18n.t("forms:editPraxis.composer.bodyProposalLive");

describe("the waiting notices leave the label seam reachable", () => {
  /**
   * Both values of the one line #1804 folded together. The "room unreachable"
   * copy shipped after #1819's ruling was written, on the same element and the
   * same faction-dispatched ground, so it inherits the same defect and the same
   * fix — but a sweep aimed at the older copy alone would have walked past it.
   */
  const notices: [name: string, line: string, markup: () => string][] = [
    ["connecting", connectingLine, () => html({ room: waitingRoom(false) })],
    ["unreachable", unreachableLine, () => html({ room: waitingRoom(true) })],
    // #1745's frozen notice is gone with the freeze (ADR-0079); the line that
    // replaced it sits on the same element, on the same dressed ground, and
    // inherits the same ruling.
    ["live proposal", proposalLine, () => html({ proposalLive: true })],
  ];

  for (const [name, line, markup] of notices) {
    it(`the ${name} notice is a .label-caption and nothing else`, () => {
      expect(line, "the copy exists in the catalog").not.toBe("");
      const paragraph = paragraphFor(markup(), line);
      expect(paragraph, `the ${name} notice renders at all`).not.toBeNull();
      expect(paragraph).toContain('class="label-caption"');
      // The whole bug in one assertion. An inline `color` here beats the class,
      // so the frame's `--label-ink` stops being the ink and the three sheets
      // that are near-black in BOTH themes (S.N.I.D.E. 2.19:1, Singularity
      // 2.27:1, the Ephemerists plate 2.01:1 in light) have no way to fix their
      // own number — no light-cascade neutral can serve a near-black ground.
      expect(
        paragraph,
        `the ${name} notice must not restate an ink the class already paints`,
      ).not.toContain("style=");
    });
  }

  it("says nothing of any of it once the room has seeded and nothing is proposed", () => {
    const markup = html();
    for (const line of [connectingLine, unreachableLine, proposalLine]) {
      expect(markup).not.toContain(line);
    }
  });
});
