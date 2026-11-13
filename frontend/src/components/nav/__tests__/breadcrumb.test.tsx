/**
 * The site's one breadcrumb (#2102). Two seams: the trail contract (real links
 * except the current page, one chevron, a named `<nav>`, `aria-current`), and
 * `shrinkIndex` as a pure function, since there's no DOM to measure here.
 * No form-factor tests: the component has no breakpoint.
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
    const trail = crumbs("Tasks", "Race your shadow down the estuary path", "Praxis");
    expect(shrinkIndex(trail)).toBe(1);
  });

  it("picks the LONGEST middle crumb, so a short one never reads as `Prax…`", () => {
    const trail = crumbs("Tasks", "Race your shadow", "Praxis", "Edit");
    expect(shrinkIndex(trail)).toBe(1);
    expect(shrinkIndex(crumbs("Tasks", "Go", "A much longer stop", "Edit"))).toBe(2);
  });

  it("never gives way at the last crumb while a middle exists, even a longer one", () => {
    // Where you ARE matters most on a phone, so the last never shrinks while a middle exists.
    expect(shrinkIndex(crumbs("Tasks", "Go", "The longest crumb by far"))).toBe(1);
  });

  it("gives way at the LAST crumb when there is no middle", () => {
    // `Tasks › <title>`: dropping the last would leave no destination.
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

/** #2973 — `Tasks › <current>` with no task id (e.g. Propose a Task), same rules. */
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
