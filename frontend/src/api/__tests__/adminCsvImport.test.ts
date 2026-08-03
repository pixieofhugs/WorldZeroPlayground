/**
 * #1400 — the one request in `api/admin.ts` that is not JSON.
 *
 * SEAM: the `Request` that `importTasksCsv` hands to `fetch`. Every other admin
 * call is a JSON body that `client.test.ts` already covers generically; this one
 * is a `FormData`, and `openapi-fetch`'s body serializer is written for JSON.
 * If it ever `JSON.stringify`s a `FormData` the wire carries `{}`, the backend
 * sees no file, and the import fails at runtime with nothing failing in CI —
 * the types say `{ file: string }` either way, because `openapi-typescript`
 * renders `format: binary` as `string`.
 *
 * So this asserts the two things the browser cannot be trusted to infer from a
 * green build: the body IS the FormData, and the Content-Type is the multipart
 * one WITH a boundary — which only happens because nothing set the header by
 * hand.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { importTasksCsv } from "../admin";

/**
 * Hoisted, not `beforeEach`: `openapi-fetch` binds `globalThis.fetch` when the
 * client is CREATED, at `../client`'s top level — i.e. during this file's
 * imports. A later stub is simply never consulted, and the suite then issues
 * real requests to whatever is listening on localhost:8000.
 */
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
