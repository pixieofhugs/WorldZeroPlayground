/**
 * #1376 — the CSV import panel lists every rejected row, not just the first.
 *
 * `extractError` only ever surfaces `detail[0].msg`, so the panel needs the full
 * array. This guards the narrowing: a row-level 422 yields every row, and any
 * other failure shape yields `[]` so the panel falls back to a headline message
 * instead of rendering an empty error box.
 *
 * SEAM (#1400). The narrowing reads the *transport's* rejection, and the
 * transport changed underneath it: `importTasksCsv` now goes through
 * `client.ts`, which throws an `ApiError` carrying the parsed body on `.data`
 * where axios carried it on `.response.data`. Nothing about that is visible to
 * the type checker — `taskImportRowErrors` takes `unknown` — so a reader still
 * looking for the axios shape compiles, ships, and quietly returns `[]` for
 * every row-level 422. The panel would then show one headline where it used to
 * show the whole bad file.
 */
import { describe, it, expect } from "vitest";
import { ApiError } from "../apiError";
import { taskImportRowErrors } from "../admin";

/** A row-level 422 exactly as `client.ts` throws it. */
const rowRejection = (detail: unknown) =>
  new ApiError(new Response(null, { status: 422 }), { detail });

describe("taskImportRowErrors", () => {
  it("returns every rejected row in order", () => {
    const err = rowRejection([
      { row: 2, msg: 'Row 2 ("Zero Points"): point_value: Input should be greater than 0' },
      { row: 5, msg: "Row 5: Name is required." },
    ]);

    expect(taskImportRowErrors(err)).toEqual([
      { row: 2, msg: 'Row 2 ("Zero Points"): point_value: Input should be greater than 0' },
      { row: 5, msg: "Row 5: Name is required." },
    ]);
  });

  it("ignores a plain-string detail — that is a headline, not a row list", () => {
    expect(taskImportRowErrors(rowRejection("Admin access required."))).toEqual([]);
  });

  it("drops malformed entries rather than rendering undefined rows", () => {
    const err = rowRejection([{ row: 2, msg: "Row 2: bad." }, { nope: true }, "text"]);
    expect(taskImportRowErrors(err)).toEqual([{ row: 2, msg: "Row 2: bad." }]);
  });

  it("returns [] for a 502 whose body was never JSON at all", () => {
    // `ApiError.data` is undefined when the body did not parse — a proxy's HTML
    // page. The panel must fall through to `extractError`, not to an empty box.
    expect(taskImportRowErrors(new ApiError(new Response(null, { status: 502 }), undefined))).toEqual(
      [],
    );
  });

  it("returns [] for a network failure with no response at all", () => {
    expect(taskImportRowErrors(new Error("Network Error"))).toEqual([]);
    expect(taskImportRowErrors(undefined)).toEqual([]);
  });
});
