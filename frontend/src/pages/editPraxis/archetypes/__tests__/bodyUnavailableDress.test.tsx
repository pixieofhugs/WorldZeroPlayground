/**
 * The write-up box must LOOK unavailable while the room hasn't seeded (#2557).
 * The editor is read-only until the seed (ADR-0073 rule 1); the defect was a
 * box that still looked ready. Not #1852's caret fix (`bodyEditorCaret`).
 * Asserted on the host div's static markup; browser behaviour is manual QA.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

import "../../../../i18n";
import i18n from "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisRoom } from "../../praxisRoom";

// `PraxisRoomContext` isn't exported, so stub the hook (as composerQuietInk).
const room = vi.hoisted(() => ({ current: null as PraxisRoom | null }));
vi.mock("../../praxisRoom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../praxisRoom")>()),
  usePraxisRoom: () => room.current,
}));

const { BodyTextarea, ROOM_SEED_GRACE_MS } = await import("../controls");

// The dress under test is the room's, not the praxis's.
const state = anEditPraxisState();

function fakeRoom(seeded: boolean, unreachable = false): PraxisRoom {
  return {
    body: { toString: () => "", observe: () => {}, unobserve: () => {} },
    seeded,
    unreachable,
    present: [],
  } as unknown as PraxisRoom;
}

function html(current: PraxisRoom | null): string {
  room.current = current;
  try {
    return renderToStaticMarkup(
      <BodyTextarea {...state} skin={{ textareaStyle: {} }} />,
    ).replace(/&#x27;|&#39;/g, "'");
  } finally {
    room.current = null;
  }
}

function host(markup: string): string {
  const tag = markup.match(/<div[^>]*data-composer-body[^>]*>/)?.[0];
  expect(tag, "the body editor's host renders at all").toBeTruthy();
  return tag as string;
}

const connecting = i18n.t("forms:editPraxis.composer.bodyConnecting");

describe("the write-up box while the room has not seeded", () => {
  it("tells assistive tech it is disabled, and draws a cursor that refuses", () => {
    const tag = host(html(fakeRoom(false)));
    // `aria-disabled`, not `disabled`: the host is a div; the editor enforces.
    expect(tag).toContain('aria-disabled="true"');
    // `cursor` inherits down to `.cm-content`.
    expect(tag).toMatch(/cursor:\s*not-allowed/);
  });

  it("says why on hover and points the editor's description at the notice", () => {
    const markup = html(fakeRoom(false));
    const tag = host(markup);
    expect(tag).toContain(`title="${connecting}"`);
    const describedBy = tag.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy, "the host names its notice").toBeTruthy();
    const notice = markup.match(new RegExp(`<p[^>]*id="${describedBy}"[^>]*>`))?.[0];
    expect(notice, "the notice carries that id").toBeTruthy();
    // Live, so the connecting → unreachable swap is announced.
    expect(notice).toContain('role="status"');
    // Click moves focus here; never a tab stop (#693).
    expect(notice).toContain('tabindex="-1"');
  });

  it("takes the whole dress off again once the document arrives", () => {
    // A working field dressed dead is the same bug inverted.
    const tag = host(html(fakeRoom(true)));
    expect(tag).not.toContain("aria-disabled");
    expect(tag).not.toContain("not-allowed");
    expect(tag).not.toContain("aria-describedby");
    expect(tag).not.toContain("title=");
  });

  it("gives up on a quiet room in seconds, not in y-websocket's long tail", () => {
    // `unreachable` only lands after y-websocket's long backoff; this grace
    // shows `bodyUnreachable` first. The timer is an effect, so ratchet the
    // bound.
    expect(ROOM_SEED_GRACE_MS).toBeGreaterThan(0);
    expect(ROOM_SEED_GRACE_MS).toBeLessThanOrEqual(15_000);
  });
});
