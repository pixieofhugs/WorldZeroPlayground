/**
 * The admin Praxis tab (#3061), at three seams (SPEC-testing, "The three
 * classes"):
 *
 * - **a value** — `buildAdminPraxisQuery` (criteria → request), the page split,
 *   `praxisRowActions` (which rulings a row offers) and `applyModeration`.
 * - **the wire** — `requestPraxisModeration` through the real `api/admin`
 *   client against a stubbed `fetch`: hide → restore round-trips from the row.
 *   WHICH routes are called is asserted beside the client, in
 *   `api/__tests__/adminPraxisRequests.test.ts`.
 * - **structure** — `AdminConfirm`'s markup, the in-page confirm shared with
 *   the task delete.
 *
 * What this cannot see: the tab's own click wiring. The harness has no DOM and
 * runs no effects, so `PraxisTab` never leaves its loading state here.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../i18n";

/** `vi.hoisted`, not `beforeEach` — `openapi-fetch` binds `fetch` when the
 *  client module loads. `FlagControl.test.tsx` carries the long version. */
const wire = vi.hoisted(() => {
  const sent: Request[] = [];
  const reply: { status: number; body: string } = { status: 200, body: "[]" };
  globalThis.fetch = (async (input: Request) => {
    sent.push(input.clone());
    return new Response(reply.body, {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;
  return { sent, reply };
});

afterEach(() => {
  wire.sent.length = 0;
  wire.reply.status = 200;
  wire.reply.body = "[]";
});

import type { PraxisCardOut } from "../../../api/praxis";
import AdminConfirm from "../AdminConfirm";
import {
  ADMIN_PRAXIS_PAGE_SIZE,
  DEFAULT_PRAXIS_CRITERIA,
  applyModeration,
  buildAdminPraxisQuery,
  hasActiveIdFilters,
  praxisRowActions,
  requestPraxisModeration,
  splitAdminPraxisPage,
} from "../adminPraxisRows";

const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    moderation_status: "visible",
  })) as PraxisCardOut[];

describe("buildAdminPraxisQuery", () => {
  it("sends only the era scope and the page window when nothing is set", () => {
    expect(buildAdminPraxisQuery(DEFAULT_PRAXIS_CRITERIA, 0)).toEqual({
      era_scope: "this_era",
      limit: ADMIN_PRAXIS_PAGE_SIZE + 1,
      offset: 0,
    });
  });

  it("carries every axis that is set", () => {
    expect(
      buildAdminPraxisQuery(
        {
          search: "  zebra ",
          factions: ["ua", "snide"],
          type: "collab",
          status: "in_progress",
          moderation: "hidden",
          eraScope: "all_eras",
          taskId: " 12 ",
          memberId: "7",
        },
        0,
      ),
    ).toMatchObject({
      q: "zebra",
      faction: ["ua", "snide"],
      type: "collab",
      status: "in_progress",
      moderation_status: "hidden",
      era_scope: "all_eras",
      task_id: 12,
      member_id: 7,
    });
  });

  it("drops an id that is not a positive whole number", () => {
    for (const junk of ["abc", "0", "-3", "1.5", "   "]) {
      const query = buildAdminPraxisQuery(
        { ...DEFAULT_PRAXIS_CRITERIA, taskId: junk, memberId: junk },
        0,
      );
      expect(query.task_id, junk).toBeUndefined();
      expect(query.member_id, junk).toBeUndefined();
    }
  });

  it("moves the offset a page at a time and always over-asks by one", () => {
    const third = buildAdminPraxisQuery(DEFAULT_PRAXIS_CRITERIA, 2);

    expect(third.offset).toBe(2 * ADMIN_PRAXIS_PAGE_SIZE);
    expect(third.limit).toBe(ADMIN_PRAXIS_PAGE_SIZE + 1);
  });
});

describe("splitAdminPraxisPage", () => {
  it("keeps a page of rows and reports the extra one as a next page", () => {
    const { rows: page, hasNext } = splitAdminPraxisPage(
      rows(ADMIN_PRAXIS_PAGE_SIZE + 1),
    );

    expect(page).toHaveLength(ADMIN_PRAXIS_PAGE_SIZE);
    expect(hasNext).toBe(true);
  });

  it("reports no next page when the window was not filled", () => {
    expect(splitAdminPraxisPage(rows(ADMIN_PRAXIS_PAGE_SIZE)).hasNext).toBe(false);
    expect(splitAdminPraxisPage([])).toEqual({ rows: [], hasNext: false });
  });
});

describe("hasActiveIdFilters", () => {
  it("is raised by either id box and by nothing else", () => {
    expect(hasActiveIdFilters(DEFAULT_PRAXIS_CRITERIA)).toBe(false);
    expect(
      hasActiveIdFilters({ ...DEFAULT_PRAXIS_CRITERIA, search: "zebra" }),
    ).toBe(false);
    expect(hasActiveIdFilters({ ...DEFAULT_PRAXIS_CRITERIA, taskId: "3" })).toBe(true);
    expect(hasActiveIdFilters({ ...DEFAULT_PRAXIS_CRITERIA, memberId: "3" })).toBe(true);
  });
});

describe("praxisRowActions — a row offers every ruling but the one it holds", () => {
  it("never offers restore on a visible praxis", () => {
    expect(praxisRowActions("visible")).toEqual(["hide", "fail"]);
  });

  it("offers restore, and not hide, on a hidden praxis", () => {
    expect(praxisRowActions("hidden")).toEqual(["fail", "restore"]);
  });

  it("offers restore, and not fail, on a failed praxis", () => {
    expect(praxisRowActions("failed")).toEqual(["hide", "restore"]);
  });

  it("offers all three on a flagged praxis", () => {
    expect(praxisRowActions("flagged")).toEqual(["hide", "fail", "restore"]);
  });
});

describe("applyModeration", () => {
  it("changes the one row in place and leaves order and the rest alone", () => {
    const before = rows(3);

    const after = applyModeration(before, 2, "hidden");

    expect(after.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(after.map((row) => row.moderation_status)).toEqual([
      "visible",
      "hidden",
      "visible",
    ]);
    expect(before[1].moderation_status).toBe("visible");
  });
});

describe("the wire", () => {
  it("hide then restore round-trips from the row", async () => {
    let row = rows(1);

    wire.reply.body = JSON.stringify({ id: 1, moderation_status: "hidden" });
    const hidden = await requestPraxisModeration(1, "hide", "", "fallback");
    if ("error" in hidden) throw new Error(hidden.error);
    row = applyModeration(row, 1, hidden.status);
    expect(row[0].moderation_status).toBe("hidden");
    expect(praxisRowActions(row[0].moderation_status)).toContain("restore");

    wire.reply.body = JSON.stringify({ id: 1, moderation_status: "visible" });
    const restored = await requestPraxisModeration(1, "restore", "", "fallback");
    if ("error" in restored) throw new Error(restored.error);
    row = applyModeration(row, 1, restored.status);
    expect(row[0].moderation_status).toBe("visible");

    expect(wire.sent.map((request) => request.method)).toEqual(["PATCH", "PATCH"]);
    expect(await wire.sent[0].json()).toEqual({ status: "hidden", admin_note: null });
    expect(await wire.sent[1].json()).toEqual({ status: "visible", admin_note: null });
  });

  it("sends the note with a fail, and only with a fail", async () => {
    wire.reply.body = JSON.stringify({ id: 1, moderation_status: "failed" });

    await requestPraxisModeration(1, "fail", "not the task", "fallback");
    await requestPraxisModeration(1, "hide", "not the task", "fallback");

    expect(await wire.sent[0].json()).toEqual({
      status: "failed",
      admin_note: "not the task",
    });
    expect(await wire.sent[1].json()).toEqual({ status: "hidden", admin_note: null });
  });

  it("answers a refusal with words for the row, not a throw", async () => {
    wire.reply.status = 400;
    wire.reply.body = "{}";

    expect(await requestPraxisModeration(1, "hide", "", "fallback")).toEqual({
      error: "fallback",
    });
  });
});

describe("AdminConfirm — the shared in-page confirm", () => {
  const html = (props: { busy?: boolean; error?: string | null }) =>
    renderToStaticMarkup(
      <AdminConfirm
        heading="Hide this praxis?"
        lead="It leaves every list."
        confirmLabel="confirm — hide"
        busyLabel="hiding…"
        cancelLabel="cancel, leave it"
        busy={props.busy ?? false}
        error={props.error ?? null}
        onConfirm={() => {}}
        onCancel={() => {}}
      >
        <textarea />
      </AdminConfirm>,
    );

  it("is a labelled alertdialog with focus on cancel, never on confirm", () => {
    const markup = html({});
    const buttons = markup.match(/<button[^>]*>/g) ?? [];
    const labelId = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain(`id="${labelId}"`);
    expect(markup).toContain("<textarea>");
    expect(buttons.map((tag) => tag.includes("autofocus"))).toEqual([false, true]);
  });

  it("shows the refusal inside the panel and hides cancel while busy", () => {
    expect(html({ error: "No." })).toContain('role="alert"');

    const busy = html({ busy: true });
    expect(busy).toContain("hiding…");
    expect(busy).not.toContain("cancel, leave it");
  });
});
