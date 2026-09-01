/**
 * A praxis image the edit stage cannot process now says so (#1545).
 *
 * #1527/#1543 stopped `applyImageEdit` turning a processing failure into a
 * silent upload of the unprocessed file — but only where a caller supplied
 * `onError`, which the four character surfaces did and `EditPraxis` did not.
 * The helper's fallback is still there (by design: it is what the optional
 * channel falls back TO), so the only thing keeping praxis media honest is the
 * prop at the mount. That is what this file pins.
 *
 * Why it is reachable at all: `useComposerMedia.handleFileChange` validates
 * SIZE and nothing else, and `partitionByEditability` sends every non-GIF
 * `image/*` pick into the modal. Nothing checks that the browser can decode the
 * image, and "Apply" is enabled from mount — so both `not-ready` (no crop rect
 * was ever reported) and `render-failed` (the canvas gave up) are ordinary
 * outcomes here, not theoretical ones.
 *
 * Deliberately NOT covered, because neither is a failure: the GIF
 * short-circuit (#569) and the explicit "use original" button. Both are pinned
 * as choices in `imageEditHelpers.test.ts`.
 *
 * renderToStaticMarkup, no DOM, matching the rest of this suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import type { EditPraxisState } from "../useEditPraxis";
import { imageEditFailureMessage } from "../useComposerMedia";
import { FilePicker } from "../archetypes/controls";
import type { ImageEditModalProps } from "../../../components/imageEdit/ImageEditModal";

const modal = vi.hoisted(() => ({
  mounts: [] as ImageEditModalProps[],
}));
const editState = vi.hoisted(() => ({
  current: null as EditPraxisState | null,
}));

vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => "desktop",
}));
vi.mock("../useEditPraxis", () => ({
  useEditPraxis: () => editState.current,
}));
// The skin renders null: this file is about the dispatcher's modal wiring.
vi.mock("../archetypes/DefaultEditPraxis", () => ({ default: () => null }));
// A probe, so the props the mount actually passes can be inspected.
vi.mock("../../../components/imageEdit/ImageEditModal", () => ({
  default: (props: ImageEditModalProps) => {
    modal.mounts.push(props);
    return null;
  },
}));

// Imported after the mocks are registered.
import EditPraxis from "../../EditPraxis";

const FILE_NAME = "sunset.heic";
const REASON = i18n.t("common:imageEdit.errorFailed");

describe("imageEditFailureMessage — the tray names the file it lost", () => {
  it("carries both the file and the modal's reason", () => {
    const line = imageEditFailureMessage(FILE_NAME, REASON);
    expect(line).toContain(FILE_NAME);
    expect(line).toContain(REASON);
  });

  it("is the composed catalog line, not a bare concatenation", () => {
    // The separator is localisable copy, so the shape has to come from the
    // catalog — a hardcoded " — " in the hook would pass a `toContain` pair.
    expect(imageEditFailureMessage(FILE_NAME, REASON)).toBe(
      i18n.t("forms:editPraxis.errors.imageEditFailed", {
        name: FILE_NAME,
        reason: REASON,
      }),
    );
  });

  it("falls back to the bare reason when no file is pending", () => {
    // The modal reports before it cancels, so the queue head is normally still
    // the failing file. This is the belt-and-braces branch.
    expect(imageEditFailureMessage(undefined, REASON)).toBe(REASON);
  });
});

describe("the failure lands on a line the player can see", () => {
  it("draws fileError in the picker every archetype mounts", () => {
    // All nine composer skins reach the media tray through this one control, so
    // pinning it here covers them without nine fixtures.
    const line = "sunset.heic — that image could not be processed";
    const markup = renderToStaticMarkup(
      <FilePicker
        fileError={line}
        handleFileChange={() => {}}
        skin={{ buttonStyle: {}, buttonLabel: "Add proof" }}
      />,
    );
    expect(markup).toContain(line);
  });
});

/** Only the fields the dispatcher itself reads; the skin is mocked to null. */
function stateWithPendingImage(
  reportImageError: (reason: string) => void,
): EditPraxisState {
  return {
    loading: false,
    phase: "composing",
    isPublished: false,
    error: "",
    praxis: { id: 55, task_id: 7, task_title: "A Very Human Thing" },
    task: { primary_faction_slug: "na" },
    pendingImage: new File(["x"], FILE_NAME, { type: "image/heic" }),
    confirmImageEdit: async () => {},
    cancelImageEdit: () => {},
    reportImageError,
  } as unknown as EditPraxisState;
}

/** Mount the dispatcher over a pending image and hand back the modal's props. */
function mountModal(
  reportImageError: (reason: string) => void,
): ImageEditModalProps {
  modal.mounts.length = 0;
  editState.current = stateWithPendingImage(reportImageError);
  renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
  const mounted = modal.mounts.at(-1);
  if (!mounted) throw new Error("EditPraxis mounted no ImageEditModal");
  return mounted;
}

describe("EditPraxis hands the modal an error channel (#1545)", () => {
  it("passes onError, so a failure cannot fall back to the silent upload", () => {
    // Omitting the prop is exactly the pre-#1545 defect, and it typechecks:
    // `onError` is optional, and its absence is a behaviour change with no
    // compile-time tell.
    const reported: string[] = [];
    const props = mountModal((reason) => reported.push(reason));

    expect(props.onError).toBeTypeOf("function");
    props.onError?.(REASON);
    expect(reported).toEqual([REASON]);
  });

  it("still lets the player abandon the pick and crop the next one", () => {
    // `onError` is not a replacement for cancel: the modal calls both, and the
    // queue only advances on cancel.
    const props = mountModal(() => {});
    expect(props.onCancel).toBeTypeOf("function");
    expect(props.onConfirm).toBeTypeOf("function");
  });
});
