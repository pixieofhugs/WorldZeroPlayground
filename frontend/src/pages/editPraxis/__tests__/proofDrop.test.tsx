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
  SRC_DIR,
  readStripped,
  sourceFiles,
  toRelative,
} from "../../../test/sourceScan";
import { useComposerMedia, MAX_FILE_SIZE } from "../useComposerMedia";
import { refuseStrayFileDrop } from "../strayFileDrop";
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

/**
 * A drag as the browser reports it: `types` says what it carries. `folders`
 * names the files that are really directories — the browser lists one in
 * `files` like any other, and only its `items` entry says what it is (#3135).
 */
function aDrag(
  types: string[],
  files: File[] = [],
  { folders = [] as string[], target = null as unknown } = {},
) {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target,
    dataTransfer: {
      types,
      files,
      items: files.map((file) => ({
        kind: "file",
        webkitGetAsEntry: () => ({
          name: file.name,
          isDirectory: folders.includes(file.name),
        }),
      })),
      dropEffect: "move",
    },
  };
}
/** An element inside (or outside) the body editor, as far as `closest` goes. */
const anElement = (insideEditor: boolean) => ({
  closest: (selector: string) =>
    insideEditor && selector === ".cm-editor" ? {} : null,
});
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

  it("does nothing at all when the drag says Files and carries none (#3135)", () => {
    // An image dragged in from another tab. `handleFileChange([])` would clear
    // an error line the player is still reading.
    const onFiles = vi.fn();
    const drop = aDrag(["Files"], []);

    proofDropHandlers(onFiles).onDrop(asReact(drop));

    expect(onFiles).not.toHaveBeenCalled();
    expect(drop.defaultPrevented).toBe(true);
  });

  it("refuses a folder by name and still takes the clip beside it (#3135)", async () => {
    const translate = vi.spyOn(i18n, "t");
    const clip = aFile();
    // Named like a picture on purpose: a directory's `type` is the browser's
    // guess from its name, so only the `items` entry can be trusted.
    const folder = aFile({ name: "holiday.png", type: "image/png" });
    const drop = aDrag(["Files"], [folder, clip], { folders: ["holiday.png"] });

    proofDropHandlers(tray("3").handleFileChange).onDrop(asReact(drop));
    await Promise.resolve();

    expect(translate).toHaveBeenCalledWith("forms:editPraxis.errors.notMedia", {
      count: 1,
      names: "holiday.png",
    });
    expect(uploadMock).toHaveBeenCalledWith(3, [clip]);
  });

  it("refuses a folder dropped alone, and asks the server nothing (#3135)", () => {
    const translate = vi.spyOn(i18n, "t");
    const drop = aDrag(["Files"], [aFile({ name: "trip", type: "" })], {
      folders: ["trip"],
    });

    proofDropHandlers(tray("3").handleFileChange).onDrop(asReact(drop));

    expect(translate).toHaveBeenCalledWith("forms:editPraxis.errors.notMedia", {
      count: 1,
      names: "trip",
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("refuses a PDF by name before any request is made (#3135)", () => {
    const translate = vi.spyOn(i18n, "t");
    const drop = aDrag(
      ["Files"],
      [aFile({ name: "notes.pdf", type: "application/pdf" })],
    );

    proofDropHandlers(tray("3").handleFileChange).onDrop(asReact(drop));

    expect(translate).toHaveBeenCalledWith("forms:editPraxis.errors.notMedia", {
      count: 1,
      names: "notes.pdf",
    });
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
    expect(drag.dataTransfer.dropEffect).toBe("move");
  });

  it("reads as not droppable off the Proof control (#3135)", () => {
    const drag = aDrag(["Files"], [], { target: anElement(false) });
    refuseStrayFileDrop(asNative(drag));
    expect(drag.defaultPrevented).toBe(true);
    expect(drag.dataTransfer.dropEffect).toBe("none");
  });

  it("keeps the cursor the Proof control already set", () => {
    const drag = aDrag(["Files"], [], { target: anElement(false) });
    proofDropHandlers(() => {}).onDragOver(asReact(drag));
    refuseStrayFileDrop(asNative(drag));
    expect(drag.dataTransfer.dropEffect).toBe("copy");
  });

  it("does not switch off the body editor's own dropped-file handling", () => {
    // Over the editor the event is cancelled as before and the effect is left
    // alone: "none" there would stop the drop CodeMirror reads a text file from.
    const drag = aDrag(["Files"], [], { target: anElement(true) });
    refuseStrayFileDrop(asNative(drag));
    expect(drag.defaultPrevented).toBe(true);
    expect(drag.dataTransfer.dropEffect).toBe("move");
  });

  it("finds the editor from a text node inside it, which Firefox can target", () => {
    const drag = aDrag(["Files"], [], {
      target: { parentElement: anElement(true) },
    });
    refuseStrayFileDrop(asNative(drag));
    expect(drag.dataTransfer.dropEffect).toBe("move");
  });
});

describe("a tile already in the tray (#3135)", () => {
  it("cannot be dragged, in any composer — Chrome can read it back as a new file", () => {
    const trays = sourceFiles({
      dir: `${SRC_DIR}/pages/editPraxis/archetypes`,
      match: /EditPraxis\.tsx$/,
    })
      .map((path) => [toRelative(path), readStripped(path)] as const)
      .filter(([, source]) => source.includes('item.type === "image"'));
    expect(trays.length).toBeGreaterThanOrEqual(8);
    for (const [name, source] of trays) {
      expect(source, name).toMatch(
        /item\.type === "image" \? \(\s*<img\s+draggable=\{false\}/,
      );
    }
  });
});
