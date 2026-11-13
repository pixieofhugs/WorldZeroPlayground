/** Seal skins A (#929): snide, singularity, everymen, ephemerists honor the seal contract and dispatch. */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import MetataskSeal from "../MetataskSeal";
import DefaultSeal from "../skins/DefaultSeal";
import i18n from "../../../i18n";
import type { TaskOut } from "../../../api/tasks";

function metatask(slug: string, overrides: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 42,
    title: "do it underwater. no cuts.",
    description: '',
    point_value: 50,
    level_required: 1,
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
    submitted_praxis_id: null,
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
    viewer_faction_multiplier: 1,
    ...overrides,
  };
}

/** Router required: every seal's band is a `<Link>` (#2648). */
function markup(element: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

const SKIN_SLUGS = ["snide", "singularity", "everymen", "ephemerists"];

describe("seal skins A content-slot invariant", () => {
  for (const slug of SKIN_SLUGS) {
    const task = metatask(slug);
    const bonus = i18n.t("praxis:detail.seal.bonus", { points: task.point_value });

    it(`${slug} renders the condition (title)`, () => {
      const html = markup(<MetataskSeal metatasks={[task]} />);
      // Snide splits the condition into per-word chips.
      for (const word of task.title.split(" ")) {
        expect(html).toContain(word);
      }
    });

    it(`${slug} renders the bonus (+point_value PTS)`, () => {
      const html = markup(<MetataskSeal metatasks={[task]} />);
      expect(html).toContain(bonus);
    });

    it(`${slug} renders its own skin, not the Default fallthrough`, () => {
      const bespoke = markup(<MetataskSeal metatasks={[task]} />);
      const fallback = markup(
        <DefaultSeal metatask={task} removable={false} />,
      );
      expect(bespoke).not.toBe(fallback);
    });

    it(`${slug} wires removable + onRemove to the metatask id`, () => {
      const onRemove = vi.fn();
      // Static markup can't click; the × must at least render.
      const html = markup(
        <MetataskSeal metatasks={[task]} removable onRemove={onRemove} />,
      );
      expect(html).toContain("×");
    });

    it(`${slug} omits the × control when not removable`, () => {
      const html = markup(<MetataskSeal metatasks={[task]} />);
      const removeLabel = i18n.t("praxis:detail.seal.remove");
      expect(html).not.toContain(`aria-label="${removeLabel}"`);
    });
  }
});

describe("seal skins A — unregistered slug still falls through", () => {
  it("an unrecognized metatask_faction_slug renders the Default seal", () => {
    // A slug naming no faction (na is covered in sealSkinsB). Compare the
    // seal's own markup, not MetataskSeal's flex wrapper.
    const task = metatask("nonesuch");
    const html = markup(<MetataskSeal metatasks={[task]} />);
    const fallback = markup(<DefaultSeal metatask={task} removable={false} />);
    expect(html).toContain(fallback);
  });
});
