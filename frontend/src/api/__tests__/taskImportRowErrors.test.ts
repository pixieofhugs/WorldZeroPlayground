/**
 * #1376 — the CSV import panel lists every rejected row, not just the first.
 *
 * `extractError` only ever surfaces `detail[0].msg`, so the panel needs the full
 * array. This guards the narrowing: a row-level 422 yields every row, and any
 * other failure shape yields `[]` so the panel falls back to a headline message
 * instead of rendering an empty error box.
 */
import { describe, it, expect } from "vitest";
import { taskImportRowErrors } from "../admin";

const rowRejection = (detail: unknown) => ({ response: { data: { detail } } });

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

  it("returns [] for a network failure with no response at all", () => {
    expect(taskImportRowErrors(new Error("Network Error"))).toEqual([]);
    expect(taskImportRowErrors(undefined)).toEqual([]);
  });
});
