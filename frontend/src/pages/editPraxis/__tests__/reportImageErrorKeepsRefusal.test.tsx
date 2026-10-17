// @vitest-environment jsdom
/**
 * #3172 / #3245: an edit-stage failure lands on the tray's one error line AFTER
 * whatever a rejected pick refused, rather than replacing it. Needs a second
 * render (state written, then read back), so it is driven with `renderHook`.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useComposerMedia, MAX_FILE_SIZE } from "../useComposerMedia";

describe("useComposerMedia.reportImageError", () => {
  it("keeps the refusal and appends the edit failure", async () => {
    const { result } = renderHook(() => useComposerMedia("3"));

    // Refused by size, so `fileError` holds a sentence before the edit fails.
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
