/**
 * #1545 — a praxis image the edit stage can't process says so. Without
 * `onError` at the mount, `applyImageEdit` silently uploads the unprocessed
 * file; `not-ready` and `render-failed` are ordinary here (only size is
 * validated). GIF short-circuit and "use original" live in
 * `imageEditHelpers.test.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import type { EditPraxisState } from "../useEditPraxis";
import { anEditPraxisState } from "../../../test/fixtures";
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
vi.mock("../archetypes/DefaultEditPraxis", () => ({ default: () => null }));
vi.mock("../../../components/imageEdit/ImageEditModal", () => ({
  default: (props: ImageEditModalProps) => {
    modal.mounts.push(props);
    return null;
  },
}));

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
    // The separator is localisable; a hardcoded one would pass `toContain`.
    expect(imageEditFailureMessage(FILE_NAME, REASON)).toBe(
      i18n.t("forms:editPraxis.errors.imageEditFailed", {
        name: FILE_NAME,
        reason: REASON,
      }),
    );
  });

  it("falls back to the bare reason when no file is pending", () => {
    expect(imageEditFailureMessage(undefined, REASON)).toBe(REASON);
  });
});

describe("the failure lands on a line the player can see", () => {
  it("draws fileError in the picker every archetype mounts", () => {
    // All nine skins reach the tray through this one control.
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

function stateWithPendingImage(
  reportImageError: (reason: string) => void,
): EditPraxisState {
  return anEditPraxisState({
    pendingImage: new File(["x"], FILE_NAME, { type: "image/heic" }),
    reportImageError,
  });
}

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
    // `onError` is optional, so omitting it typechecks.
    const reported: string[] = [];
    const props = mountModal((reason) => reported.push(reason));

    expect(props.onError).toBeTypeOf("function");
    props.onError?.(REASON);
    expect(reported).toEqual([REASON]);
  });

  it("still lets the player abandon the pick and crop the next one", () => {
    // The modal calls both; the queue only advances on cancel.
    const props = mountModal(() => {});
    expect(props.onCancel).toBeTypeOf("function");
    expect(props.onConfirm).toBeTypeOf("function");
  });
});
