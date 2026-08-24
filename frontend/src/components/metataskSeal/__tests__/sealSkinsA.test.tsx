/**
 * Seal skins A (#929) — snide, singularity, everymen, ephemerists.
 *
 * Each skin must honor the shared seal contract (condition = title, bonus =
 * point_value) in its own bespoke costume, dispatch off `metatask_faction_slug`
 * instead of falling through to Default, and wire `removable`/`onRemove`
 * exactly like every other skin.
 */
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
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
    ...overrides,
  };
}

/**
 * Every seal mounts `CardMasthead` since #2562 and that band is a `<Link>`, so a
 * seal rendered outside a router throws. Every mount in the app is already
 * inside one; this is the harness catching up with the anatomy.
 */
function markup(element: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

const SKIN_SLUGS = ["snide", "singularity", "everymen", "ephemerists"];

describe("seal skins A content-slot invariant", () => {
  for (const slug of SKIN_SLUGS) {
    const task = metatask(slug);
    const figure = i18n.t("praxis:detail.seal.bonusFigure", { points: task.point_value });
    const unit = i18n.t("praxis:card.stamp.points", { count: task.point_value });

    it(`${slug} renders the condition (title)`, () => {
      const html = markup(<MetataskSeal metatasks={[task]} />);
      // Snide clips the condition into per-word "ransom" chips, so each word
      // lands in its own element rather than one contiguous text node.
      for (const word of task.title.split(" ")) {
        expect(html).toContain(word);
      }
    });

    it(`${slug} renders the bonus as a figure over its caption`, () => {
      // Two nodes since #2562 — the score stamp's anatomy, which is what split
      // `detail.seal.bonus` into a figure key and the shared points caption.
      const html = markup(<MetataskSeal metatasks={[task]} />);
      expect(html).toContain(figure);
      expect(html).toContain(unit);
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
      // Static markup can't fire click handlers, but it must render the ×
      // control when removable so there's something to click.
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
    // Every real faction is skinned now (wow was the last, #931), so this uses a
    // slug that names no faction at all to pin the Default fallthrough for any
    // unrecognized issuer. na — a real but deliberately-unskinned faction — is
    // covered in sealSkinsB.
    const task = metatask("nonesuch");
    // MetataskSeal wraps its stack in a flex container, so compare the
    // dispatched seal's own markup, not the wrapper around it.
    const html = markup(<MetataskSeal metatasks={[task]} />);
    const fallback = markup(<DefaultSeal metatask={task} removable={false} />);
    expect(html).toContain(fallback);
  });
});
