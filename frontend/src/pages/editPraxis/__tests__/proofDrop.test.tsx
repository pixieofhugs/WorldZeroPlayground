/**
 * #3077 — the Proof control says "Drop a photo of the work" and now takes one.
 *
 * THE SEAM: `proofDropHandlers`, the pair of handlers `FilePicker` spreads on
 * its wrapper, driven into the real `useComposerMedia().handleFileChange`. All
 * eight faction composers mount that one control over that one hook, so this
 * covers them without eight fixtures. A drop and a browsed pick both arrive at
 * `handleFileChange(files)` — there is no second implementation to drift, and
 * the tests below fail if one is ever written.
 *
 * vitest runs in `node` here (no jsdom), so the events are plain objects with
 * the fields the handlers read. What that cannot cover: that the browser
 * really fires them, and that the window listeners are attached — an effect
 * never runs under `renderToStaticMarkup`. Both are live-QA items.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { DragEvent as ReactDragEvent } from "react";
import i18n from "../../../i18n";
import {
  useComposerMedia,
  refuseStrayFileDrop,
  MAX_FILE_SIZE,
} from "../useComposerMedia";
import { proofDropHandlers } from "../archetypes/controls";

vi.mock("../mediaBatchUpload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../mediaBatchUpload")>()),
  uploadMediaInChunks: vi.fn(),
}));
import { uploadMediaInChunks } from "../mediaBatchUpload";
const uploadMock = vi.mocked(uploadMediaInChunks);

function tray(idParam: string) {
  let captured: ReturnType<typeof useComposerMedia> | undefined;
  function Probe() {
    captured = useComposerMedia(idParam);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!captured) throw new Error("the probe never rendered");
  return captured;
}

const aFile = (over: Partial<File> = {}) =>
  ({ name: "clip.mp4", size: 1_000, type: "video/mp4", ...over }) as File;

/** A drag as the browser reports it: `types` says what it carries. */
function aDrag(types: string[], files: File[] = []) {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    dataTransfer: { types, files, dropEffect: "move" },
  };
}
const asReact = (drag: ReturnType<typeof aDrag>) =>
  drag as unknown as ReactDragEvent;
const asNative = (drag: ReturnType<typeof aDrag>) =>
  drag as unknown as DragEvent;

beforeEach(() => {
  vi.restoreAllMocks();
  uploadMock.mockReset();
  uploadMock.mockResolvedValue({ uploaded: [], errors: [] });
});

describe("a file dropped on the Proof control", () => {
  it("is offered as a drop target, or the browser never fires the drop", () => {
    const drag = aDrag(["Files"]);
    proofDropHandlers(() => {}).onDragOver(asReact(drag));
    expect(drag.defaultPrevented).toBe(true);
    expect(drag.dataTransfer.dropEffect).toBe("copy");
  });

  it("takes the path a browsed file takes, all of them at once", async () => {
    const files = [aFile(), aFile({ name: "song.mp3", type: "audio/mpeg" })];
    const drop = aDrag(["Files"], files);

    proofDropHandlers(tray("3").handleFileChange).onDrop(asReact(drop));
    await Promise.resolve();

    expect(drop.defaultPrevented).toBe(true);
    expect(uploadMock).toHaveBeenCalledWith(3, files);
  });

  it("is refused with the line a browsed oversized file gets", () => {
    const translate = vi.spyOn(i18n, "t");
    const drop = aDrag(["Files"], [aFile({ size: MAX_FILE_SIZE + 1 })]);

    proofDropHandlers(tray("3").handleFileChange).onDrop(asReact(drop));

    expect(translate).toHaveBeenCalledWith(
      "forms:editPraxis.errors.fileTooLarge",
      { count: 1, names: "clip.mp4" },
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("leaves a dragged text selection alone", () => {
    const onFiles = vi.fn();
    const drag = aDrag(["text/plain"]);
    const handlers = proofDropHandlers(onFiles);

    handlers.onDragOver(asReact(drag));
    handlers.onDrop(asReact(drag));

    expect(drag.defaultPrevented).toBe(false);
    expect(onFiles).not.toHaveBeenCalled();
  });
});

describe("a file dropped anywhere else on the composer", () => {
  it("does not navigate the browser away from the draft", () => {
    const drop = aDrag(["Files"]);
    refuseStrayFileDrop(asNative(drop));
    expect(drop.defaultPrevented).toBe(true);
  });

  it("leaves text dragged inside the body editor to the browser", () => {
    const drag = aDrag(["text/plain", "text/html"]);
    refuseStrayFileDrop(asNative(drag));
    expect(drag.defaultPrevented).toBe(false);
  });
});
