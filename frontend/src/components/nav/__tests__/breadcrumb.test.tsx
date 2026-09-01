/**
 * The site's one breadcrumb (#2102).
 *
 * TWO SEAMS, and the issue is about both:
 *
 *   1. THE TRAIL CONTRACT — every level is a real link except the current page,
 *      one chevron between them, one `<nav>` landmark with an accessible name,
 *      and `aria-current="page"` on the end. The report's first complaint was
 *      that clicking `Tasks` on a task detail did nothing, so "is it a link" is
 *      the assertion, not "is the word there".
 *   2. THE NARROW CASE — `shrinkIndex` as a PURE FUNCTION over the crumb list.
 *      The harness is `renderToStaticMarkup` with no DOM (SPEC-testing.md), so
 *      there is no box to measure and no `matchMedia` to drive; the decision
 *      about which crumb ellipsises is deliberately made in JS, over the labels,
 *      where it can be tested at all.
 *
 * There is nothing here about form factor because there is nothing there to
 * test: the component has no `useFormFactor()` call and no breakpoint. That is
 * the point of rule 5 — one control at every width.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Breadcrumb, { shrinkIndex, type Crumb } from "../Breadcrumb";

const draw = (node: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

const crumbs = (...labels: string[]): Crumb[] =>
  labels.map((label, i) => (i === labels.length - 1 ? { label } : { label, to: `/${i}` }));

describe("shrinkIndex — which crumb gives way", () => {
  it("ellipsises the MIDDLE crumb and keeps the first and the last", () => {
    // The praxis trail on a 375px phone: `Ephemerists`-length words plus a long
    // title do not fit, and the title is what costs the width.
    const trail = crumbs("Tasks", "Race your shadow down the estuary path", "Praxis");
    expect(shrinkIndex(trail)).toBe(1);
  });

  it("picks the LONGEST middle crumb, so a short one never reads as `Prax…`", () => {
    // The composer's four-step trail: Tasks / <title> / Praxis / Edit.
    const trail = crumbs("Tasks", "Race your shadow", "Praxis", "Edit");
    expect(shrinkIndex(trail)).toBe(1);
    expect(shrinkIndex(crumbs("Tasks", "Go", "A much longer stop", "Edit"))).toBe(2);
  });

  it("never gives way at the last crumb while a middle exists, even a longer one", () => {
    // "Keep the first and the last" is a rule, not a tie-break: where you ARE
    // is the crumb a phone reader needs most, so a long last crumb still does
    // not shrink while there is anything between it and the root.
    expect(shrinkIndex(crumbs("Tasks", "Go", "The longest crumb by far"))).toBe(1);
  });

  it("gives way at the LAST crumb when there is no middle", () => {
    // A task detail is `Tasks › <task title>`. Nothing sits between them, and
    // dropping the last crumb would leave a trail with no destination — so the
    // title is the only thing that can shrink.
    expect(shrinkIndex(crumbs("Tasks", "A very long task title indeed"))).toBe(1);
  });

  it("shrinks nothing when there is nothing to shrink", () => {
    expect(shrinkIndex(crumbs("Tasks"))).toBe(-1);
    expect(shrinkIndex([])).toBe(-1);
  });
});

describe("the trail", () => {
  it("links every level except the current page, on a task detail", () => {
    const html = draw(<Breadcrumb taskId={7} taskTitle="Race your shadow" />);
    expect(html, "the task bank is a real link").toContain('href="/tasks"');
    expect(html, "the task itself is the page you are on").not.toContain('href="/tasks/7"');
    expect(html, "and it says so").toContain('aria-current="page"');
    expect(html).toContain("Race your shadow");
  });

  it("links the task and the praxis on a praxis detail", () => {
    const html = draw(<Breadcrumb taskId={7} taskTitle="Race your shadow" praxisId={12} />);
    expect(html).toContain('href="/tasks"');
    expect(html, "the task is a level above, so it is a link").toContain('href="/tasks/7"');
    expect(html, "the praxis IS the page").not.toContain('href="/praxis/12"');
  });

  it("runs one step further in the composer, where the praxis becomes a link", () => {
    const html = draw(
      <Breadcrumb taskId={7} taskTitle="Race your shadow" praxisId={12} editing />,
    );
    expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/tasks/7"');
    expect(html, "you can go back to the praxis you are editing").toContain('href="/praxis/12"');
    expect(html).toContain("Edit");
  });

  it("names its landmark and separates with ONE chevron", () => {
    const html = draw(<Breadcrumb taskId={7} taskTitle="Race" praxisId={12} />);
    expect(html, "a landmark with no name is a landmark a screen reader cannot skip to")
      .toMatch(/<nav[^>]+aria-label="[^"]+"/);
    // Two separators for three crumbs, and no other separator glyph anywhere.
    expect(html.match(/›/g), "one chevron between each pair").toHaveLength(2);
    expect(html, "no dots, no slashes — the report's `·` and `/` are gone").not.toMatch(
      /<span[^>]*>\s*[·/]\s*<\/span>/,
    );
    expect(html, "the separator is decoration, not a step").toContain('aria-hidden="true"');
  });

  it("keeps the whole label in the DOM even where it will be clipped", () => {
    const title = "Race your shadow down the estuary path before the tide turns";
    const html = draw(<Breadcrumb taskId={7} taskTitle={title} praxisId={12} />);
    expect(html, "truncation is visual; the accessible name is not cut").toContain(title);
    expect(html).toContain("text-overflow:ellipsis");
  });
});

/**
 * THE TASK-LESS TRAIL (#2973).
 *
 * `Propose a Task` is the one page in this family whose second step is not a
 * task: no task exists yet — proposing it is the point. Seven archetypes each
 * hit that wall independently and each hand-rolled a `<nav>` around it, which is
 * verbatim the drift #2102 deleted. So the component has to be able to say
 * `Tasks › <where you are>` with no id, and it is held to the same three rules
 * as the task trail: the root is a real link, the page you are on is not, and it
 * says so.
 */
describe("a trail with no task", () => {
  it("still leads back to the task bank", () => {
    const html = draw(<Breadcrumb current="Propose a Task" />);
    expect(html, "the way back is the whole reason the crumb is there").toContain(
      'href="/tasks"',
    );
    expect(html).toContain("Propose a Task");
  });

  it("does not link the page you are already on", () => {
    const html = draw(<Breadcrumb current="Propose a Task" />);
    expect(html).toContain('aria-current="page"');
    // Two crumbs, one chevron — and no invented `/tasks/undefined` step.
    expect(html.match(/›/g)).toHaveLength(1);
    expect(html).not.toContain("/tasks/");
  });

  it("is the same chrome as every other trail — one nav, one ink", () => {
    const html = draw(<Breadcrumb current="Propose a Task" />);
    expect(html).toMatch(/<nav[^>]+aria-label="[^"]+"/);
    expect(html, "the site's own tertiary ink, never a --faction-* token").toContain(
      "color:var(--color-text-tertiary)",
    );
    expect(html).not.toContain("--faction-");
  });
});
