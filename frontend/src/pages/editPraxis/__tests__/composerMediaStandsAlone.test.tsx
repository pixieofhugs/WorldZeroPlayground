/**
 * #2878 — the media tray mounts alone: failing actions answer with a
 * `MediaOutcome` and the assembler writes the shared error line. An oversized
 * pick stays on the tray's own `fileError` and is not reported outward.
 *
 * Probe via `renderToStaticMarkup` (node env); anything needing a second render
 * (tiles in `media`, the image edit queue) is left to live QA.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useComposerMedia, MAX_FILE_SIZE } from "../useComposerMedia";
import type { MediaItemOut } from "../../../api/praxis";

/* Spread the real module so sibling exports stay real. */
vi.mock("../../../api/praxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/praxis")>()),
  deletePraxisMedia: vi.fn(),
}));
vi.mock("../mediaBatchUpload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../mediaBatchUpload")>()),
  uploadMediaInChunks: vi.fn(),
}));

import { deletePraxisMedia } from "../../../api/praxis";
import { uploadMediaInChunks } from "../mediaBatchUpload";

const deleteMock = vi.mocked(deletePraxisMedia);
const uploadMock = vi.mocked(uploadMediaInChunks);

function tray(idParam: string | undefined) {
  let captured: ReturnType<typeof useComposerMedia> | undefined;
  function Probe() {
    captured = useComposerMedia(idParam);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!captured) throw new Error("the probe never rendered");
  return captured;
}

/** Fake `File`: only name/size/type are read, and a real 50 MB one costs 50 MB. */
const aPick = (over: Partial<File> = {}) =>
  ({ name: "clip.mp4", size: 1_000, type: "video/mp4", ...over }) as File;

const A_TILE = { id: 11 } as MediaItemOut;

beforeEach(() => {
  vi.clearAllMocks();
  deleteMock.mockResolvedValue(undefined);
  uploadMock.mockResolvedValue({ uploaded: [], errors: [] });
});

describe("useComposerMedia, without the assembler", () => {
  it("deletes the tile and has nothing to report", async () => {
    const outcome = await tray("3").removeMedia(A_TILE);

    expect(deleteMock).toHaveBeenCalledWith(3, 11);
    expect(outcome).toEqual({ kind: "unchanged" });
  });

  it("reports a failed delete rather than throwing or swallowing it", async () => {
    deleteMock.mockRejectedValue(new Error("nope"));

    const outcome = await tray("3").removeMedia(A_TILE);

    expect(outcome.kind).toBe("failed");
    expect(outcome.kind === "failed" && outcome.message).toBeTruthy();
  });

  it("does nothing on a route with no praxis id yet", async () => {
    const outcome = await tray(undefined).removeMedia(A_TILE);

    expect(outcome).toEqual({ kind: "unchanged" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("reports the last upload failure, so one error slot still shows one line", async () => {
    uploadMock.mockResolvedValue({ uploaded: [], errors: ["first", "last"] });

    const outcome = await tray("3").handleFileChange([aPick()]);

    expect(outcome).toEqual({ kind: "failed", message: "last" });
  });

  it("keeps an oversized pick on the tray's own line, not the composer's", async () => {
    const outcome = await tray("3").handleFileChange([
      aPick({ size: MAX_FILE_SIZE + 1 }),
    ]);

    expect(outcome).toEqual({ kind: "unchanged" });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("has nothing to report when the whole selection uploads", async () => {
    uploadMock.mockResolvedValue({ uploaded: [A_TILE], errors: [] });

    const outcome = await tray("3").handleFileChange([aPick()]);

    expect(uploadMock).toHaveBeenCalledWith(3, [expect.objectContaining({ name: "clip.mp4" })]);
    expect(outcome).toEqual({ kind: "unchanged" });
  });
});
