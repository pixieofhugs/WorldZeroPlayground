/**
 * The write-up box must LOOK unavailable while it is unavailable (#2557).
 *
 * The room seeds the document and the editor is `EditorView.editable.of(false)`
 * until it does — correct, and staying (ADR-0073 rule 1: text typed in front of
 * the server's seed merges into text the player has never seen). The defect was
 * never the refusal, it was the FAILURE MODE. `contenteditable="false"` leaves
 * the content div unfocusable, so a click puts no caret in it and no keystroke
 * lands, while the box above it still drew its border, its placeholder and the
 * `[data-composer-body]:focus-within` ring it would never actually give. The
 * only signal was one `.label-caption` line under the field.
 *
 * **This was reported once before and closed as #1852, which fixed something
 * else** — it made the caret VISIBLE (`drawSelection()` plus
 * `.cm-cursor { borderLeftColor: currentColor }`). In the state under test here
 * there is no `.cm-cursor` element at all, because nothing is focused, so caret
 * colour could never have reached it. `bodyEditorCaret.test.ts` still owns that
 * half and must stay green: after the seed the caret appears and blinks.
 *
 * THE SEAM IS THE HOST ELEMENT'S RENDERED MARKUP. This harness is
 * `renderToStaticMarkup` in a DOM-less node environment: CodeMirror is built in
 * an effect that never runs, so `contenteditable` itself is not observable and
 * no test here can click anything. What IS observable — and is exactly where
 * the bug lived — is the dress the host div carries around that editor, and
 * whether it announces the state the editor is in. A field that reads
 * `aria-disabled` and draws a `not-allowed` cursor cannot pretend to be ready.
 *
 * The browser half (the cursor a pointer actually sees, the tooltip, the focus
 * move) is NOT verified here and is listed for eyeball QA on the PR.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

import "../../../../i18n";
import i18n from "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisRoom } from "../../praxisRoom";

// Same rig as `composerQuietInk.test.tsx`: `PraxisRoomContext` is deliberately
// not exported (an archetype rendered outside the page gets `null`), so stubbing
// the hook is how a static render reaches a state only the socket produces.
const room = vi.hoisted(() => ({ current: null as PraxisRoom | null }));
vi.mock("../../praxisRoom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../praxisRoom")>()),
  usePraxisRoom: () => room.current,
}));

const { BodyTextarea, ROOM_SEED_GRACE_MS } = await import("../controls");

// The dress under test is the room's, not the praxis's: `controlsLocked: false`
// is the fixture's default and everything else here is scenery.
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

/** The editor's host div — the element the skin dresses and the player sees. */
function host(markup: string): string {
  const tag = markup.match(/<div[^>]*data-composer-body[^>]*>/)?.[0];
  expect(tag, "the body editor's host renders at all").toBeTruthy();
  return tag as string;
}

const connecting = i18n.t("forms:editPraxis.composer.bodyConnecting");

describe("the write-up box while the room has not seeded", () => {
  it("tells assistive tech it is disabled, and draws a cursor that refuses", () => {
    const tag = host(html(fakeRoom(false)));
    // The whole bug, in the two attributes it was missing. `aria-disabled` and
    // not `disabled`: the host is a div, and the editor inside it is the thing
    // actually refusing — this is the announcement, not the enforcement.
    expect(tag).toContain('aria-disabled="true"');
    // `cursor` is an inherited property and the CodeMirror base theme sets none,
    // so one declaration on the host reaches `.cm-content` too — which is the
    // element a player's pointer is actually over when they click into the box.
    expect(tag).toMatch(/cursor:\s*not-allowed/);
  });

  it("says why on hover and points the editor's description at the notice", () => {
    const markup = html(fakeRoom(false));
    const tag = host(markup);
    // Hovering is the earliest moment the reason can be given, and `title` is
    // the platform's own answer to it — no new component, no CSS.
    expect(tag).toContain(`title="${connecting}"`);
    // And the notice under the box is the accessible description of the field,
    // so the reason is reachable without a hover at all.
    const describedBy = tag.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy, "the host names its notice").toBeTruthy();
    const notice = markup.match(new RegExp(`<p[^>]*id="${describedBy}"[^>]*>`))?.[0];
    expect(notice, "the notice carries that id").toBeTruthy();
    // A live region, so the connecting → unreachable swap below is announced
    // rather than silently repainting under a player who has looked away.
    expect(notice).toContain('role="status"');
    // Focusable only programmatically: the click handler moves focus here, so
    // a click on a dead field lands somewhere that says why. It must never
    // become a tab stop between the title and the write-up (#693).
    expect(notice).toContain('tabindex="-1"');
  });

  it("takes the whole dress off again once the document arrives", () => {
    // The other half of the ratchet: dressing a WORKING field as dead is the
    // same bug with the sign flipped, and it would also swallow the caret #1852
    // fixed by putting `not-allowed` over a box that takes text.
    const tag = host(html(fakeRoom(true)));
    expect(tag).not.toContain("aria-disabled");
    expect(tag).not.toContain("not-allowed");
    expect(tag).not.toContain("aria-describedby");
    expect(tag).not.toContain("title=");
  });

  it("gives up on a quiet room in seconds, not in y-websocket's long tail", () => {
    // `PraxisRoom.unreachable` is the honest signal — the provider stopped
    // trying — but it only arrives after y-websocket exhausts its own backoff,
    // and that tail is where a player actually sits. The grace below is what
    // lands the `bodyUnreachable` copy first. The timer itself is an effect and
    // this harness runs none, so the bound is the part worth ratcheting: raise
    // this past a few seconds and the notice is back in the tail it exists to
    // cut short.
    expect(ROOM_SEED_GRACE_MS).toBeGreaterThan(0);
    expect(ROOM_SEED_GRACE_MS).toBeLessThanOrEqual(15_000);
  });
});
