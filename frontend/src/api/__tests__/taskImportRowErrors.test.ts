/**
 * #1376 — the CSV panel lists every rejected row (`extractError` shows only
 * `detail[0]`); any other failure yields `[]` for the headline fallback. Reads
 * `ApiError.data` (#1400); the `unknown` param means a wrong shape still compiles.
 */
import { describe, it, expect } from "vitest";
import { ApiError } from "../apiError";
import { taskImportRowErrors } from "../admin";

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
    // Body never parsed (proxy HTML): `data` is undefined.
    expect(taskImportRowErrors(new ApiError(new Response(null, { status: 502 }), undefined))).toEqual(
      [],
    );
  });

  it("returns [] for a network failure with no response at all", () => {
    expect(taskImportRowErrors(new Error("Network Error"))).toEqual([]);
    expect(taskImportRowErrors(undefined)).toEqual([]);
  });
});
