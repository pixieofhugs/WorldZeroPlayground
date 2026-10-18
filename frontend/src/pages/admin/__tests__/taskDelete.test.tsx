/**
 * Admin task delete (#3062), at the Tasks tab.
 *
 * Three seams, one per class of invariant (SPEC-testing, "The three classes"):
 *
 * - **the wire** — `requestTaskDelete` through the real `api/admin` client and
 *   the real `errors.json` catalog, against a stubbed `fetch`. This is where
 *   "a 409 shows the retire-instead message" is a fact rather than a hope.
 * - **a value** — `markTaskRowDeleted`, the row leaving the list.
 * - **structure** — `TaskDeleteConfirm`'s markup: what the admin reads before
 *   anything is deleted.
 *
 * What this cannot see: the tab's own click wiring (delete opens the confirm;
 * only the confirm's button sends the request). The harness has no DOM and
 * runs no effects, so `TasksTab` never leaves its loading state here.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";

/** `vi.hoisted`, not `beforeEach` — `openapi-fetch` binds `fetch` when the
 *  client module loads. `FlagControl.test.tsx` carries the long version. */
const wire = vi.hoisted(() => {
  const sent: Request[] = [];
  const reply: { status: number; body: string | null } = {
    status: 204,
    body: null,
  };
  globalThis.fetch = (async (input: Request) => {
    sent.push(input);
    return new Response(reply.body, {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;
  return { sent, reply };
});

afterEach(() => {
  wire.sent.length = 0;
  wire.reply.status = 204;
  wire.reply.body = null;
});

import { requestTaskDelete, markTaskRowDeleted } from "../taskDelete";
import TaskDeleteConfirm from "../TaskDeleteConfirm";
import type { AdminTaskRow } from "../adminTaskRows";

const FALLBACK = "caller's fallback";

describe("requestTaskDelete — the wire", () => {
  it("sends DELETE to the admin task route and reports no error on 204", async () => {
    expect(await requestTaskDelete(7, FALLBACK)).toBeNull();

    expect(wire.sent).toHaveLength(1);
    expect(wire.sent[0].method).toBe("DELETE");
    expect(new URL(wire.sent[0].url).pathname).toBe("/admin/tasks/7");
  });

  it("answers a task with history in the catalog's retire-instead wording", async () => {
    wire.reply.status = 409;
    wire.reply.body = JSON.stringify({
      detail: { code: "TASK_HAS_HISTORY", message: "backend prose" },
    });

    const message = await requestTaskDelete(7, FALLBACK);

    expect(message).toBe(i18n.t("errors:codes.TASK_HAS_HISTORY"));
    expect(message).toMatch(/retire it instead/i);
  });

  it("answers a seed-owned task in its own wording, not retire-instead", async () => {
    wire.reply.status = 409;
    wire.reply.body = JSON.stringify({
      detail: { code: "TASK_SEED_OWNED", message: "backend prose" },
    });

    const message = await requestTaskDelete(7, FALLBACK);

    expect(message).toBe(i18n.t("errors:codes.TASK_SEED_OWNED"));
    expect(message).not.toMatch(/retire/i);
  });

  it("treats a task the server no longer has as deleted, not refused", async () => {
    wire.reply.status = 404;
    wire.reply.body = JSON.stringify({
      detail: { code: "TASK_NOT_FOUND", message: "Task not found." },
    });

    expect(await requestTaskDelete(7, FALLBACK)).toBeNull();
  });

  it("falls back to the caller's wording for a refusal with no detail", async () => {
    wire.reply.status = 400;
    wire.reply.body = "{}";

    expect(await requestTaskDelete(7, FALLBACK)).toBe(FALLBACK);
  });
});

describe("markTaskRowDeleted", () => {
  it("flags the deleted row and leaves the others alone", () => {
    const rows = [
      { id: 1, status: "active" },
      { id: 2, status: "active" },
    ] as AdminTaskRow[];

    expect(markTaskRowDeleted(rows, 2).map((row) => row.status)).toEqual([
      "active",
      "deleted",
    ]);
  });
});

describe("TaskDeleteConfirm — what the admin reads first", () => {
  const html = (props: { deleting?: boolean; error?: string | null }) =>
    renderToStaticMarkup(
      <TaskDeleteConfirm
        title="Typo Task"
        deleting={props.deleting ?? false}
        error={props.error ?? null}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    ).replace(/&#x27;|&#39;/g, "'");

  it("names the task, says it can be undone, and offers confirm and cancel", () => {
    const markup = html({});

    expect(markup).toContain("Typo Task");
    expect(markup).toContain(i18n.t("admin:tasks.deleteConfirm.undo"));
    expect(markup).toContain(i18n.t("admin:tasks.deleteConfirm.submit"));
    expect(markup).toContain(i18n.t("admin:tasks.deleteConfirm.cancel"));
  });

  it("opens as a labelled alertdialog with focus on cancel, never on delete", () => {
    const markup = html({});
    const buttons = markup.match(/<button[^>]*>/g) ?? [];
    const labelId = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain(`id="${labelId}"`);
    expect(buttons).toHaveLength(2);
    expect(buttons.every((tag) => tag.includes('type="button"'))).toBe(true);
    // Submit is first in the markup; only cancel asks for focus.
    expect(buttons.map((tag) => tag.includes("autofocus"))).toEqual([false, true]);
  });

  it("shows a refusal inside the panel, announced as an alert", () => {
    const markup = html({ error: "Retire it instead." });

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Retire it instead.");
  });

  it("hides cancel while the request is out", () => {
    const markup = html({ deleting: true });

    expect(markup).toContain(i18n.t("admin:tasks.deleteConfirm.working"));
    expect(markup).not.toContain(i18n.t("admin:tasks.deleteConfirm.cancel"));
  });
});
