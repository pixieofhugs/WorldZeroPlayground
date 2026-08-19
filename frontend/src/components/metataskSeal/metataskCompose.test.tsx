/**
 * Metatask compose flow (#933) — the editable seal stack, the neutral Section-D
 * picker, and the Section-E peel-off confirm. renderToStaticMarkup only (no DOM,
 * no effects): we assert on the emitted markup, matching the harness the other
 * editPraxis suites use.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../i18n";
import i18n from "../../i18n";
import type { EditPraxisState } from "../../pages/editPraxis/useEditPraxis";
import type { TaskOut } from "../../api/tasks";
import { MetataskSealStack } from "./MetataskSealStack";
import MetataskPicker from "./MetataskPicker";
import MetataskRemoveConfirm from "./MetataskRemoveConfirm";

function metatask(
  id: number,
  slug: string,
  title: string,
  points: number,
): TaskOut {
  return {
    id,
    title,
    description: `${title} — do the extra thing`,
    point_value: points,
    level_required: 0,
    status: "active",
    task_type: "metatask",
    created_by: 1,
    primary_faction_slug: 'na',
    metatask_faction_slug: slug,
    created_at: "2026-01-01T00:00:00Z",
    in_progress_count: 0,
    created_by_display_name: "",
    created_by_avatar_url: "",
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    can_sign_up: true,
    allowed_modes: ["solo"],
    eligible_for_current_user: true,
    start_here: false,
  };
}

const noop = () => {};
const asyncNoop = async () => {};

function mkState(partial: Partial<EditPraxisState>): EditPraxisState {
  return {
    metatasks: [],
    appliedMetatasks: new Set<number>(),
    appliedMetataskList: [],
    applyingMetatask: null,
    canSealMetatask: false,
    metataskPickerOpen: false,
    metataskRemovalTarget: null,
    addMetatask: asyncNoop,
    toggleMetatask: asyncNoop,
    openMetataskPicker: noop,
    closeMetataskPicker: noop,
    requestRemoveMetatask: noop,
    confirmRemoveMetatask: asyncNoop,
    cancelRemoveMetatask: noop,
    ...partial,
  } as unknown as EditPraxisState;
}

describe("MetataskSealStack", () => {
  const addLabel = i18n.t("detail.seal.add", { ns: "praxis" });
  const removeLabel = i18n.t("detail.seal.remove", { ns: "praxis" });

  it("shows the '+ Add a metatask' slot for an eligible, empty praxis", () => {
    const html = renderToStaticMarkup(
      <MetataskSealStack
        state={mkState({ canSealMetatask: true, appliedMetataskList: [] })}
      />,
    );
    expect(html).toContain(addLabel);
  });

  it("renders applied seals READ-ONLY for an ineligible viewer — no add slot, no ×", () => {
    // `na` falls through to the neutral DefaultSeal, which renders the title as
    // plain text; the faction skins stylise it, so assert on the neutral one.
    const applied = metatask(9, "na", "Cite a source", 50);
    const html = renderToStaticMarkup(
      <MetataskSealStack
        state={mkState({
          canSealMetatask: false,
          appliedMetataskList: [applied],
        })}
      />,
    );
    // The seal itself renders (its title)…
    expect(html).toContain("Cite a source");
    // …but neither the add slot nor the peel control.
    expect(html).not.toContain(addLabel);
    expect(html).not.toContain(removeLabel);
  });

  it("shows the × peel control on applied seals when the viewer can seal", () => {
    const applied = metatask(9, "snide", "Cite a source", 50);
    const html = renderToStaticMarkup(
      <MetataskSealStack
        state={mkState({
          canSealMetatask: true,
          appliedMetataskList: [applied],
        })}
      />,
    );
    expect(html).toContain(removeLabel);
  });
});

describe("MetataskPicker", () => {
  const rows = [
    metatask(1, "snide", "Cite a source", 50),
    metatask(2, "singularity", "Log the signal", 30),
  ];

  it("renders the neutral header, both eligible rows, and the All filter", () => {
    const html = renderToStaticMarkup(
      <MetataskPicker
        state={mkState({ metatasks: rows, metataskPickerOpen: true })}
      />,
    );
    expect(html).toContain(i18n.t("editPraxis.attach.pickerTitle", { ns: "forms" }));
    expect(html).toContain(i18n.t("editPraxis.attach.filterAll", { ns: "forms" }));
    expect(html).toContain("Cite a source");
    expect(html).toContain("Log the signal");
  });

  it("marks an already-sealed row as Sealed", () => {
    const html = renderToStaticMarkup(
      <MetataskPicker
        state={mkState({
          metatasks: rows,
          appliedMetatasks: new Set([1]),
          metataskPickerOpen: true,
        })}
      />,
    );
    expect(html).toContain(i18n.t("editPraxis.attach.alreadyAttached", { ns: "forms" }));
  });
});

describe("MetataskRemoveConfirm", () => {
  it("renders nothing when there is no removal target", () => {
    const html = renderToStaticMarkup(
      <MetataskRemoveConfirm state={mkState({ metataskRemovalTarget: null })} />,
    );
    expect(html).toBe("");
  });

  it("asks to peel off the targeted metatask", () => {
    const target = metatask(7, "coven", "Bless the work", 60);
    const html = renderToStaticMarkup(
      <MetataskRemoveConfirm
        state={mkState({ metataskRemovalTarget: target })}
      />,
    );
    expect(html).toContain(i18n.t("editPraxis.attach.removeTitle", { ns: "forms" }));
    expect(html).toContain(i18n.t("editPraxis.attach.removeConfirm", { ns: "forms" }));
  });
});
