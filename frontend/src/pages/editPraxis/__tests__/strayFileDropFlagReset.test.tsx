// @vitest-environment jsdom
/**
 * #3245: `dragStartedInPage` is module state. A drag that began and never
 * ended (the page navigated, the tab lost it) would leave it true for the next
 * sheet, which would then call every real file drop "from this page" and let
 * the browser navigate to it. The first sheet mount resets it.
 */
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  isFileDrag,
  noteDragStart,
  useStrayFileDropGuard,
} from "../strayFileDrop";

const FILES = { dataTransfer: { types: ["Files"], items: [] } } as never;

function Sheet() {
  useStrayFileDropGuard();
  return null;
}

describe("useStrayFileDropGuard", () => {
  it("clears a stuck in-page drag when the first sheet mounts", () => {
    noteDragStart();
    expect(isFileDrag(FILES)).toBe(false);

    const sheet = render(<Sheet />);
    expect(isFileDrag(FILES)).toBe(true);

    // A second sheet joining mid-drag must not reset it.
    noteDragStart();
    const second = render(<Sheet />);
    expect(isFileDrag(FILES)).toBe(false);

    second.unmount();
    sheet.unmount();
  });
});
