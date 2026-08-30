/**
 * #2878 — the media tray is driven on its own, with no assembler around it.
 *
 * `useComposerMedia` used to borrow `setError` from `useEditPraxis`, so an
 * upload failure was written straight into a state cell owned three files away
 * and the only way to reach it was to stand the whole composer up. The tray now
 * *reports*: the actions that can fail answer with a `MediaOutcome` and the
 * assembler writes the shared error line it owns. Same shape as #2879's
 * `DuelOutcome`.
 *
 * The tray's OWN line stays the tray's: an oversized pick lands in `fileError`
 * and is not reported outward, which is the split this file pins hardest —
 * getting it wrong would print a rejected file on the composer's error line.
 *
 * HOW A HOOK IS DRIVEN HERE
 * -------------------------
 * vitest runs in the `node` environment (see `vite.config.ts`) — no jsdom, and
 * so no `renderHook`. A probe component rendered with `renderToStaticMarkup`
 * gets us the hook's return value, and the callbacks on it are ordinary
 * closures we can await afterwards. What that cannot cover is anything that
 * needs a SECOND render to observe: the tiles landing in `media`, and the image
 * edit queue that `confirmImageEdit` walks. Those are unchanged by this
 * refactor and stay covered by live QA.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useComposerMedia, MAX_FILE_SIZE } from "../useComposerMedia";
import type { MediaItemOut } from "../../../api/praxis";

/* Both mocks spread the real module first: a wholesale factory would blank the
 * siblings for anything else this file ever mounts. */
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

/** Mount `useComposerMedia` and nothing else, and hand back what it returns. */
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

/**
 * A pick, as the input hands one over. Only `name`, `size` and `type` are read
 * on the way to the uploader, and a real 50 MB `File` would cost 50 MB.
 */
const aPick = (over: Partial<File> = {}) =>
  ({ name: "clip.mp4", size: 1_000, type: "video/mp4", ...over }) as File;

/** The change event, with the one field `handleFileChange` writes back. */
function aPickEvent(...files: File[]) {
  return { target: { files, value: "C:\\fakepath\\clip.mp4" } } as unknown as
    React.ChangeEvent<HTMLInputElement>;
}

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
    // The message is the tray's own — it knows which call failed; the assembler
    // only knows there is a line to print.
    expect(outcome.kind === "failed" && outcome.message).toBeTruthy();
  });

  it("does nothing on a route with no praxis id yet", async () => {
    const outcome = await tray(undefined).removeMedia(A_TILE);

    expect(outcome).toEqual({ kind: "unchanged" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("reports the last upload failure, so one error slot still shows one line", async () => {
    uploadMock.mockResolvedValue({ uploaded: [], errors: ["first", "last"] });

    const outcome = await tray("3").handleFileChange(aPickEvent(aPick()));

    expect(outcome).toEqual({ kind: "failed", message: "last" });
  });

  it("keeps an oversized pick on the tray's own line, not the composer's", async () => {
    const outcome = await tray("3").handleFileChange(
      aPickEvent(aPick({ size: MAX_FILE_SIZE + 1 })),
    );

    // `fileError` is the tray's; reporting this outward would print a rejected
    // file on the shared error line as well.
    expect(outcome).toEqual({ kind: "unchanged" });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("has nothing to report when the whole selection uploads", async () => {
    uploadMock.mockResolvedValue({ uploaded: [A_TILE], errors: [] });

    const outcome = await tray("3").handleFileChange(aPickEvent(aPick()));

    expect(uploadMock).toHaveBeenCalledWith(3, [expect.objectContaining({ name: "clip.mp4" })]);
    expect(outcome).toEqual({ kind: "unchanged" });
  });
});
