/**
 * #1400 — the one non-JSON request in `api/admin.ts`. A stringified FormData
 * reaches the server as `{}` with CI green, so assert the body IS the FormData
 * and the Content-Type carries a platform-written boundary.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { importTasksCsv } from "../admin";

/** Hoisted fetch stub: see `client.test.ts`. */
const wire = vi.hoisted(() => {
  const sent: Request[] = [];
  globalThis.fetch = (async (input: Request) => {
    sent.push(input);
    return new Response('{"created_count":1,"created_titles":["Sweep"],"warnings":[]}', {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;
  return sent;
});

beforeEach(() => {
  wire.length = 0;
});

const csv = () => new File(["title,point_value\nSweep,3\n"], "tasks.csv", { type: "text/csv" });

describe("importTasksCsv", () => {
  it("posts to the import route", async () => {
    await importTasksCsv(csv());

    expect(wire[0].method).toBe("POST");
    expect(new URL(wire[0].url).pathname).toBe("/admin/tasks/import-csv");
  });

  it("sends the file as multipart, not as a JSON-stringified FormData", async () => {
    await importTasksCsv(csv());

    const contentType = wire[0].headers.get("content-type") ?? "";
    expect(contentType).toMatch(/^multipart\/form-data; boundary=.+/);

    const form = await wire[0].formData();
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("tasks.csv");
    expect(await (file as File).text()).toBe("title,point_value\nSweep,3\n");
  });

  it("returns the parsed import readout", async () => {
    expect(await importTasksCsv(csv())).toEqual({
      created_count: 1,
      created_titles: ["Sweep"],
      warnings: [],
    });
  });
});
