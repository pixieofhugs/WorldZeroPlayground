// @vitest-environment jsdom
/** #3245: an edit-stage failure is appended after a pick's refusal, not over it. */
import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useComposerMedia, MAX_FILE_SIZE } from "../useComposerMedia";

describe("useComposerMedia.reportImageError", () => {
  it("keeps the refusal and appends the edit failure", async () => {
    const { result } = renderHook(() => useComposerMedia("3"));

    await act(async () => {
      await result.current.handleFileChange([
        { name: "huge.mp4", size: MAX_FILE_SIZE + 1, type: "video/mp4" } as File,
      ]);
    });
    const refusal = result.current.fileError;
    expect(refusal).not.toBe("");

    act(() => result.current.reportImageError("could not decode"));

    expect(result.current.fileError.startsWith(`${refusal} `)).toBe(true);
    expect(result.current.fileError).toContain("could not decode");
  });
});
