/**
 * #513 — MarkdownPreview now feeds react-markdown the remark-gfm plugin, so
 * GitHub-flavored markdown (tables, task lists, strikethrough) renders. The
 * repo renders component tests with renderToStaticMarkup: react-markdown runs
 * synchronously under SSR, so the gfm HTML appears in the string.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import MarkdownPreview from "../MarkdownPreview";

function html(source: string): string {
  return renderToStaticMarkup(<MarkdownPreview source={source} />);
}

describe("MarkdownPreview with remark-gfm", () => {
  it("renders a gfm table as a real <table>", () => {
    const out = html(
      "| A | B |\n| --- | --- |\n| 1 | 2 |\n",
    );
    expect(out).toContain("<table>");
    expect(out).toContain("<th>A</th>");
    expect(out).toContain("<td>1</td>");
  });

  it("renders a task list with checkbox inputs", () => {
    const out = html("- [x] done\n- [ ] todo\n");
    expect(out).toContain("<input");
    expect(out).toContain('type="checkbox"');
    expect(out).toContain("checked");
  });

  it("renders ~~strikethrough~~ as <del>", () => {
    const out = html("this is ~~gone~~ now");
    expect(out).toContain("<del>gone</del>");
  });

  it("returns nothing for an empty source", () => {
    expect(html("   ")).toBe("");
  });
});
