/**
 * The composer's waiting notices read the label seam (#1819). The defect is
 * reachability, which a token-table ratio can't see: an inline `color` beats
 * `.label-caption`'s `var(--label-ink)`, so no faction root can re-point it
 * (#1783). Ratios are owned by `e2e/contrast.spec.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { aMember, aPraxis, anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisRoom } from "../../praxisRoom";

// The connecting notice is gated on the room; `PraxisRoomContext` is private,
// so stub the hook to reach a socket-only state.
const room = vi.hoisted(() => ({ current: null as PraxisRoom | null }));
vi.mock("../../praxisRoom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../praxisRoom")>()),
  usePraxisRoom: () => room.current,
}));

const { BodyTextarea } = await import("../controls");

function state(proposalLive: boolean): EditPraxisState {
  return anEditPraxisState({
    body: "## What I did\n\nCaught the papers.",
    praxis: aPraxis({
      type: "collab",
      // `pending` = a proposal is live (ADR-0079).
      status: proposalLive ? "pending" : "in_progress",
      submitted_at: null,
      submit_proposed_at: proposalLive ? "2026-08-17T10:00:00Z" : null,
      media_items: [],
      members: [aMember({ id: 1, character_id: 1, has_submitted: false }), aMember({ id: 2, character_id: 2, has_submitted: false })],
    }),
    proposalConfirmArmed: proposalLive,
  });
}

/** Socket open, seed not landed; `unreachable` picks which half of #1804's line. */
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
  const notices: [name: string, line: string, markup: () => string][] = [
    ["connecting", connectingLine, () => html({ room: waitingRoom(false) })],
    ["unreachable", unreachableLine, () => html({ room: waitingRoom(true) })],
    ["live proposal", proposalLine, () => html({ proposalLive: true })],
  ];

  for (const [name, line, markup] of notices) {
    it(`the ${name} notice is a .label-caption and nothing else`, () => {
      expect(line, "the copy exists in the catalog").not.toBe("");
      const paragraph = paragraphFor(markup(), line);
      expect(paragraph, `the ${name} notice renders at all`).not.toBeNull();
      expect(paragraph).toContain('class="label-caption"');
      // An inline `color` would beat the class, so near-black sheets couldn't fix it.
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
