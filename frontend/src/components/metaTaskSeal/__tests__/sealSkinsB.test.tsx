/**
 * Seal skins B (#930) — coven, ua, albescent, and the na/Unaffiliated fallback.
 *
 * Each bespoke skin must honor the shared seal contract (label = issuing
 * faction, condition = title, bonus = point_value) in its own costume, dispatch
 * off `metatask_faction_slug` instead of falling through to Default, and wire
 * `removable`/`onRemove`. `na` is deliberately unskinned (ADR-0039): it renders
 * via the tuned DefaultSeal, which is what the last case asserts.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

import MetaTaskSeal from "../MetaTaskSeal";
import DefaultSeal from "../DefaultSeal";
import i18n from "../../../i18n";
import { factionName } from "../../../utils/factions";
import type { TaskOut } from "../../../api/tasks";

function metatask(slug: string, overrides: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 42,
    title: "read it aloud to a stranger",
    description: null,
    point_value: 45,
    level_required: 1,
    status: "active",
    task_type: "metatask",
    created_by: 1,
    primary_faction_slug: null,
    metatask_faction_slug: slug,
    is_task_vision_eligible: false,
    created_at: "2026-01-01T00:00:00Z",
    can_submit_praxis: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    ...overrides,
  };
}

function markup(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

const SKIN_SLUGS = ["coven", "ua", "albescent"];

describe("seal skins B content-slot invariant", () => {
  for (const slug of SKIN_SLUGS) {
    const task = metatask(slug);
    const bonus = i18n.t("praxis:detail.seal.bonus", { points: task.point_value });
    const label = i18n.t("praxis:detail.seal.label", {
      faction: factionName(slug),
    });

    it(`${slug} renders the condition (title)`, () => {
      const html = markup(<MetaTaskSeal metatasks={[task]} />);
      expect(html).toContain(task.title);
    });

    it(`${slug} renders the bonus (+point_value PTS)`, () => {
      const html = markup(<MetaTaskSeal metatasks={[task]} />);
      expect(html).toContain(bonus);
    });

    it(`${slug} renders the issuing-faction label`, () => {
      const html = markup(<MetaTaskSeal metatasks={[task]} />);
      expect(html).toContain(label);
    });

    it(`${slug} renders its own skin, not the Default fallthrough`, () => {
      const bespoke = markup(<MetaTaskSeal metatasks={[task]} />);
      const fallback = markup(<DefaultSeal metatask={task} removable={false} />);
      expect(bespoke).not.toBe(fallback);
    });

    it(`${slug} wires the × control when removable`, () => {
      const onRemove = vi.fn();
      const html = markup(
        <MetaTaskSeal metatasks={[task]} removable onRemove={onRemove} />,
      );
      expect(html).toContain("×");
    });

    it(`${slug} omits the × control when not removable`, () => {
      const html = markup(<MetaTaskSeal metatasks={[task]} />);
      const removeLabel = i18n.t("praxis:detail.seal.remove");
      expect(html).not.toContain(`aria-label="${removeLabel}"`);
    });
  }
});

describe("seal skins B — na renders via the tuned DefaultSeal", () => {
  it("an unaffiliated (na) metatask renders the Default seal", () => {
    const task = metatask("na");
    // MetaTaskSeal wraps its stack in a flex container, so compare against the
    // dispatched seal's own markup rather than the wrapper around it.
    const html = markup(<MetaTaskSeal metatasks={[task]} />);
    const fallback = markup(<DefaultSeal metatask={task} removable={false} />);
    expect(html).toContain(fallback);
  });

  it("still shows the label, condition and bonus for na", () => {
    const task = metatask("na");
    const html = markup(<MetaTaskSeal metatasks={[task]} />);
    expect(html).toContain(task.title);
    expect(html).toContain(
      i18n.t("praxis:detail.seal.bonus", { points: task.point_value }),
    );
    expect(html).toContain(
      i18n.t("praxis:detail.seal.label", { faction: factionName("na") }),
    );
  });
});
