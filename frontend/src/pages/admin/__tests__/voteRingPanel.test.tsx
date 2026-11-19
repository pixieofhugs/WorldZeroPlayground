/** Seam: VoteRingView markup. Each recipient is a button that walks to its own ring. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { VoteRingView } from "../VoteRingPanel";

const rec = (account_id: number, display_name: string, reciprocal: boolean) => ({
  account_id, display_name, reciprocal, votes: 4, average_stars: 5, share: 0.5,
});

describe("VoteRingView", () => {
  it("lists recipients, each a walk button, and marks reciprocity", () => {
    const html = renderToStaticMarkup(
      <VoteRingView id={1} onWalk={() => {}} ring={{ total_votes: 8, top3_share: 1, recipients: [rec(2, "Ann", true), rec(3, "Bob", false)] }} />,
    );
    expect(html).toContain("Ann");
    expect(html).toContain("Bob");
    expect(html).toContain("view ring: Ann");
    expect(html).toContain("100%");
    expect(html.match(/votes back/g)).toHaveLength(1);
  });

  it("says so when there are no votes", () => {
    const html = renderToStaticMarkup(
      <VoteRingView id={1} onWalk={() => {}} ring={{ total_votes: 0, top3_share: 0, recipients: [] }} />,
    );
    expect(html).toContain("No votes cast this era.");
  });
});
